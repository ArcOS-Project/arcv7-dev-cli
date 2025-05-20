import { RouteArrayed } from "../../../../../types/project";

export const FsFileGet: RouteArrayed = [
  "get",
  "/fs/file/:path(*)",
  async (req, res, stop, project) => {
    if (!req.params.path) return stop();

    try {
      const contents = await project.filesystem?.readFile(req.params.path);

      res.setHeader("Content-Length", contents?.length || 0);
      res.write(contents);

      return res.end();
    } catch {
      return stop(404);
    }
  },
  0,
];
