import { PackageMetadata } from "./package";

export interface ProjectMetadata {
  metadata: PackageMetadata;
  devPort?: number;
  repository?: string;
  outFile: string;
  payloadDir: string;
}
