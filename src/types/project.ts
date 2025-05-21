import { PackageMetadata } from "./package";
import type { Request, Response } from "express";
import { Method } from "./api";
import { Project } from "../project";

export interface ProjectMetadata {
  metadata: PackageMetadata;
  devPort?: number;
  repository?: string;
  outFile: string;
  payloadDir: string;
  buildHash?: string;
  noHotRelaunch?: boolean;
}

export type RouteArrayed = [Method, string, RouteCallback, number];
export type RouteStore = RouteArrayed[];

export type RouteCallback = (
  req: Request,
  res: Response,
  stop: (c?: number, json?: object) => string,
  project: Project
) => void;

export interface RouteType {
  method: Method;
  path: string;
  callback: RouteCallback;
  maxRequests?: number;
}
