import mime from "mime";
import { RouteArrayed } from "../../../../../types/project";

export const FsDirectGet: RouteArrayed = [
  "get",
  "/fs/direct/:accessor",
  async (req, res, stop, project) => {
    if (!req.params.accessor) return stop();

    const path = project.filesystem?.accessors[req.params.accessor];

    if (!path) return stop(404);

    try {
      const stats = await project.filesystem?.stat(path);

      if (!stats) throw "";

      const range = req.headers.range;
      const contentType = mime.getType(path) || "application/octet-stream";

      if (range) {
        const [start, end] = range
          .replace(/bytes=/, "")
          .split("-")
          .map(Number);
        const finalEnd = end ? Math.min(end, stats.size - 1) : stats.size - 1;
        const chunkSize = finalEnd - start + 1;

        res.writeHead(206, {
          "Content-Range": `bytes ${start}-${finalEnd}/${stats.size}`,
          "Accept-Ranges": "bytes",
          "Content-Length": chunkSize,
          "Content-Type": contentType,
        });

        const fileStream = await project.filesystem?.createReadStream(path, start, finalEnd);

        fileStream?.pipe(res);
      } else {
        const fileStream = await project.filesystem?.createReadStream(path);

        res.writeHead(200, {
          "Content-Length": stats.size,
          "Content-Type": contentType,
          "Content-Disposition": "inline",
        });

        fileStream?.pipe(res);
      }
    } catch {
      return stop(404);
    }

    return;
  },
  0,
];
