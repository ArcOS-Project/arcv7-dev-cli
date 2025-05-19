import { Command } from "commander";
import { cwd } from "process";
import { Project } from "../project";

export default async function DevCommand(command: Command, ...argv: any[]) {
  const project = new Project(cwd());

  await project.readProjectFile();

  console.log(project.metadata);
}
