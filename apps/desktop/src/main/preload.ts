import { contextBridge, ipcRenderer } from "electron";

export interface DesktopConfig {
  watchRoot: string;
  apiUrl: string;
  token?: string;
  userEmail?: string;
  autoStart?: boolean;
  minimizeToTray?: boolean;
  debounceMs?: number;
  ignoredPatterns?: string[];
}

export interface TelemetryEventPayload {
  id: string;
  timestamp: string;
  eventType: string;
  path: string;
  relativePath: string;
  size?: number;
}

export interface DesktopAPI {
  selectFolder: () => Promise<string | null>;
  getConfig: () => Promise<DesktopConfig>;
  saveConfig: (config: Partial<DesktopConfig>) => Promise<boolean>;
  startObserving: (folderPath?: string) => Promise<{ success: boolean; error?: string }>;
  stopObserving: () => Promise<boolean>;
  verifyToken: (
    apiUrl: string,
    token: string,
  ) => Promise<{ valid: boolean; email?: string; error?: string }>;
  openExternal: (url: string) => Promise<void>;
  minimizeWindow: () => void;
  maximizeWindow: () => void;
  closeWindow: () => void;
  onTelemetryEvent: (callback: (event: TelemetryEventPayload) => void) => () => void;
  onStatusChange: (
    callback: (status: { observing: boolean; project?: string; error?: string }) => void,
  ) => () => void;
}

const api: DesktopAPI = {
  selectFolder: () => ipcRenderer.invoke("desktop:select-folder"),
  getConfig: () => ipcRenderer.invoke("desktop:get-config"),
  saveConfig: (cfg) => ipcRenderer.invoke("desktop:save-config", cfg),
  startObserving: (path) => ipcRenderer.invoke("desktop:start-observing", path),
  stopObserving: () => ipcRenderer.invoke("desktop:stop-observing"),
  verifyToken: (url, tok) => ipcRenderer.invoke("desktop:verify-token", url, tok),
  openExternal: (url) => ipcRenderer.invoke("desktop:open-external", url),
  minimizeWindow: () => ipcRenderer.send("desktop:minimize"),
  maximizeWindow: () => ipcRenderer.send("desktop:maximize"),
  closeWindow: () => ipcRenderer.send("desktop:close"),
  onTelemetryEvent: (callback) => {
    const handler = (_: unknown, event: TelemetryEventPayload) => callback(event);
    ipcRenderer.on("telemetry:event", handler);
    return () => ipcRenderer.removeListener("telemetry:event", handler);
  },
  onStatusChange: (callback) => {
    const handler = (
      _: unknown,
      status: { observing: boolean; project?: string; error?: string },
    ) => callback(status);
    ipcRenderer.on("telemetry:status", handler);
    return () => ipcRenderer.removeListener("telemetry:status", handler);
  },
};

contextBridge.exposeInMainWorld("vibePulse", api);
