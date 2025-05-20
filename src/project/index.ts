import { mkdir, readFile, writeFile } from "fs/promises";
import { ProjectMetadata } from "../types/project";
import { join } from "path";
import { PackageMetadata } from "../types/package";
import { Filesystem } from "../server/fs";
import { WebSock } from "../server/websocket";

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
    };

    await writeFile(
      join(this.path, "project.arc.json"),
      JSON.stringify(meta, null, 2),
      "utf-8"
    );
    await this.readProjectFile();
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
}
