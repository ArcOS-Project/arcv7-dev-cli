import fs from "fs";
import path, { resolve } from "path";
import process from "process";
import { spawn, type SpawnOptionsWithoutStdio } from "child_process";
import { once } from "events";

// this shit is annoying to deal with
const exportRegex =
    /export\b\s*(?:(?:default\s*)?{\s*((?:[^,{}]+,?)+\b)\s*}|(?:default\s*)?([^,;\s]+));?/m;

const resourceFileRegex = /(?!\w+\.[em]?ts$|\w+\.[em]?js$)(^\w+\.?\w*)/m;
const scriptFileRegex = /(\w+\.[me]?ts$|\w+\.[me]?js$)/m;
export const jsFileRegex = /(\w+\.[me]?js$)/m;
export const tsFileRegex = /(\w+\.[me]?ts$)/m;

// this should NOT be manually updated
let silentMode = false;
let printDebugMsgs = false;

async function sleep(ms: number) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

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
    printDebug("Checking for deleted files to remove in dist..\n-----");
    const srcFiles = fs
        .readdirSync(srcRoot, {
            recursive: true,
        })
        .map((val) => {
            const srcPath = path.parse(val.toString());

            const tsFileTestResult = tsFileRegex.test(srcPath.base);
            printDebug(`tsFileTest '${srcPath.base}':`, tsFileTestResult);
            if (tsFileTestResult) {
                printDebug("basename:", srcPath.base);
                printDebug("basename (removed ext):", srcPath.name);
                printDebug("converted filename:", srcPath.name.concat(".js"));
                return path.join(srcPath.dir, srcPath.name).concat(".js");
            } else {
                return val;
            }
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
    printDebug("-----\n");
}

function copyNewFiles(srcRoot: string, distRoot: string, cwd: fs.PathLike) {
    printDebug("Checking for files to copy to dist..\n-----");
    const srcFiles = fs
        .readdirSync(srcRoot, {
            recursive: true,
            withFileTypes: true,
        })
        .map((val) => {
            const srcPath = path.parse(
                path.relative(srcRoot, path.join(val.parentPath, val.name)),
            );
            const resFileTestResult = resourceFileRegex.test(srcPath.base);

            if (resFileTestResult && !val.isDirectory()) {
                printDebug(
                    `Value '${path.join(srcPath.dir, srcPath.base)}' is a resource file`,
                );
                return path.join(srcPath.dir, srcPath.base);
            }
        })
        .filter((val) => {
            return val !== undefined;
        });

    const distFiles = fs
        .readdirSync(distRoot, {
            recursive: true,
            withFileTypes: true,
        })
        .map((val) => {
            const srcPath = path.parse(
                path.relative(distRoot, path.join(val.parentPath, val.name)),
            );
            const resFileTestResult = resourceFileRegex.test(srcPath.base);

            if (resFileTestResult && !val.isDirectory()) {
                printDebug(
                    `Value '${path.join(srcPath.dir, srcPath.base)}' is a resource file`,
                );
                return path.join(srcPath.dir, srcPath.base);
            }
        })
        .filter((val) => {
            return val !== undefined;
        });

    printDebug("srcFiles:", srcFiles);
    printDebug("distFiles:", distFiles);

    srcFiles.forEach((val) => {
        const srcFilePath = path.resolve(srcRoot, val.toString());
        const distFilePath = path.resolve(distRoot, val.toString());

        if (!distFiles.includes(val)) {
            printDebug(`'${val}' was missing from dist. Copying over.`);
            FSCopy(srcFilePath, distFilePath, cwd);
        } else {
            printDebug(`'${val}' is present in dist. Updating the file..`);
            const srcFileContents = fs.readFileSync(srcFilePath);
            const distFileContents = fs.readFileSync(distFilePath);

            if (srcFileContents.compare(distFileContents) !== 0) {
                FSWriteFile(distFilePath, srcFileContents, cwd);
            }
        }
    });
    printDebug("-----\n");
}

export function containsTypescript(searchPath: fs.PathLike) {
    printDebug("Checking if folder contains TypeScript files.");
    const fileList = fs.readdirSync(searchPath, { recursive: true });

    for (const val of fileList) {
        const srcPath = path.parse(val.toString());
        const result = tsFileRegex.test(srcPath.base);
        printDebug(`tsFileTest '${srcPath.base}':`, result);
        if (result) {
            printDebug("The given folder does contain TypeScript files.");
            return true;
        }
    }

    printDebug("The given folder does not contain any TypeScript files.");
    return false;
}

function replaceExport(contents: string) {
    return contents.replace(exportRegex, (subStr: string, ...args: any[]) => {
        // printDebug(`export replace subStr: '${subStr}'\nargs:`, args, "\n");

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
    printDebug("Attempting to compile source..\n-----");

    const pathToTsc = require.resolve("typescript/bin/tsc");

    if (!fs.existsSync(resolve(cwd.toString(), "tsconfig.json"))) {
        console.error(
            "The project directory must have a properly configured 'tsconfig.json' file.",
        );
        process.exit(-1);
    }

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
            withFileTypes: true,
        })
        .map((val) => {
            const srcPath = path.parse(
                path.relative(distRoot, path.join(val.parentPath, val.name)),
            );
            const scriptFileTestResult = scriptFileRegex.test(srcPath.base);

            printDebug(
                `scriptFileTest '${path.join(srcPath.dir, srcPath.base)}':`,
                scriptFileTestResult,
            );

            if (scriptFileTestResult && !val.isDirectory()) {
                printDebug(
                    `Value '${path.join(srcPath.dir, srcPath.base)}' is a script file`,
                );
                return path.join(srcPath.dir, srcPath.base);
            }
        })
        .filter((val) => {
            return val !== undefined;
        });
    // .filter((val) => {
    //     return val.toString().match(scriptFileRegex)?.[0];
    // });

    const tmpSrcFiles = fs
        .readdirSync(tmpSrc, {
            recursive: true,
            withFileTypes: true,
        })
        .map((val) => {
            const srcPath = path.parse(
                path.relative(tmpSrc, path.join(val.parentPath, val.name)),
            );
            if (!val.isDirectory()) {
                return path.join(srcPath.dir, srcPath.base);
            }
        })
        .filter((val) => {
            return val !== undefined;
        });

    printDebug("distFiles:", distFiles);
    printDebug("tmpSrcFiles:", tmpSrcFiles);

    for (const val of tmpSrcFiles) {
        const tmpSrcFilePath = path.resolve(tmpSrc, val.toString());
        const distFilePath = path.resolve(distRoot, val.toString());

        // await sleep(1000);
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
    }

    conditionalFSRemove(tmpRoot, cwd);

    fixExports(distRoot);

    printDebug("-----\n");
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

    printDebug();

    removeDeletedFiles(srcRoot, distRoot, cwd);

    copyNewFiles(srcRoot, distRoot, cwd);

    await compileAndCopySrc(distRoot, tmpRoot, tmpSrc, cwd);
}

export default buildTSTPA;
