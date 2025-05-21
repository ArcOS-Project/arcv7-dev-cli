import { mkdir, readFile, writeFile } from "fs/promises";
import { ProjectMetadata } from "../types/project";
import { join } from "path";
import { PackageMetadata } from "../types/package";
import { Filesystem } from "../server/fs";
import { WebSock } from "../server/websocket";
import { getArcBuild } from "../build";
import axios from "axios";
import signale from "signale";

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
            typeRoots: ["./"], // Look in the root directory for type declarations
            types: ["./arcos.d.ts"], // Explicitly include the types
          },
        },
        null,
        2
      ),
      "utf-8"
    );

    await this.writeTypeDefs();
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
