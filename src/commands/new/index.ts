import { cancel, intro, isCancel, text } from "@clack/prompts";
import { Command } from "commander";
import { userInfo } from "os";

export default async function NewCommand(this: Command, destination: string) {
  intro(`Create ArcOS App - ${destination}`);

  const name = await text({
    message: "What do you want to name your app?",
    initialValue: "",
    validate(value) {
      if (!value) return "A name is required";
    },
  });

  if (isCancel(name)) abort();

  const description = await text({
    message: "Type a short description?",
    initialValue: "",

    validate(value) {
      if (!value) return `A description is required`;
      if (value.length > 32)
        return `Too long! Pick a description under 32 characters.`;
    },
  });

  if (isCancel(description)) abort();

  const author = await text({
    message: "Who's the author?",
    initialValue: userInfo().username,
    validate(value) {
      if (!value) return `A description is required`;
      if (value.length > 32)
        return `Too long! Pick a description under 32 characters.`;
    },
  });

  if (isCancel(author)) abort();

  const version = await text({
    message: "What version is your app?",
    initialValue: "1.0.0",
    validate(value) {
      if (value.length !== 5 || value[1] !== "." || value[3] !== ".")
        return "Need a version in an x.x.x format";
    },
  });

  if (isCancel(version)) abort();

  const installPath = await text({
    message: "Where will this app install?",
    initialValue: "U:/Applications/",
    validate(value) {
      if (!value.startsWith(`U:/Applications/`) || value === `U:/Applications/`)
        return "This has to be an ArcOS path that starts with 'U:/Applications/'";
    },
  });

  if (isCancel(installPath)) abort();

  const appId = await text({
    message: "What ID do you want your app to have?",
    initialValue: "",
    validate(value) {
      if (!value.includes("_"))
        return "The ID has to be the format 'author_appId'.";
    },
  });

  if (isCancel(appId)) abort();

  console.log({ name, description, author, version, installPath, appId });
}

function abort() {
  cancel("Aborted.");
  process.exit(0);
}
