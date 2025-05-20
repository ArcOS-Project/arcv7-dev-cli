import { RouteStore } from "../../../types/project";
import { FsAccessorsPost } from "./fs/accessors/post";
import { FsCp } from "./fs/cp";
import { FsDirGet } from "./fs/dir/_get";
import { FsDirGetPath } from "./fs/dir/get";
import { FsDirPost } from "./fs/dir/post";
import { FsDirectGet } from "./fs/direct/get";
import { FsFileGet } from "./fs/file/get";
import { FsFilePost } from "./fs/file/post";
import { FsMv } from "./fs/mv";
import { FsQuota } from "./fs/quota";
import { FsRm } from "./fs/rm";
import { FsTreeGet } from "./fs/tree/_get";
import { FstreeGetPath } from "./fs/tree/get";

export function FilesystemRoutes(): RouteStore {
  return [
    FsDirGetPath,
    FsDirGet,
    FsDirPost,
    FsFileGet,
    FsFilePost,
    FstreeGetPath,
    FsTreeGet,
    FsQuota,
    FsRm,
    FsCp,
    FsMv,
    FsDirectGet,
    FsAccessorsPost,
  ];
}
