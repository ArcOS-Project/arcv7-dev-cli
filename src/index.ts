#!/usr/bin/env node

import { Command } from "commander";
import packageJson from "../package.json";
import BuildCommand from "./commands/build";
import DevCommand from "./commands/dev";
import NewCommand from "./commands/new";
import UpdateCommand from "./commands/update";

const program = new Command();

program.name(packageJson.name).description("Develop applications for ArcOS v7").version(packageJson.version);

program
  .command("new")
  .description("Creates a new ArcOS app project")
  .argument("<destination>", "What folder to save the app in")
  .action(NewCommand);

program.command("dev").description("Start the development server").action(DevCommand);

program.command("build").description("Compile the app into an ArcOS package").action(BuildCommand);

program.command("update").description("Update your project's type definitions").action(UpdateCommand);

program.parse();
