import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import readline from "node:readline/promises";
import { logger } from "./logger";
import { getCliWatchTarget } from "./env-loader";

export interface DaemonRuntimeConfig {
  watchRoot: string;
  apiUrl: string;
  token?: string | undefined;
  userEmail?: string | undefined;
}

const DEFAULT_API_URL = "https://vibepulse-api.onrender.com";

function getConfigDir(): string {
  return path.join(os.homedir(), ".vibepulse");
}

function getConfigFilePath(): string {
  return path.join(getConfigDir(), "daemon.json");
}

export function readStoredConfig(): Partial<DaemonRuntimeConfig> {
  const filePath = getConfigFilePath();
  if (fs.existsSync(filePath)) {
    try {
      const content = fs.readFileSync(filePath, "utf-8");
      return JSON.parse(content) as Partial<DaemonRuntimeConfig>;
    } catch {
      // ignore
    }
  }
  return {};
}

export function saveStoredConfig(config: DaemonRuntimeConfig): void {
  try {
    const dir = getConfigDir();
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(getConfigFilePath(), JSON.stringify(config, null, 2), "utf-8");
  } catch (err) {
    logger.warn("Could not save config to ~/.vibepulse/daemon.json:", err);
  }
}

export function getCliToken(): string | undefined {
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (!arg) continue;
    if (arg === "--token" || arg === "-t") {
      const val = args[i + 1];
      if (val && !val.startsWith("-")) return val;
    }
    if (arg.startsWith("--token=")) {
      return arg.split("=")[1];
    }
  }
  return undefined;
}

export function getCliApiUrl(): string | undefined {
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (!arg) continue;
    if (arg === "--api" || arg === "--api-url" || arg === "-a") {
      const val = args[i + 1];
      if (val && !val.startsWith("-")) return val;
    }
    if (arg.startsWith("--api=")) {
      return arg.split("=")[1];
    }
    if (arg.startsWith("--api-url=")) {
      return arg.split("=")[1];
    }
  }
  return undefined;
}

export function isCliResetRequested(): boolean {
  return process.argv.includes("--reset") || process.argv.includes("--reconfigure");
}

export async function verifyDaemonToken(
  apiUrl: string,
  token: string,
): Promise<{ valid: boolean; email?: string | undefined; error?: string | undefined }> {
  const cleanUrl = apiUrl.replace(/\/+$/, "");
  try {
    const res = await fetch(`${cleanUrl}/api/auth/daemon/verify`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (res.ok) {
      const data = (await res.json()) as { email?: string };
      return { valid: true, email: data.email };
    }
    return { valid: false, error: `Invalid token (HTTP ${res.status})` };
  } catch (err: unknown) {
    return {
      valid: false,
      error: `Could not connect to API: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

export async function ensureDaemonConfig(): Promise<DaemonRuntimeConfig> {
  const stored = isCliResetRequested() ? {} : readStoredConfig();

  // CLI overrides take highest precedence
  const cliWatch = getCliWatchTarget();
  const cliToken = getCliToken();
  const cliApi = getCliApiUrl();

  let watchRoot = cliWatch ?? process.env["WATCH_ROOT"] ?? stored.watchRoot;
  let apiUrl =
    cliApi ?? process.env["VIBEPULSE_API_URL"] ?? process.env["API_URL"] ?? stored.apiUrl;
  let token =
    cliToken ?? process.env["DAEMON_TOKEN"] ?? process.env["VIBEPULSE_TOKEN"] ?? stored.token;
  let userEmail = stored.userEmail;

  // If already configured and not reset, proceed immediately
  if (watchRoot && apiUrl && token) {
    return { watchRoot, apiUrl, token, userEmail };
  }

  // Fallback defaults if non-interactive
  if (!process.stdin.isTTY) {
    return {
      watchRoot: watchRoot ?? process.cwd(),
      apiUrl: apiUrl ?? DEFAULT_API_URL,
      token,
      userEmail,
    };
  }

  // Interactive Setup Wizard in Terminal
  console.log("\n==============================================================");
  console.log("            VibePulse Telemetry Daemon (Windows)              ");
  console.log("==============================================================");
  console.log("Real-time filesystem observation for your cloud VibePulse workspace.\n");

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    if (!apiUrl) {
      const enteredApi = await rl.question(
        `Cloud API URL [Press Enter for default: ${DEFAULT_API_URL}]: `,
      );
      apiUrl = enteredApi.trim() || DEFAULT_API_URL;
    }

    if (!watchRoot) {
      const cwd = process.cwd();
      const enteredPath = await rl.question(
        `Project directory to observe [Press Enter for current: ${cwd}]: `,
      );
      watchRoot = enteredPath.trim() || cwd;
    }

    if (!token) {
      console.log("\nTip: Copy your Daemon Token from your VibePulse Dashboard header.");
      const enteredToken = await rl.question("Paste your VibePulse Daemon Token: ");
      token = enteredToken.trim();
    }

    if (token) {
      console.log("\nVerifying token with cloud engine...");
      const verification = await verifyDaemonToken(apiUrl, token);
      if (verification.valid) {
        userEmail = verification.email;
        console.log(`✓ Authenticated successfully as: ${userEmail ?? "VibePulse User"}`);
      } else {
        console.log(
          `⚠ Warning: ${verification.error || "Token could not be verified"}. Continuing...`,
        );
      }
    }

    const finalConfig: DaemonRuntimeConfig = {
      watchRoot,
      apiUrl,
      token,
      userEmail,
    };

    saveStoredConfig(finalConfig);
    console.log(`✓ Configuration saved to ~/.vibepulse/daemon.json\n`);
    return finalConfig;
  } finally {
    rl.close();
  }
}
