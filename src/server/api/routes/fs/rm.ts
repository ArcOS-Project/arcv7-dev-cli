import { RouteArrayed } from "../../../../types/project";

export const FsRm: RouteArrayed = [
  "delete",
  "/fs/rm/:path(*)",
  async (req, _, stop, project) => {
    if (!req.params.path) return stop();

    try {
      await project.filesystem?.deleteItem(req.params.path);
      return stop(200);
    } catch {
      return stop(404);
    }
  },
  0,
];
