import { RouteArrayed } from "../../../types/project";

export const Ping: RouteArrayed = [
  "get",
  "/ping",
  async (_, res, __, project) => {
    res.json(project.metadata);

    return;
  },
  0,
];
