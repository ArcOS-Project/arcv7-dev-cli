import "colors";
import { cwd } from "process";
import packageJson from "../../../package.json";
import { Project } from "../../project";
import { StartServer } from "../../server/api";

export default async function DevCommand() {
  const project = new Project(cwd());

  await project.readProjectFile();

  await StartServer(project);

  const name = "ArcOS v7 CLI".green.bold;
  const version = `v${packageJson.version}`.gray;
  const arrow = "  > ".gray;
  const port = project.metadata?.devPort || 3128;
  const url = `http://localhost:${port}`;
  const lis = "Listening on:".yellow;
  const run = "Run command:".yellow;
  const command = `devenv connect ${port}`.blue;

  console.log(
    [
      "",
      `  ${name} ${version}`,
      "",
      `${arrow}${lis} ${url}`,
      `${arrow}${run}  ${command} in ArcTerm to connect`,
      "",
      "  READY.".green.bold,
    ].join("\n")
  );
}
