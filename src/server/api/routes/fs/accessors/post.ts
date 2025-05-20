import { randomUUID } from "crypto";
import { RouteArrayed } from "../../../../../types/project";

export const FsAccessorsPost: RouteArrayed = [
  "post",
  "/fs/accessors/:path(*)",
  async (req, res, stop, project) => {
    if (!req.params.path) return stop();

    const stat = await project.filesystem?.stat(req.params.path);
    if (!stat) return stop(404);
    if (stat.isDirectory()) return stop();

    try {
      const uuid = randomUUID();

      project.filesystem!.accessors[uuid] = req.params.path;

      res.json({
        path: req.params.path,
        accessor: uuid,
      });
    } catch {
      stop(500);
    }

    return;
  },
  0,
];
