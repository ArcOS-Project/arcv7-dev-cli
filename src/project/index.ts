import axios from "axios";
import { exec } from "child_process";
import { existsSync } from "fs";
import { mkdir, readdir, readFile, writeFile } from "fs/promises";
import { join } from "path";
import signale from "signale";
import { getArcBuild } from "../build";
import { Filesystem } from "../server/fs";
import { WebSock } from "../server/websocket";
import { PackageMetadata } from "../types/package";
import { ProjectMetadata } from "../types/project";

export class Project {
  path: string;
  filesystem: Filesystem | undefined;
  metadata: ProjectMetadata | undefined;
  websock?: WebSock;

  constructor(path: string) {
    this.path = path;
  }

  async initialize(
    metadata: PackageMetadata,
    outFile: string,
    payloadDir: string,
    repository?: string,
    devPort?: number
  ) {
    if (existsSync(this.path) && (await readdir(this.path)).length) {
      signale.error(
        "Cannot initialize project: directory exists and is not empty"
      );
      process.exit(1);
    }

    await mkdir(this.path);
    await this.createProjectFile(
      metadata,
      outFile,
      payloadDir,
      repository,
      devPort
    );
    await mkdir(join(this.path, payloadDir));
    await mkdir(join(this.path, ".vscode"));
    await writeFile(
      join(this.path, ".gitignore"),
      `${this.metadata!.metadata.appId}.arc\n.arcdev-build/`
    );
    await writeFile(
      join(this.path, ".vscode/settings.json"),
      JSON.stringify(
        {
          "files.associations": {
            "*.tpa": "json",
          },
        },
        null,
        2
      )
    );

    await writeFile(
      join(this.path, "tsconfig.json"),
      JSON.stringify(
        {
          compilerOptions: {
            target: "ESNext",
            module: "ESNext",
            moduleResolution: "Node",
            esModuleInterop: true,
            allowJs: true,
            allowSyntheticDefaultImports: true,
            typeRoots: ["./"],
            outDir: "./dist",
            types: ["./arcos.d.ts"],
          },
          include: ["./src/**/*"],
        },
        null,
        2
      ),
      "utf-8"
    );

    await this.writeTypeDefs();

    try {
      await new Promise((r) => exec("git init", { cwd: this.path }, r));
    } catch {
      signale.warn("Failed to initialize Git repository.");
    }
  }

  async createProjectFile(
    metadata: PackageMetadata,
    outFile: string,
    payloadDir: string,
    repository?: string,
    devPort?: number
  ) {
    const meta: ProjectMetadata = {
      metadata,
      outFile,
      payloadDir,
      devPort: devPort || 3128,
      repository,
      buildHash: await getArcBuild(),
      noHotRelaunch: false,
    };

    await writeFile(
      join(this.path, "project.arc.json"),
      JSON.stringify(meta, null, 2),
      "utf-8"
    );
    await this.readProjectFile();
  }

  async writeProjectFile() {
    await writeFile(
      join(this.path, "project.arc.json"),
      JSON.stringify(this.metadata!, null, 2),
      "utf-8"
    );
  }

  async readProjectFile() {
    try {
      const contents = await readFile(
        join(this.path, "project.arc.json"),
        "utf-8"
      );

      this.metadata = JSON.parse(contents);

      if (
        !this.metadata?.metadata ||
        !this.metadata.outFile ||
        !this.metadata.payloadDir
      )
        throw `Your project file is missing the 'metadata', 'outFile' or 'payloadDir' properties.`;

      this.filesystem = new Filesystem(this.path, this.metadata!.payloadDir);
    } catch (e) {
      console.error(`No project.arc.json or parse error: ${e}`);
      process.exit(1);
    }
  }

  async writeTypeDefs() {
    const typeDefs = await this.downloadTypeDefs();

    if (!typeDefs) {
      signale.warn("Failed to download type definitions! Are you online?");

      return;
    }

    await writeFile(join(this.path, "arcos.d.ts"), typeDefs, "utf-8");
  }

  async downloadTypeDefs(): Promise<string | undefined> {
    try {
      const response = await axios.get("https://cdn.arcapi.nl/arcos.d.ts", {
        responseType: "text",
      });

      return response.data;
    } catch {
      return undefined;
    }
  }

  async updateTypeDefs(force?: boolean) {
    const liveHash = await getArcBuild();

    if (this.metadata!.buildHash !== liveHash && !force) {
      this.metadata!.buildHash = liveHash;

      await this.writeTypeDefs();
      await this.writeProjectFile();

      return true;
    } else {
      return false;
    }
  }

  async areTypeDefsOutdated() {
    const liveHash = await getArcBuild();

    return !!(this.metadata!.buildHash !== liveHash);
  }
}
