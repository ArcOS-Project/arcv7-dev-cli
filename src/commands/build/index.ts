import { intro, spinner } from "@clack/prompts";
import { cp, mkdir, rm, writeFile } from "fs/promises";
import { join } from "path";
import { cwd } from "process";
import { zip } from "zip-a-folder";
import { Project } from "../../project";

export default async function BuildCommand() {
  try {
    const project = new Project(cwd());
    await project.readProjectFile();

    if (!project.metadata) return;

    intro("Build ArcOS Package");
    const spin = spinner();
    spin.start("Building...");

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
