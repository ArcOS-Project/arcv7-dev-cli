import { RouteArrayed } from "../../../../../types/project";

export const FstreeGetPath: RouteArrayed = [
  "get",
  "/fs/tree/:path(*)",
  async (req, res, stop, project) => {
    if (!req.params.path) return stop();

    try {
      const contents = await project.filesystem?.getDirectoryTree(
        req.params.path,
      );

      return res.json(contents);
    } catch {
      return stop(404);
    }
  },
  0,
];
