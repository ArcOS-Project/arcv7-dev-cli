import { intro, spinner } from "@clack/prompts";
import { cp, mkdir, rm, writeFile } from "fs/promises";
import { join } from "path";
import { cwd } from "process";
import signale from "signale";
import { zip } from "zip-a-folder";
import { Project } from "../../project";
import buildTSTPA, { containsTypescript } from "../../tools/build-ts-tpa";

export default async function BuildCommand() {
  try {
    const project = new Project(cwd());
    await project.readProjectFile();

    if (!project.metadata) return;

    if (await project.areTypeDefsOutdated()) {
      signale.warn("Type definitions are outdated. Please run `npx v7cli update` to update them.");
    }

    const appId = project.metadata?.metadata.appId;

    if (appId?.includes(".") || appId?.includes("-")) {
      signale.error(
        "Package ID is invalid: it may not contain dashes or periods. Please change it to CamelCase with the format Author_AppId. Be sure to:\n\n- Update any references in your CSS\n- Change the ID accordingly in _app.tpa"
      );
      process.exit(1);
    }

    intro("Build ArcOS Package");
    const spin = spinner();
    spin.start("Building...");

    spin.message("Creating temp directory");
    await mkdir(join(project.path, ".arcdev-build"), { recursive: true });

    // DO THE BUILD HERE
    const containsTS = containsTypescript(project.metadata.payloadDir);

    const payloadDir = containsTS ? join(project.path, "dist") : join(project.path, project.metadata.payloadDir);

    if (containsTS) {
      spin.message("Compiling project");
      await buildTSTPA(project.path, { silent: true });
    }

    spin.message("Copying payload");
    await cp(payloadDir, ".arcdev-build/payload", {
      recursive: true,
    });

    spin.message("Writing _metadata.json");
    await writeFile(
      join(project.path, ".arcdev-build", "_metadata.json"),
      JSON.stringify(project.metadata.metadata, null, 2),
      "utf-8"
    );

    spin.message("Bundling package");
    await zip(join(project.path, ".arcdev-build"), join(project.path, project.metadata.outFile));

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
