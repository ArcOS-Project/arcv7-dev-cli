import { intro, isCancel, multiselect, text } from "@clack/prompts";
import { abort } from "../commands/new";
import { ScriptedApp } from "../types/app";
import { Project } from "../project";
import { PackageMetadata } from "../types/package";

export async function TpaWizard(pkg: PackageMetadata) {
  intro("Scaffold ArcOS App");

  const entrypoint = await text({
    message: "What do you want to call your entrypoint file?",
    initialValue: "main.js",
    validate(value) {
      if (!value) return "Please specify a filename";
      if (value.includes("/") || value.includes("\\") || value.includes(".."))
        return "Please specify just a filename.";
      if (!value.endsWith(".js")) return "The filename needs to end in .js";
    },
  });

  if (isCancel(entrypoint)) return abort();

  const iconName = await text({
    message: "Filename for the icon?",
    initialValue: "icon.png",
    validate(value) {
      if (!value) return "Please specify a filename";
      if (value.includes("/") || value.includes("\\") || value.includes(".."))
        return "Please specify just a filename.";
    },
  });

  if (isCancel(iconName)) return abort();

  const width = await text({
    message: "Default window width?",
    initialValue: "300",
    validate(value) {
      if (!Number(value)) return "That's not a number";
    },
  });
  if (isCancel(width)) return abort();

  const height = await text({
    message: "Default window height?",
    initialValue: "300",
    validate(value) {
      if (!Number(value)) return "That's not a number";
    },
  });
  if (isCancel(height)) return abort();

  const minWidth = await text({
    message: "Minimal window width?",
    initialValue: "300",
    validate(value) {
      if (!Number(value)) return "That's not a number";
    },
  });
  if (isCancel(minWidth)) return abort();

  const minHeight = await text({
    message: "Minimal window height?",
    initialValue: "300",
    validate(value) {
      if (!Number(value)) return "That's not a number";
    },
  });
  if (isCancel(minHeight)) return abort();

  const maxWidth = await text({
    message: "Maximal window width?",
    initialValue: "300",
    validate(value) {
      if (!Number(value)) return "That's not a number";
    },
  });
  if (isCancel(maxWidth)) return abort();

  const maxHeight = await text({
    message: "Maximal window height?",
    initialValue: "300",
    validate(value) {
      if (!Number(value)) return "That's not a number";
    },
  });
  if (isCancel(maxHeight)) return abort();

  const state = (await multiselect({
    message: "Select any default window states you want.",
    options: [
      {
        value: "maximized",
        label: "Maximized",
        hint: "Is the window maximized by default?",
      },
      {
        value: "minimized",
        label: "Minimized",
        hint: "Is the window minimized by default?",
      },
      {
        value: "fullscreen",
        label: "Fullscreen",
        hint: "Is the window fullscreen by default?",
      },
      {
        value: "resizable",
        label: "Resizable",
        hint: "Is the window resizable?",
      },
      { value: "headless", label: "Headless", hint: "hides the titlebar" },
    ],
    initialValues: ["resizable"],
    required: false,
  })) as string[];
  if (isCancel(state)) return abort();

  const controls = (await multiselect({
    message: "Which window controls do you want to enable?",
    options: [
      {
        value: "minimize",
        label: "Minimize",
        hint: "Can the user minimize the window?",
      },
      {
        value: "maximize",
        label: "Maximize",
        hint: "Can the user maximize the window?",
      },
      {
        value: "close",
        label: "Close",
        hint: "Can the user close the window?",
      },
    ],
    initialValues: ["minimize", "close"],
    required: false,
  })) as string[];
  if (isCancel(controls)) return abort();

  const additionals = (await multiselect({
    message: "Anything else?",
    options: [
      {
        value: "glass",
        label: "Enable glass effects",
        hint: "Adds the ArcOS glass-like background to the window",
      },
      {
        value: "hidden",
        label: "This is a hidden app",
        hint: "Hides the app from listings like the start menu",
      },
      {
        value: "core",
        label: "This is a core app",
        hint: "like the boot and login screens",
      },
    ],
    initialValues: ["glass"],
    required: false,
  })) as string[];
  if (isCancel(additionals)) return abort();

  const app: ScriptedApp = {
    metadata: {
      name: pkg.name,
      version: pkg.version,
      author: pkg.author,
      icon: `@local:${iconName.toString()}`,
    },
    position: { centered: true, x: 0, y: 0 },
    size: { w: Number(width), h: Number(height) },
    minSize: { w: Number(minWidth), h: Number(minHeight) },
    maxSize: { w: Number(maxWidth), h: Number(maxHeight) },
    state: {
      minimized: state.includes("minimized"),
      maximized: state.includes("maximized"),
      headless: state.includes("headless"),
      resizable: state.includes("resizable"),
      fullscreen: state.includes("fullscreen"),
    },
    controls: {
      minimize: controls.includes("minimize"),
      maximize: controls.includes("maximize"),
      close: controls.includes("close"),
    },
    glass: additionals.includes("glass"),
    hidden: additionals.includes("hidden"),
    core: additionals.includes("core"),
    entrypoint,
    id: pkg.appId,
  };

  return app;
}
