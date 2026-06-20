import type { Request, Response } from "express";
import { Project } from "../project";
import { Method } from "./api";
import { PackageMetadata } from "./package";

export interface ProjectMetadata {
  metadata: PackageMetadata;
  devPort?: number;
  repository?: string;
  outFile: string;
  payloadDir: string;
  buildHash?: string;
  noHotRelaunch?: boolean;
  logLevel?: "all" | "process" | "none";
}

export type RouteArrayed = [Method, string, RouteCallback, number];
export type RouteStore = RouteArrayed[];

export type RouteCallback = (req: Request, res: Response, stop: (c?: number, json?: object) => string, project: Project) => void;

export interface RouteType {
  method: Method;
  path: string;
  callback: RouteCallback;
  maxRequests?: number;
}

export type ProcessType = "AppProcess" | "Process";
