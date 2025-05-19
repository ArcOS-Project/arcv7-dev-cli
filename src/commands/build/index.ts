import { intro, spinner } from "@clack/prompts";
import { Command } from "commander";
import { cp, mkdir, rm, unlink, writeFile } from "fs/promises";
import { join } from "path";
import { cwd } from "process";
import { Project } from "../../project";
import { zip } from "zip-a-folder";

export default async function BuildCommand(command: Command, ...argv: any[]) {
  intro("Build ArcOS Package");
  const spin = spinner();
  spin.start("Building...");
  try {
    const project = new Project(cwd());
    await project.readProjectFile();

    if (!project.metadata) return;

    spin.message("Creating temp directory");
    await mkdir(join(project.path, ".arcdev-build"), { recursive: true });

    spin.message("Copying payload");
    await cp(
      join(project.path, project.metadata.payloadDir),
      ".arcdev-build/payload",
      {
        recursive: true,
      }
    );

    spin.message("Writing _metadata.json");
    await writeFile(
      join(project.path, ".arcdev-build", "_metadata.json"),
      JSON.stringify(project.metadata.metadata, null, 2),
      "utf-8"
    );

    spin.message("Bundling package");
    await zip(
      join(project.path, ".arcdev-build"),
      join(project.path, project.metadata.outFile)
    );

    spin.message("Removing temp directory");
    await rm(join(project.path, ".arcdev-build"), {
      recursive: true,
      force: true,
    });

    spin.stop("Done!");
  } catch (e) {
    console.log(e);
  }
}
