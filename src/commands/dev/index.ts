import { Command } from "commander";
import { cwd } from "process";
import { Project } from "../../project";
import { StartServer } from "../../server/api";

export default async function DevCommand(command: Command, ...argv: any[]) {
  const project = new Project(cwd());

  await project.readProjectFile();

  await StartServer(project);

  console.log("Server live!");
}
