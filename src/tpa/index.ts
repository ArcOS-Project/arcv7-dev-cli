import { writeFile } from "fs/promises";
import { Project } from "../project";
import { ScriptedApp } from "../types/app";
import { join } from "path";
import { outro, spinner } from "@clack/prompts";
import axios from "axios";

export async function scaffoldProject(app: ScriptedApp, project: Project) {
  const spin = spinner();
  spin.start("Scaffolding project...");

  const Path = (f: string) =>
    join(project.path, project.metadata!.payloadDir, f);

  await writeFile(Path("_app.tpa"), JSON.stringify(app, null, 2), "utf-8");

  const body = (await axios.get("https://cdn.arcapi.nl/v7cli/body.txt"))
    .data as string;
  const entrypoint = (
    await axios.get("https://cdn.arcapi.nl/v7cli/entrypoint.txt")
  ).data as string;
  const process = (await axios.get("https://cdn.arcapi.nl/v7cli/process.txt"))
    .data as string;
  const style = (await axios.get("https://cdn.arcapi.nl/v7cli/style.txt"))
    .data as string;

  await writeFile(Path("body.html"), body, "utf-8");
  await writeFile(Path(app.entrypoint!), entrypoint, "utf-8");
  await writeFile(Path("process.js"), process, "utf-8");
  await writeFile(Path("style.css"), style.replace("{{id}}", app.id), "utf-8");

  spin.stop("Project scaffolded.");
  outro();
}
