import { Command } from "commander";
import { Project } from "../project";
import { cwd } from "process";
import { TpaWizard } from "../tpa/wizard";

export default async function DevCommand(command: Command, ...argv: any[]) {
  const project = new Project(cwd());

  await project.readProjectFile();

  await TpaWizard(project.metadata!.metadata);
}
