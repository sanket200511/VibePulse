/**
 * Builds a standalone Windows .exe for the VibePulse Telemetry Daemon.
 *
 * Uses:
 * 1. esbuild (bundles TypeScript daemon code into a single CommonJS file)
 * 2. Node.js Single Executable Application (SEA) blob generation
 * 3. postject (injects SEA blob into node.exe to produce standalone executable)
 */

import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import esbuild from "esbuild";

const ROOT_DIR = process.cwd();
const DAEMON_DIR = path.resolve(ROOT_DIR, "apps/daemon");
const DIST_DIR = path.resolve(DAEMON_DIR, "dist");
const DASHBOARD_DOWNLOADS_DIR = path.resolve(ROOT_DIR, "apps/dashboard/public/downloads");

async function buildExe() {
  console.log("==============================================================");
  console.log("       Building VibePulse Standalone Daemon (.exe)             ");
  console.log("==============================================================");

  if (!fs.existsSync(DIST_DIR)) {
    fs.mkdirSync(DIST_DIR, { recursive: true });
  }
  if (!fs.existsSync(DASHBOARD_DOWNLOADS_DIR)) {
    fs.mkdirSync(DASHBOARD_DOWNLOADS_DIR, { recursive: true });
  }

  // 1. Bundle TypeScript source to CommonJS with esbuild
  console.log("\n[1/5] Bundling daemon source with esbuild...");
  const bundlePath = path.resolve(DIST_DIR, "daemon.bundle.cjs");

  await esbuild.build({
    entryPoints: [path.resolve(DAEMON_DIR, "src/index.ts")],
    bundle: true,
    platform: "node",
    target: "node20",
    format: "cjs",
    outfile: bundlePath,
    logLevel: "info",
    external: ["fsevents"],
    define: {
      "process.env.NODE_ENV": '"production"',
    },
  });

  console.log(`✓ Bundled to: ${bundlePath}`);

  // 2. Generate SEA configuration file
  console.log("\n[2/5] Creating SEA configuration...");
  const seaConfigPath = path.resolve(DIST_DIR, "sea-config.json");
  const seaBlobPath = path.resolve(DIST_DIR, "sea-prep.blob");

  fs.writeFileSync(
    seaConfigPath,
    JSON.stringify(
      {
        main: bundlePath,
        output: seaBlobPath,
        disableExperimentalSEAWarning: true,
      },
      null,
      2,
    ),
    "utf-8",
  );

  // 3. Generate SEA preparation blob using Node.js
  console.log("\n[3/5] Compiling SEA preparation blob with Node.js...");
  execSync(`node --experimental-sea-config "${seaConfigPath}"`, {
    stdio: "inherit",
    cwd: ROOT_DIR,
  });

  // 4. Copy node.exe to target executable paths
  console.log("\n[4/5] Copying node executable base...");
  const nodeExePath = process.execPath;
  const targetExePath = path.resolve(DIST_DIR, "vibepulse-daemon.exe");
  const dashboardExePath = path.resolve(DASHBOARD_DOWNLOADS_DIR, "vibepulse-daemon.exe");

  fs.copyFileSync(nodeExePath, targetExePath);
  console.log(`✓ Copied ${nodeExePath} -> ${targetExePath}`);

  // 5. Inject SEA blob into executable with postject
  console.log("\n[5/5] Injecting SEA blob into executable with postject...");
  const postjectCmd = `npx postject "${targetExePath}" NODE_SEA_BLOB "${seaBlobPath}" --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2`;
  execSync(postjectCmd, { stdio: "inherit", cwd: ROOT_DIR });

  // Copy injected executable to dashboard downloads
  fs.copyFileSync(targetExePath, dashboardExePath);
  console.log(`✓ Copied to web download path: ${dashboardExePath}`);

  const stats = fs.statSync(targetExePath);
  const sizeMb = (stats.size / (1024 * 1024)).toFixed(1);

  console.log("\n==============================================================");
  console.log(`✓ Standalone Windows Executable Ready: ${sizeMb} MB`);
  console.log(`  Path: ${targetExePath}`);
  console.log(`  Web Download: ${dashboardExePath}`);
  console.log("==============================================================\n");
}

buildExe().catch((err) => {
  console.error("Failed to build standalone executable:", err);
  process.exit(1);
});
