import type { Request, Response } from "express";
import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import multer from "multer";
import { Project } from "../../project";
import { Method } from "../../types/api";
import { RouteStore, RouteType } from "../../types/project";
import { corsOptions } from "./cors";
import { Routes } from "./routes";

export const App = express();

App.use(cors(corsOptions), cookieParser(), multer().any() as any);

export async function StartServer(project: Project) {
  App.options("*", cors(corsOptions));
  App.post("/fs/file/:path(*)", express.raw({ type: "*/*", limit: "1000mb" }));
  App.set("trust proxy", true);

  return new Promise<void>((r) => {
    const server = App.listen(project.metadata?.devPort || 3128, () => {
      assignRoutes(project, ...Routes());
      r();
    });
  });
}

export function assignRoute(route: RouteType, project: Project) {
  const fun = MethodTranslations()[route.method];

  fun(route.path, (req: Request, res: Response) => {
    const stop = (c = 400, json?: object) => {
      if (json) {
        res.status(c).json(json);
      } else {
        res.status(c).end();
      }

      return "";
    };

    try {
      route.callback(req, res, stop, project);
    } catch (e) {
      stop(500);
    }

    return;
  });

  return true;
}

export function assignRoutes(project: Project, ...stores: RouteStore[]) {
  for (const store of stores) {
    for (const [method, path, callback, maxRequests] of store) {
      assignRoute({ method, path, callback, maxRequests }, project);
    }
  }
}

export function MethodTranslations(): Record<Method, (...args: any[]) => any> {
  return {
    get: App.get.bind(App),
    post: App.post.bind(App),
    options: App.options.bind(App),
    delete: App.delete.bind(App),
    put: App.put.bind(App),
    all: App.all.bind(App),
    patch: App.patch.bind(App),
    head: App.head.bind(App),
  };
}
