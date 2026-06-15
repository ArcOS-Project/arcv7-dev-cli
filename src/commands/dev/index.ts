import "colors";
import { cwd } from "process";
import signale from "signale";
import packageJson from "../../../package.json";
import { getArcBuild } from "../../build";
import { Project } from "../../project";
import { StartServer } from "../../server/api";
import buildTSTPA, { containsTypescript } from "../../tools/build-ts-tpa";

export default async function DevCommand() {
  const project = new Project(cwd());

  await project.readProjectFile();

  if (await project.areTypeDefsOutdated()) {
    signale.warn(
      "Type definitions are outdated. Please run `npx v7cli update` to update them.",
    );
  }

  const appId = project.metadata?.metadata.appId;

  if (appId?.includes(".") || appId?.includes("-")) {
    signale.error(
      "Package ID is invalid: it may not contain dashes or periods. Please change it to CamelCase with the format Author_AppId. Be sure to:\n\n- Update any references in your CSS\n- Change the ID accordingly in _app.tpa",
    );

    process.exit(1);
  }

  const buildHash = await getArcBuild();

  if (project.metadata?.buildHash == null) {
    project.metadata!!.buildHash = buildHash;
  }

  const containsTS = containsTypescript(project.metadata!.payloadDir);

  if (containsTS) {
    await buildTSTPA(project.path);
  }

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
    ].join("\n"),
  );
}
