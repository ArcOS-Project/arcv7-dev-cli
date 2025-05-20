import { RouteStore } from "../../../types/project";
import { FilesystemRoutes } from "./fs";
import { Ping } from "./ping";

export function Routes(): RouteStore[] {
  return [FilesystemRoutes(), [Ping]];
}
