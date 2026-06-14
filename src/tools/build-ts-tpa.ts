import fs from "fs";
import path, { resolve } from "path";
import process from "process";
import { spawn, type SpawnOptionsWithoutStdio } from "child_process";
import { once } from "events";
import { program } from "commander";

const resourceFileRegex = /(?!\w+\.[em]?ts$|\w+\.[em]?js$)(^\w+\.?\w*)/gm;
const scriptFileRegex = /(\w+\.[me]?ts$|\w+\.[me]?js$)/gm;
export const jsFileRegex = /(\w+\.[me]?js$)/gm;
export const tsFileRegex = /(\w+\.[me]?ts$)/gm;

// this should NOT be manually updated
let printDebug = false;

function debugPrint(message?: any, ...optionalParams: any[]) {
    if (printDebug) console.debug(message, ...optionalParams);
}

function conditionalFSRemove(source: fs.PathLike, cwd: fs.PathLike) {
    if (fs.existsSync(source)) {
        const fileStat = fs.statSync(source);

        console.log(
            `Removing './${
                cwd
                    ? path.relative(cwd.toString(), source.toString())
                    : path.basename(source.toString())
            }'..`,
        );
        fs.rmSync(source, fileStat.isDirectory() ? { recursive: true } : {});
    }
}

function FSCopy(
    source: fs.PathLike,
    destination: fs.PathLike,
    cwd: fs.PathLike,
) {
    if (fs.existsSync(source)) {
        const sourceFileStat = fs.statSync(source);

        // it's ugly i know 😭
        console.log(
            "Copying",
            `'./${
                cwd
                    ? path.relative(cwd.toString(), source.toString())
                    : path.basename(source.toString())
            }'`,
            "->",
            `'./${
                cwd
                    ? path.relative(cwd.toString(), destination.toString())
                    : path.basename(destination.toString())
            }'..`,
        );
        fs.cpSync(
            source.toString(),
            destination.toString(),
            sourceFileStat.isDirectory() ? { recursive: true } : {},
        );
    }
}

async function runCommand(
    command: string,
    args: string[] | undefined,
    onError: (err: Error) => void,
    commandOpts?: SpawnOptionsWithoutStdio,
    afterRun?: () => void,
) {
    const cmd = spawn(command, args, commandOpts);

    cmd.stdout.on("data", (data) => {
        process.stdout.write(data);
    });

    cmd.stderr.on("data", (data) => {
        process.stderr.write(data);
    });

    cmd.on("error", onError);

    afterRun?.();

    const [code] = await once(cmd, "close");

    return code;
}

function removeDeletedFiles(
    srcRoot: fs.PathLike,
    distRoot: fs.PathLike,
    cwd: fs.PathLike,
) {
    const srcFiles = fs
        .readdirSync(srcRoot, {
            recursive: true,
        })
        .map((val) => {
            if (tsFileRegex.test(val.toString())) {
                debugPrint(
                    "converted filename:",
                    path
                        .basename(val.toString(), path.extname(val.toString()))
                        .concat(".js"),
                );
                return path
                    .basename(val.toString(), path.extname(val.toString()))
                    .concat(".js");
            } else return val;
        });

    const distFiles = fs.readdirSync(distRoot, {
        recursive: true,
    });

    debugPrint("srcFiles:", srcFiles);
    debugPrint("distFiles:", distFiles);

    distFiles.forEach((val) => {
        if (!srcFiles.includes(val)) {
            console.log("removeDeletedFiles");
            conditionalFSRemove(
                path.resolve(distRoot.toString(), val.toString()),
                cwd,
            );
        }
    });
}

function copyNewFiles(srcRoot: string, distRoot: string, cwd: fs.PathLike) {
    const srcFiles = fs
        .readdirSync(srcRoot, {
            recursive: true,
        })
        .filter((val) => {
            return val.toString().match(resourceFileRegex)?.[0];
        });

    const distFiles = fs
        .readdirSync(distRoot, {
            recursive: true,
        })
        .filter((val) => {
            return val.toString().match(resourceFileRegex)?.[0];
        });

    debugPrint("srcFiles:", srcFiles);
    debugPrint("distFiles:", distFiles);

    srcFiles.forEach((val) => {
        if (!distFiles.includes(val)) {
            console.log("copyNewFiles");
            FSCopy(
                path.resolve(srcRoot.toString(), val.toString()),
                path.resolve(distRoot.toString(), val.toString()),
                cwd,
            );
        }
    });
}

function fixExports(distRoot: string) {
    const jsFiles = fs.readdirSync(distRoot, {
        recursive: true,
    });
    const sortedJsFiles = jsFiles.filter((val) => {
        return val.toString().match(scriptFileRegex)?.[0];
    });

    sortedJsFiles.forEach((val) => {
        const jsPath = resolve(distRoot, val.toString());

        debugPrint("jsPath:", jsPath);

        try {
            const data = fs.readFileSync(jsPath);

            // this shit is annoying to deal with
            const exportRegex =
                /export\b\s*(?:(?:default\s*)?{\s*((?:[^,{}]+,?)+\b)\s*}|(?:default\s*)?([^,;\s]+));?/gm;

            let contents = data.toString();

            while (exportRegex.test(contents)) {
                contents = contents.replace(
                    exportRegex,
                    (subStr: string, ...args: any[]) => {
                        debugPrint(
                            `export replace subStr: '${subStr}'\nargs:`,
                            args,
                            "\n",
                        );

                        const hasCurlyBrackets = subStr.includes("{");

                        return `return ${hasCurlyBrackets ? "{ " : ""}${args[0] ?? args[1]}${hasCurlyBrackets ? " }" : ""};`;
                    },
                );

                fs.writeFileSync(jsPath, contents);
            }
        } catch (err) {
            throw err;
        }
    });
}

async function compileAndCopySrc(
    distRoot: string,
    tmpRoot: string,
    tmpSrc: string,
    cwd: fs.PathLike,
) {
    const pathToTsc = require.resolve("typescript/bin/tsc");

    await runCommand(
        "node",
        [pathToTsc, "--rootDir", ".", "--outDir", "./tmp"],
        (err) => {
            throw err;
        },
    );

    if (fs.existsSync(tmpSrc)) {
        const tmpSrcFiles = fs.readdirSync(tmpSrc);
        tmpSrcFiles.forEach(async (val) => {
            const tmpSrcPath = resolve(tmpSrc, val);
            const distPath = resolve(distRoot, val);
            FSCopy(tmpSrcPath, distPath, cwd);
            conditionalFSRemove(tmpSrcPath, cwd);
        });
        conditionalFSRemove(tmpRoot, cwd);

        fixExports(distRoot);
    }
}

export async function buildTSTPA(
    cwd: fs.PathLike,
    debugOutput: boolean = false,
) {
    printDebug = debugOutput;

    const srcRoot = resolve(cwd.toString(), "src");
    const distRoot = resolve(cwd.toString(), "dist");
    const tmpRoot = resolve(cwd.toString(), "tmp");
    const tmpSrc = resolve(tmpRoot, "src");

    // clear out files for a fresh output
    removeDeletedFiles(srcRoot, distRoot, cwd);

    copyNewFiles(srcRoot, distRoot, cwd);

    await compileAndCopySrc(distRoot, tmpRoot, tmpSrc, cwd);
}

export default buildTSTPA;
