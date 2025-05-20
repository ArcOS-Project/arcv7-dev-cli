import { RouteArrayed } from "../../../../types/project";

export const FsCp: RouteArrayed = [
  "post",
  "/fs/cp/:source(*)",
  async (req, _, stop, project) => {
    if (!req.params.source || !req.body.destination) return stop();

    try {
      await project.filesystem?.copyItem(
        req.params.source,
        req.body.destination
      );

      return stop(200);
    } catch {
      return stop(404);
    }
  },
  0,
];
