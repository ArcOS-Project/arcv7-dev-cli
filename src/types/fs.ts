export interface FileEntry {
  itemId: string;
  name: string;
  size: number;
  mimeType: string;
  dateCreated: Date;
  dateModified: Date;
}

export interface FolderEntry {
  itemId: string;
  name: string;
  dateCreated: Date;
  dateModified: Date;
}

export interface DirectoryReadReturn {
  dirs: FolderEntry[];
  files: FileEntry[];
  totalSize: number;
  totalFolders: number;
  totalFiles: number;
  shortcuts: Record<string, any>;
}

export interface RecursiveDirectoryReadReturn {
  dirs: (FolderEntry & { children: RecursiveDirectoryReadReturn })[];
  files: FileEntry[];
  shortcuts: Record<string, any>;
}

export interface UserQuota {
  used: number;
  max: number;
  free: number;
  percentage: number;
}
