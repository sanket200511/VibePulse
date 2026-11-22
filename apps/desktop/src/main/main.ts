import { app, BrowserWindow, ipcMain, dialog, shell, Tray, Menu, nativeImage } from "electron";
import path from "node:path";
import os from "node:os";
import fs from "node:fs";
import { DesktopObservationEngine, type TelemetryEvent, type EngineStatus } from "./engine";

const CONFIG_DIR = path.join(os.homedir(), ".vibepulse");
const CONFIG_FILE = path.join(CONFIG_DIR, "daemon.json");

interface AppConfig {
  watchRoot: string;
  apiUrl: string;
  token?: string;
  userEmail?: string;
  autoStart?: boolean;
  minimizeToTray?: boolean;
  debounceMs?: number;
}

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let isQuitting = false;

function readConfig(): AppConfig {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const content = fs.readFileSync(CONFIG_FILE, "utf-8");
      return JSON.parse(content);
    }
  } catch {
    // fallback
  }
  return {
    watchRoot: process.cwd(),
    apiUrl: "https://vibepulse-api.onrender.com",
    minimizeToTray: true,
    autoStart: false,
    debounceMs: 300,
  };
}

function saveConfig(cfg: Partial<AppConfig>): AppConfig {
  const current = readConfig();
  const merged: AppConfig = { ...current, ...cfg };
  try {
    if (!fs.existsSync(CONFIG_DIR)) {
      fs.mkdirSync(CONFIG_DIR, { recursive: true });
    }
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(merged, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to save config:", err);
  }
  return merged;
}

// Observation Engine instance
const engine = new DesktopObservationEngine({
  onEvent: (event: TelemetryEvent) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("telemetry:event", event);
    }
  },
  onStatus: (status: EngineStatus) => {
    updateTray(status.observing);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("telemetry:status", status);
    }
  },
});

function createTray() {
  // Simple 16x16 icon data uri or fallback
  const icon = nativeImage.createFromBuffer(
    Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAZElEQVQ4T2NkoBAwUqifYdQAI6E0AwMDE0MhA8O/IgbG//kMjL+FGBi+GjAwvL/FwPDyJAMDgx+SZmS92DRjczcy2k0N2GjRgyw2KgC1A1A8gKYxGNE0BqMGIwEGBi07mB76HwA430fR1c238QAAAABJRU5ErkJggg==",
      "base64",
    ),
  );

  tray = new Tray(icon);
  tray.setToolTip("VibePulse Desktop Telemetry");

  const contextMenu = Menu.buildFromTemplate([
    {
      label: "Show VibePulse Desktop",
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      },
    },
    {
      label: "Open Web Dashboard",
      click: () => {
        const config = readConfig();
        const url = config.apiUrl.includes("onrender.com")
          ? "https://vibepulse-dashboard.onrender.com"
          : "http://localhost:5183";
        void shell.openExternal(url);
      },
    },
    { type: "separator" },
    {
      label: "Pause Observation",
      click: () => {
        void engine.stop();
      },
    },
    {
      label: "Resume Observation",
      click: () => {
        const config = readConfig();
        if (config.watchRoot) {
          void engine.start({
            projectRoot: config.watchRoot,
            apiUrl: config.apiUrl,
            token: config.token,
            debounceMs: config.debounceMs,
          });
        }
      },
    },
    { type: "separator" },
    {
      label: "Quit VibePulse",
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);
  tray.on("double-click", () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

function updateTray(isObserving: boolean) {
  if (!tray) return;
  tray.setToolTip(
    isObserving ? "VibePulse: Observing Active Workspace" : "VibePulse: Standby / Offline",
  );
}

function createWindow() {
  const currentDir = typeof __dirname !== "undefined" ? __dirname : process.cwd();

  mainWindow = new BrowserWindow({
    width: 980,
    height: 740,
    minWidth: 820,
    minHeight: 600,
    frame: true,
    titleBarStyle: "default",
    backgroundColor: "#0d0f14",
    webPreferences: {
      preload: path.join(currentDir, "preload.cjs"),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  const htmlPath = path.join(currentDir, "../renderer/index.html");
  if (fs.existsSync(htmlPath)) {
    void mainWindow.loadFile(htmlPath);
  } else {
    // Development fallback
    void mainWindow.loadFile(path.join(process.cwd(), "apps/desktop/src/renderer/index.html"));
  }

  mainWindow.on("close", (e) => {
    const config = readConfig();
    if (!isQuitting && config.minimizeToTray) {
      e.preventDefault();
      mainWindow?.hide();
    }
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

// Single instance lock
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });

  void app.whenReady().then(() => {
    createTray();
    createWindow();

    // Auto-start observation if config exists
    const config = readConfig();
    if (config.watchRoot && fs.existsSync(config.watchRoot)) {
      void engine.start({
        projectRoot: config.watchRoot,
        apiUrl: config.apiUrl || "https://vibepulse-api.onrender.com",
        token: config.token,
        debounceMs: config.debounceMs,
      });
    }

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  });
}

app.on("before-quit", () => {
  isQuitting = true;
  void engine.stop();
});

app.on("window-all-closed", () => {
  const config = readConfig();
  if (process.platform !== "darwin" && !config.minimizeToTray) {
    app.quit();
  }
});

// ── IPC Handlers ────────────────────────────────────────────────────────────

ipcMain.handle("desktop:select-folder", async () => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    title: "Select Project Directory to Observe",
    properties: ["openDirectory"],
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  const selectedPath = result.filePaths[0];
  if (!selectedPath) return null;

  saveConfig({ watchRoot: selectedPath });
  const config = readConfig();
  await engine.start({
    projectRoot: selectedPath,
    apiUrl: config.apiUrl,
    token: config.token,
    debounceMs: config.debounceMs,
  });
  return selectedPath;
});

ipcMain.handle("desktop:get-config", async () => {
  return readConfig();
});

ipcMain.handle("desktop:save-config", async (_, updates: Partial<AppConfig>) => {
  saveConfig(updates);
  if (updates.autoStart !== undefined) {
    app.setLoginItemSettings({
      openAtLogin: updates.autoStart,
      name: "VibePulse Desktop",
    });
  }
  return true;
});

ipcMain.handle("desktop:start-observing", async (_, folderPath?: string) => {
  const config = readConfig();
  const target = folderPath || config.watchRoot;
  if (!target || !fs.existsSync(target)) {
    return { success: false, error: "Please select a valid directory first." };
  }
  try {
    await engine.start({
      projectRoot: target,
      apiUrl: config.apiUrl,
      token: config.token,
      debounceMs: config.debounceMs,
    });
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
});

ipcMain.handle("desktop:stop-observing", async () => {
  await engine.stop();
  return true;
});

ipcMain.handle("desktop:verify-token", async (_, apiUrl: string, token: string) => {
  const cleanUrl = apiUrl.replace(/\/+$/, "");
  try {
    const res = await fetch(`${cleanUrl}/api/auth/daemon/verify`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const data = (await res.json()) as { email?: string };
      saveConfig({ token, userEmail: data.email, apiUrl });
      return { valid: true, email: data.email };
    }
    return { valid: false, error: `Invalid token (HTTP ${res.status})` };
  } catch (err: unknown) {
    return { valid: false, error: err instanceof Error ? err.message : String(err) };
  }
});

ipcMain.handle("desktop:open-external", async (_, url: string) => {
  void shell.openExternal(url);
});

ipcMain.on("desktop:minimize", () => {
  mainWindow?.minimize();
});

ipcMain.on("desktop:maximize", () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow?.maximize();
  }
});

ipcMain.on("desktop:close", () => {
  mainWindow?.close();
});
