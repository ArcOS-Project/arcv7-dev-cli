import checkDiskSpace from "check-disk-space";
import { createReadStream, existsSync, statSync } from "fs";
import fs from "fs/promises";
import mime from "mime-types";
import { platform } from "os";
import path, { join } from "path";
import { tryJsonParse } from "../../json";
import { containsTypescript } from "../../tools/build-ts-tpa";
import {
  DirectoryReadReturn,
  FileEntry,
  FolderEntry,
  RecursiveDirectoryReadReturn,
  UserQuota,
} from "../../types/fs";

export class Filesystem {
  private path: string;
  accessors: Record<string, string> = {}; // R<I,P>

  constructor(projectPath: string, payloadDir: string) {
    if (!existsSync(payloadDir)) {
      this.path = join(projectPath, payloadDir);
      return;
    }

    const containsTS = containsTypescript(payloadDir);

    if (containsTS) {
      this.path = join(projectPath, "dist");
    } else {
      this.path = join(projectPath, payloadDir);
    }
  }

  private resolvePath(relativePath?: string): string {
    const resolvedPath = relativePath
      ? path.resolve(this.path, relativePath)
      : this.path;

    if (!resolvedPath.startsWith(this.path))
      throw new Error("Invalid path; breaks out of project payload");

    return resolvedPath;
  }

  private async calculateFolderSize(folderPath?: string) {
    const resolvedPath = this.resolvePath(folderPath);

    const calculateSize = async (directory: string): Promise<number> => {
      const entries = await fs.readdir(directory, {
        withFileTypes: true,
      });

      let totalSize = 0;

      for (const entry of entries) {
        const entryPath = path.join(directory, entry.name);
        if (entry.isDirectory()) {
          totalSize += await calculateSize(entryPath);
        } else if (entry.isFile()) {
          totalSize += statSync(entryPath).size;
        }
      }

      return totalSize;
    };

    return calculateSize(resolvedPath);
  }

  private async countFiles(folderPath?: string) {
    const resolvedPath = this.resolvePath(folderPath);

    const calculate = async (directory: string): Promise<number> => {
      let count = 0;
      const entries = await fs.readdir(directory, {
        withFileTypes: true,
      });

      for (const entry of entries) {
        const entryPath = path.join(directory, entry.name);

        if (entry.isDirectory()) count += await calculate(entryPath);

        count++;
      }

      return count;
    };

    return await calculate(resolvedPath);
  }

  private async countFolders(folderPath?: string) {
    const resolvedPath = this.resolvePath(folderPath);

    const calculate = async (directory: string): Promise<number> => {
      let count = 0;
      const entries = await fs.readdir(directory, {
        withFileTypes: true,
      });

      for (const entry of entries) {
        const entryPath = path.join(directory, entry.name);

        if (entry.isDirectory()) {
          count++;
          count += await calculate(entryPath);
        }
      }

      return count;
    };

    return await calculate(resolvedPath);
  }

  public async writeFile(filePath: string, content: string | Buffer) {
    const resolvedPath = this.resolvePath(filePath);

    await fs.mkdir(path.dirname(resolvedPath), { recursive: true });
    await fs.writeFile(resolvedPath, content);
  }

  public async readFile(filePath: string): Promise<string | Buffer> {
    const resolvedPath = this.resolvePath(filePath);

    return fs.readFile(resolvedPath);
  }

  public async pipeFile(filePath: string) {
    const resolvedPath = this.resolvePath(filePath);

    return createReadStream(resolvedPath);
  }

  public async createDirectory(dirPath: string): Promise<void> {
    const resolvedPath = await this.resolvePath(dirPath);

    await fs.mkdir(resolvedPath, { recursive: true });
  }

