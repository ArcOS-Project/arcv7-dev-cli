import { cwd } from "process";
import { Project } from "../project";
import signale from "signale";
import { spinner } from "@clack/prompts";

export default async function UpdateCommand() {
  const project = new Project(cwd());

  await project.readProjectFile();

  if (!(await project.areTypeDefsOutdated())) {
    signale.info("No need! Your type definitions are up to date.");

    return;
  }

  const spin = spinner();

  spin.start("Updating type definitions...");

  await project.updateTypeDefs();

  spin.stop("Updated type definitions!");
}
