import { cancel, intro, isCancel, outro, select, spinner, text } from "@clack/prompts";
import { Command } from "commander";
import { userInfo } from "os";
import { join } from "path";
import { cwd } from "process";
import { Project } from "../../project";
import { scaffoldProject } from "../../tpa";
import { TpaWizard } from "../../tpa/wizard";
import { PackageMetadata } from "../../types/package";

export default async function NewCommand(this: Command, destination: string) {
  intro(`Create ArcOS Project - ${destination}`);

  const name = await text({
    message: "What do you want to name your app?",
    initialValue: "",
    validate(value) {
      if (!value) return "A name is required";
    },
  });

  if (isCancel(name)) abort();

  const description = await text({
    message: "Please give a description for your app",
    initialValue: "",

    validate(value) {
      if (!value) return `A description is required`;
      if (value.length > 512) return `Too long! Pick a description under 512 characters.`;
    },
  });

  if (isCancel(description)) abort();

  const author = await text({
    message: "Who's the author?",
    initialValue: userInfo().username,
    validate(value) {
      if (!value) return `An author is required`;
      if (value.length > 32) return `Too long! Pick a name under 32 characters.`;
    },
  });

  if (isCancel(author)) abort();

  const version = await text({
    message: "What version is your app?",
    initialValue: "1.0.0",
    validate(value) {
      if (value.length !== 5 || value[1] !== "." || value[3] !== ".") return "Need a version in an x.x.x format";
    },
  });

  if (isCancel(version)) abort();

  const appId = await text({
    message: "What ID do you want your app to have?",
    initialValue: "",
    validate(value) {
      if (!value.includes("_") || value.includes(".") || value.includes("-"))
        return "The ID has to be the format 'author_appId', and it may not include any periods or dashes.";
    },
  });

  if (isCancel(appId)) abort();

  const installLocation = await text({
    message: "Where will this app install?",
    initialValue: `U:/Applications/${appId.toString()}`,
    validate(value) {
      if (!value.startsWith(`U:/Applications/`) || value === `U:/Applications/`)
        return "This has to be an ArcOS path that starts with 'U:/Applications/'";
    },
  });

  const processType = await select({
    message: "What kind of app is this?",
    options: [
      { value: "AppProcess", label: "AppProcess", hint: "A window is included for the user to interact with." },
      { value: "Process", label: "Process", hint: "No included window, yet has access to all ArcOS offers." },
    ],
  });

  if (isCancel(processType)) abort();

  const projectType = await select({
    message: "Do you want to enable experimental TypeScript support?",
    options: [
      { value: "javascript", label: "No thanks." },
      { value: "typescript", label: "Sure!" },
    ],
  });

  if (isCancel(projectType)) abort();

  const metadata: PackageMetadata = {
    name: name.toString(),
    description: description.toString(),
    author: author.toString(),
    version: version.toString(),
    installLocation: installLocation.toString(),
    appId: appId.toString(),
  };

  const spin = spinner();
  spin.start("Initializing project");

  const project = new Project(join(cwd(), destination));

  await project.initialize(metadata, `${metadata.appId}.arc`, "src");

  spin.stop("Done.");
  outro();

  const app = await TpaWizard(metadata);

  scaffoldProject(app, project, processType.toString(), projectType.toString());
}

export function abort(): any {
  cancel("Aborted.");
  return process.exit(0) as any;
}
