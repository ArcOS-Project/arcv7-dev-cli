import { outro, spinner } from "@clack/prompts";
import axios from "axios";
import { writeFile, mkdir } from "fs/promises";
import { join, parse } from "path";
import { Project } from "../project";
import { ScriptedApp } from "../types/app";
import { unzip } from "unzipit";

export async function scaffoldProject(app: ScriptedApp, project: Project, isTypeScriptProject: boolean) {
  const spin = spinner();
  spin.start("Scaffolding project...");

  const Path = (f: string) => join(project.path, project.metadata!.payloadDir, f);

  await writeFile(Path("_app.tpa"), JSON.stringify(app, null, 2), "utf-8");

  const repoName = "v7cli-templates";
  const branchName = "main";

  const templatesZip = (
    await axios.get(`https://github.com/ArcOS-Project/${repoName}/archive/${branchName}.zip`, { responseType: "arraybuffer" })
  ).data as ArrayBuffer;

  const { entries } = await unzip(templatesZip);

  const zipName = `${repoName}-${branchName}`;
  const projectFileFolderName = isTypeScriptProject ? "typescript" : "javascript";
  const projectFilesFolder = `${zipName}/${projectFileFolderName}`;
  const isFileRegex = /(\w+\.?\w*$)/m;

  await writeFile(join(project.path, "tsconfig.json"), await entries[`${zipName}/tsconfig.json`].text());

  for (const [name, _entry] of Object.entries(entries)) {
    if (name.includes(projectFileFolderName) && isFileRegex.test(name)) {
      const entryPath = parse(name);
      const splitPath = entryPath.dir.split("/");
      const localPath = splitPath.splice(2, splitPath.length).join("/");

      const srcCode = (await entries[name].text()).replace("{{id}}", app.id);

      await mkdir(Path(localPath), {
        recursive: true,
      });
      await writeFile(Path(`${localPath}/${entryPath.base}`), srcCode, "utf-8");
    }
  }

  spin.stop("Project scaffolded.");
  outro();
}
