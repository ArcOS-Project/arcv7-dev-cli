import { RouteArrayed } from "../../../../../types/project";

export const FsTreeGet: RouteArrayed = [
  "get",
  "/fs/tree",
  async (req, res, stop, project) => {
    try {
      const contents = await project.filesystem?.getDirectoryTree();

      return res.json(contents);
    } catch {
      return stop(404);
    }
  },
  0,
];
