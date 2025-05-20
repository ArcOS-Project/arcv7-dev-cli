import { RouteArrayed } from "../../../../../types/project";

export const FsDirGetPath: RouteArrayed = [
  "get",
  "/fs/dir/:path(*)",
  async (req, res, stop, project) => {
    if (!req.params.path) return stop();

    try {
      const contents = await project.filesystem?.readDirectory(req.params.path);

      return res.json(contents);
    } catch {
      return stop(404);
    }
  },
  0,
];
