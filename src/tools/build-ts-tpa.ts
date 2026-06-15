import fs from "fs";
import path, { resolve } from "path";
import process from "process";
import { spawn, type SpawnOptionsWithoutStdio } from "child_process";
import { once } from "events";
import { program } from "commander";

// this shit is annoying to deal with
const exportRegex =
    /export\b\s*(?:(?:default\s*)?{\s*((?:[^,{}]+,?)+\b)\s*}|(?:default\s*)?([^,;\s]+));?/gm;

const resourceFileRegex = /(?!\w+\.[em]?ts$|\w+\.[em]?js$)(^\w+\.?\w*)/gm;
const scriptFileRegex = /(\w+\.[me]?ts$|\w+\.[me]?js$)/gm;
export const jsFileRegex = /(\w+\.[me]?js$)/gm;
export const tsFileRegex = /(\w+\.[me]?ts$)/gm;

// this should NOT be manually updated
let silentMode = false;
let printDebugMsgs = false;

function printDebug(message?: any, ...optionalParams: any[]) {
    if (printDebugMsgs && !silentMode)
        console.debug(message, ...optionalParams);
}

function conditionalFSRemove(source: fs.PathLike, cwd?: fs.PathLike) {
    if (fs.existsSync(source)) {
        const fileStat = fs.statSync(source);

        if (!silentMode) {
            console.log(
                `Removing './${
                    cwd
                        ? path.relative(cwd.toString(), source.toString())
                        : path.basename(source.toString())
                }'..`,
            );
        }
        fs.rmSync(source, fileStat.isDirectory() ? { recursive: true } : {});
    }
}

function FSCopy(
    source: fs.PathLike,
    destination: fs.PathLike,
    cwd?: fs.PathLike,
) {
    if (fs.existsSync(source)) {
        const sourceFileStat = fs.statSync(source);

        // it's ugly i know 😭
        if (!silentMode) {
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
        }
        fs.cpSync(
            source.toString(),
            destination.toString(),
            sourceFileStat.isDirectory() ? { recursive: true } : {},
        );
    }
}

function FSWriteFile(
    destination: fs.PathLike,
    data: string | NodeJS.ArrayBufferView,
    cwd?: fs.PathLike,
) {
    if (!silentMode) {
        console.log(
            "Writing data to ",
            `'./${
                cwd
                    ? path.relative(cwd.toString(), destination.toString())
                    : path.basename(destination.toString())
            }'..`,
        );
    }

    fs.writeFileSync(destination, data);
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
                printDebug(
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

    printDebug("srcFiles:", srcFiles);
    printDebug("distFiles:", distFiles);

    distFiles.forEach((val) => {
        if (!srcFiles.includes(val)) {
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

    printDebug("srcFiles:", srcFiles);
    printDebug("distFiles:", distFiles);

    srcFiles.forEach((val) => {
        const srcFilePath = path.resolve(srcRoot.toString(), val.toString());
        const distFilePath = path.resolve(distRoot.toString(), val.toString());

        if (!distFiles.includes(val)) {
            FSCopy(srcFilePath, distFilePath, cwd);
        } else {
            const srcFileContents = fs.readFileSync(srcFilePath);
            const distFileContents = fs.readFileSync(distFilePath);

            if (srcFileContents.compare(distFileContents) !== 0) {
                FSWriteFile(distFilePath, srcFileContents, cwd);
            }
        }
    });
}

function replaceExport(contents: string) {
    return contents.replace(exportRegex, (subStr: string, ...args: any[]) => {
        printDebug(`export replace subStr: '${subStr}'\nargs:`, args, "\n");

        const hasCurlyBrackets = subStr.includes("{");

        return `return ${hasCurlyBrackets ? "{ " : ""}${args[0] ?? args[1]}${hasCurlyBrackets ? " }" : ""};`;
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

        printDebug("jsPath:", jsPath);

        try {
            const data = fs.readFileSync(jsPath);

            let contents = data.toString();

            while (exportRegex.test(contents)) {
                contents = replaceExport(contents);

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
        [
            pathToTsc,
            "--rootDir",
            cwd.toString(),
            "--outDir",
            resolve(cwd.toString(), "tmp"),
        ],
        (err) => {
            throw err;
        },
    );

    const distFiles = fs
        .readdirSync(distRoot, {
            recursive: true,
        })
        .filter((val) => {
            return val.toString().match(scriptFileRegex)?.[0];
        });

    const tmpSrcFiles = fs.readdirSync(tmpSrc, {
        recursive: true,
    });

    printDebug("distFiles:", distFiles);
    printDebug("tmpSrcFiles:", tmpSrcFiles);

    tmpSrcFiles.forEach(async (val) => {
        const tmpSrcFilePath = path.resolve(tmpSrc, val.toString());
        const distFilePath = path.resolve(distRoot, val.toString());

        if (!fs.existsSync(distFilePath)) {
            FSCopy(tmpSrcFilePath, distFilePath, cwd);
            conditionalFSRemove(tmpSrcFilePath, cwd);
        } else {
            const tmpSrcFileContents = fs.readFileSync(tmpSrcFilePath);
            const distFileContents = fs.readFileSync(distFilePath);

            let tmpSrcContents = tmpSrcFileContents.toString();
            while (exportRegex.test(tmpSrcContents)) {
                tmpSrcContents = replaceExport(tmpSrcContents);
            }

            if (tmpSrcContents !== distFileContents.toString()) {
                FSCopy(tmpSrcFilePath, distFilePath, cwd);
                conditionalFSRemove(tmpSrcFilePath, cwd);
            }
        }
    });

    conditionalFSRemove(tmpRoot, cwd);

    fixExports(distRoot);
}

export async function buildTSTPA(
    cwd: fs.PathLike,
    silent: boolean = false,
    debugOutput: boolean = false,
) {
    silentMode = silent;
    printDebugMsgs = debugOutput;

    const srcRoot = resolve(cwd.toString(), "src");
    const distRoot = resolve(cwd.toString(), "dist");
    const tmpRoot = resolve(cwd.toString(), "tmp");
    const tmpSrc = resolve(tmpRoot, "src");

    if (!fs.existsSync(distRoot)) {
        fs.mkdirSync(distRoot, {
            recursive: true,
        });
    }
    removeDeletedFiles(srcRoot, distRoot, cwd);

    copyNewFiles(srcRoot, distRoot, cwd);

    await compileAndCopySrc(distRoot, tmpRoot, tmpSrc, cwd);
}

export default buildTSTPA;
