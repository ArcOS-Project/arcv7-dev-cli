import { RouteArrayed } from "../../../../../types/project";

export const FsDirPost: RouteArrayed = [
  "post",
  "/fs/dir/:path(*)",
  async (req, _, stop, project) => {
    if (!req.params.path) return stop();

    if (project.filesystem?.exists(req.params.path)) return stop(409);

    try {
      await project.filesystem?.createDirectory(req.params.path);

      return stop(200);
    } catch {
      return stop(304);
    }
  },
  0,
];
