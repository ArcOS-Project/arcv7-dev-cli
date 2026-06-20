import { intro, isCancel, multiselect, text } from "@clack/prompts";
import { abort } from "../commands/new";
import { ScriptedApp, Size } from "../types/app";
import { PackageMetadata } from "../types/package";
import type { ProcessType } from "../types/project";

export async function TpaWizard(pkg: PackageMetadata, processType: ProcessType) {
  intro("Scaffold ArcOS App");

  const entrypoint = await text({
    message: "What do you want to call your entrypoint file?",
    initialValue: "process.js",
    validate(value) {
      if (!value) return "Please specify a filename";
      if (value.includes("/") || value.includes("\\") || value.includes("..")) return "Please specify just a filename.";
      if (!value.endsWith(".js")) return "The filename needs to end in .js";
    },
  });

  if (isCancel(entrypoint)) return abort();

  const iconName = await text({
    message: "Filename for the icon?",
    initialValue: "icon.png",
    validate(value) {
      if (!value) return "Please specify a filename";
      if (value.includes("/") || value.includes("\\") || value.includes("..")) return "Please specify just a filename.";
    },
  });

  if (isCancel(iconName)) return abort();

  const initialWindowState = ["resizable"];
  const initialWindowButtons = ["minimize", "close"];

  const sizeConfigs: { size: Size; minSize: Size; maxSize: Size } = {
    size: { w: 300, h: 300 },
    minSize: { w: 300, h: 300 },
    maxSize: { w: 300, h: 300 },
  };

  const width =
    processType === "Process"
      ? String(sizeConfigs.size.w)
      : await text({
          message: "Default window width?",
          initialValue: String(sizeConfigs.size.w),
          validate(value) {
            if (!Number(value)) return "That's not a number";
          },
        });
  if (isCancel(width)) return abort();

  const height =
    processType === "Process"
      ? String(sizeConfigs.size.h)
      : await text({
          message: "Default window height?",
          initialValue: String(sizeConfigs.size.h),
          validate(value) {
            if (!Number(value)) return "That's not a number";
          },
        });
  if (isCancel(height)) return abort();

  const minWidth =
    processType === "Process"
      ? String(sizeConfigs.minSize.w)
      : await text({
          message: "Minimal window width?",
          initialValue: String(sizeConfigs.minSize.w),
          validate(value) {
            if (!Number(value)) return "That's not a number";
          },
        });
  if (isCancel(minWidth)) return abort();

  const minHeight =
    processType === "Process"
      ? String(sizeConfigs.minSize.h)
      : await text({
          message: "Minimal window height?",
          initialValue: String(sizeConfigs.minSize.h),
          validate(value) {
            if (!Number(value)) return "That's not a number";
          },
        });
  if (isCancel(minHeight)) return abort();

  const maxWidth =
    processType === "Process"
      ? String(sizeConfigs.maxSize.w)
      : await text({
          message: "Maximal window width?",
          initialValue: String(sizeConfigs.maxSize.w),
          validate(value) {
            if (!Number(value)) return "That's not a number";
          },
        });
  if (isCancel(maxWidth)) return abort();

  const maxHeight =
    processType === "Process"
      ? String(sizeConfigs.maxSize.h)
      : await text({
          message: "Maximal window height?",
          initialValue: String(sizeConfigs.maxSize.h),
          validate(value) {
            if (!Number(value)) return "That's not a number";
          },
        });
  if (isCancel(maxHeight)) return abort();

  const state =
    processType === "Process"
      ? initialWindowState
      : ((await multiselect({
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
          initialValues: initialWindowState,
          required: false,
        })) as string[]);
  if (isCancel(state)) return abort();

  const controls =
    processType === "Process"
      ? initialWindowButtons
      : ((await multiselect({
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
          initialValues: initialWindowButtons,
          required: false,
        })) as string[]);
  if (isCancel(controls)) return abort();

  const additionals = (await multiselect({
    message: "Anything else?",
    options: [
      {
        value: "glass",
        label: "Enable glass effects",
        hint:
          processType === "Process"
            ? `Has no effect for process type "${processType}"`
            : "Adds the ArcOS glass-like background to the window",
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
    initialValues: processType === "Process" ? [] : ["glass"],
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
