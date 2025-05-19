export interface App {
  metadata: AppMetadata;
  size: Size;
  minSize: Size;
  maxSize: Size;
  position: MaybeCenteredPosition;
  state: AppState;
  controls: WindowControls;
  autoRun?: boolean;
  core?: boolean;
  hidden?: boolean;
  overlay?: boolean;
  glass?: boolean;
  thirdParty?: false;
  id: string;
  originId?: string;
  entrypoint?: string;
  workingDirectory?: string;
  opens?: {
    extensions?: string[];
    mimeTypes?: string[];
  };
  elevated?: boolean;
  acceleratorDescriptions?: Record<string, string>;
  fileSignatures?: Record<string, string>;
  tpaRevision?: number;
  noSafeMode?: boolean;
}

export interface AppMetadata {
  name: string;
  version: string;
  author: string;
  icon: string;
  appGroup?: string;
}

export interface AppState {
  resizable: boolean;
  minimized: boolean;
  maximized: boolean;
  fullscreen: boolean;
  headless: boolean;
}

export interface WindowControls {
  minimize: boolean;
  maximize: boolean;
  close: boolean;
}

export type Size = { w: number; h: number };
export type Position = { x: number; y: number };
export type MaybeCenteredPosition = Partial<Position> & { centered?: boolean };

export type ScriptedApp = Omit<App, "assets">;