  public async readDirectory(
    dirPath?: string,
    populateShortcuts = true,
  ): Promise<DirectoryReadReturn> {
    const resolvedPath = this.resolvePath(dirPath);
    const dirEntries = await fs.readdir(resolvedPath, {
      withFileTypes: true,
    });
    const size = await this.calculateFolderSize(dirPath);
    const fileCount = await this.countFiles(dirPath);
    const folderCount = await this.countFolders(dirPath);
    const shortcuts = populateShortcuts
      ? await this.bulk(".arclnk", dirPath)
      : {};
    const directoryReadReturn: DirectoryReadReturn = {
      dirs: [],
      files: [],
      totalSize: size,
      totalFiles: fileCount,
      totalFolders: folderCount,
      shortcuts,
    };

    for (const entry of dirEntries) {
      const entryPath = path.join(resolvedPath, entry.name);
      const stats = statSync(entryPath);

      if (entry.isDirectory()) {
        const folderEntry: FolderEntry = {
          itemId: "",
          name: entry.name,
          dateCreated: stats.birthtime,
          dateModified: stats.mtime,
        };
        directoryReadReturn.dirs.push(folderEntry);
      } else if (entry.isFile()) {
        const fileEntry: FileEntry = {
          itemId: "",
          name: entry.name,
          size: stats.size,
          mimeType: mime.lookup(entryPath) || "application/octet-stream",
          dateCreated: stats.birthtime,
          dateModified: stats.mtime,
        };
        directoryReadReturn.files.push(fileEntry);
      }
    }

    return directoryReadReturn;
  }

  public async getDirectoryTree(
    dirPath?: string,
  ): Promise<RecursiveDirectoryReadReturn> {
    const resolvedPath = this.resolvePath(dirPath);

    const getTree = async (
      currentPath: string,
    ): Promise<RecursiveDirectoryReadReturn> => {
      const dirEntries = await fs.readdir(currentPath, {
        withFileTypes: true,
      });
      const shortcuts = (await this.bulk(".arclnk", currentPath)) || {};

      const dirs: (FolderEntry & {
        children: RecursiveDirectoryReadReturn;
      })[] = [];
      const files: FileEntry[] = [];

      for (const entry of dirEntries) {
        const entryPath = path.join(currentPath, entry.name);
        const stats = statSync(entryPath);

        if (entry.isDirectory()) {
          const subTree = await getTree(entryPath);
          const folderEntry: FolderEntry & {
            children: RecursiveDirectoryReadReturn;
          } = {
            itemId: "",
            name: entry.name,
            dateCreated: stats.birthtime,
            dateModified: stats.mtime,
            children: subTree,
          };
          dirs.push(folderEntry);
        } else if (entry.isFile()) {
          const fileEntry: FileEntry = {
            itemId: "",
            name: entry.name,
            size: stats.size,
            mimeType: mime.lookup(entryPath) || "application/octet-stream",
            dateCreated: stats.birthtime,
            dateModified: stats.mtime,
          };
          files.push(fileEntry);
        }
      }

      return { dirs, files, shortcuts };
    };

    return getTree(resolvedPath);
  }

  public async moveItem(sourcePath: string, destPath: string): Promise<void> {
    const resolvedSource = this.resolvePath(sourcePath);
    const resolvedDest = this.resolvePath(destPath);

    await fs.rename(resolvedSource, resolvedDest);
  }

  public async copyItem(sourcePath: string, destPath: string): Promise<void> {
    const resolvedSource = this.resolvePath(sourcePath);
    const resolvedDest = this.resolvePath(destPath);

    await fs.cp(resolvedSource, resolvedDest, { recursive: true });
  }

  public async deleteItem(itemPath: string): Promise<void> {
    const resolvedPath = this.resolvePath(itemPath);

    await fs.rm(resolvedPath, { recursive: true });
  }

  public async exists(itemPath: string): Promise<boolean> {
    try {
      const resolvedPath = await this.resolvePath(itemPath);

      return existsSync(resolvedPath);
    } catch {
      return false;
    }
  }

  public async quota(): Promise<UserQuota> {
    const path = platform() === "win32" ? "c:" : "/";
    const usage = await checkDiskSpace(path);

    return {
      used: usage.size - usage.free,
      free: usage.free,
      max: usage.size,
      percentage: (100 / usage.size) * (usage.size - usage.free),
    };
  }

  public async stat(filePath: string) {
    const resolvedPath = this.resolvePath(filePath);
    try {
      return statSync(resolvedPath);
    } catch {
      return undefined;
    }
  }

  public async createReadStream(
    filePath: string,
    start?: number,
    end?: number,
  ) {
    const resolvedPath = this.resolvePath(filePath);

    return createReadStream(resolvedPath, { start, end });
  }

  async bulk(extension: string, path: string = "") {
    const directory = await this.readDirectory(path, false);
    const result: Record<string, any> = {};

    for (const file of directory.files) {
      if (!file.name.endsWith(extension)) continue;

      const contents = await this.readFile(join(path, file.name));

      result[file.name] = tryJsonParse(contents.toString()) || contents;

      if (JSON.stringify(result).length > 1e5) return result;
    }

    return result;
  }
}
