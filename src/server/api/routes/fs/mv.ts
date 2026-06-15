import { RouteArrayed } from "../../../../types/project";

export const FsMv: RouteArrayed = [
  "post",
  "/fs/mv/:source(*)",
  async (req, _, stop, project) => {
    if (!req.params.source || !req.body.destination) return stop();

    try {
      await project.filesystem?.moveItem(
        req.params.source,
        req.body.destination,
      );

      return stop(200);
    } catch {
      return stop(404);
    }
  },
  0,
];
