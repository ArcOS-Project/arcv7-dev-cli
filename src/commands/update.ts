import { spinner } from "@clack/prompts";
import { cwd } from "process";
import signale from "signale";
import { Project } from "../project";

export default async function UpdateCommand() {
  const project = new Project(cwd());

  await project.readProjectFile();

  if (!(await project.areTypeDefsOutdated())) {
    signale.info("No need! Your type definitions are up to date.");

    return;
  }

  const appId = project.metadata?.metadata.appId;
  if (appId?.includes(".") || appId?.includes("-")) {
    signale.error(
      "Package ID is invalid: it may not contain dashes or periods. Please change it to CamelCase with the format Author_AppId. Be sure to:\n\n- Update any references in your CSS\n- Change the ID accordingly in _app.tpa"
    );

    process.exit(1);
  }

  const spin = spinner();

  spin.start("Updating type definitions...");

  await project.updateTypeDefs();

  spin.stop("Updated type definitions!");
}
