import { RouteArrayed } from "../../../../../types/project";

export const FsFilePost: RouteArrayed = [
  "post",
  "/fs/file/:path(*)",
  async (req, _, stop, project) => {
    if (!req.params.path) return stop();

    try {
      await project.filesystem?.writeFile(req.params.path, req.body);

      return stop(200);
    } catch {
      return stop(304);
    }
  },
  0,
];
