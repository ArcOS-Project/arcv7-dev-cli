import { RouteArrayed } from "../../../../../types/project";

export const FsDirGet: RouteArrayed = [
  "get",
  "/fs/dir",
  async (_, res, stop, project) => {
    try {
      const contents = await project.filesystem?.readDirectory();

      return res.json(contents);
    } catch {
      return stop(404);
    }
  },
  0,
];
