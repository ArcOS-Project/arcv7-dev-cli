import { RouteArrayed } from "../../../../types/project";

export const FsQuota: RouteArrayed = [
  "get",
  "/fs/quota",
  async (_, res, stop, project) => {
    try {
      const quota = await project.filesystem?.quota();

      return res.json(quota);
    } catch {
      return stop(500);
    }
  },
  0,
];
