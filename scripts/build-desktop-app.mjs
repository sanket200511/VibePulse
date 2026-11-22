import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const desktopDir = path.join(rootDir, "apps", "desktop");
const distDir = path.join(desktopDir, "dist");
const rendererDistDir = path.join(distDir, "renderer");
const downloadsDir = path.join(rootDir, "apps", "dashboard", "public", "downloads");

console.log("==============================================================");
console.log("        Building VibePulse Desktop Windows Application        ");
console.log("==============================================================\n");

// 1. Clean & create directories
fs.mkdirSync(path.join(distDir, "main"), { recursive: true });
fs.mkdirSync(rendererDistDir, { recursive: true });
fs.mkdirSync(downloadsDir, { recursive: true });

// 2. Bundle main & preload with esbuild
console.log("[1/4] Compiling main & preload processes with esbuild...");
execSync(
  `npx esbuild apps/desktop/src/main/main.ts --bundle --platform=node --target=node22 --outfile=apps/desktop/dist/main/main.cjs --external:electron`,
  { cwd: rootDir, stdio: "inherit" },
);

execSync(
  `npx esbuild apps/desktop/src/main/preload.ts --bundle --platform=node --target=node22 --outfile=apps/desktop/dist/main/preload.cjs --external:electron`,
  { cwd: rootDir, stdio: "inherit" },
);

// 3. Copy renderer UI assets
console.log("\n[2/4] Copying desktop GUI renderer assets...");
fs.copyFileSync(
  path.join(desktopDir, "src", "renderer", "index.html"),
  path.join(rendererDistDir, "index.html"),
);
console.log("✓ GUI renderer ready at: " + path.join(rendererDistDir, "index.html"));

// 4. Create electron-builder config
const builderConfig = {
  appId: "dev.vibepulse.desktop",
  productName: "VibePulse Desktop",
  npmRebuild: false,
  nodeGypRebuild: false,
  asar: true,
  directories: {
    app: desktopDir,
    output: path.join(distDir, "release"),
  },
  files: ["dist/**/*", "package.json"],
  win: {
    target: ["portable"],
    executableName: "vibepulse-desktop",
  },
};

const builderConfigPath = path.join(desktopDir, "electron-builder.json");
fs.writeFileSync(builderConfigPath, JSON.stringify(builderConfig, null, 2), "utf-8");

// 5. Package with electron-builder
console.log("\n[3/4] Packaging native Windows executable with electron-builder...");
try {
  execSync(`npx electron-builder --config apps/desktop/electron-builder.json --win --x64`, {
    cwd: rootDir,
    stdio: "inherit",
  });
} catch (err) {
  console.error("Packaging error:", err);
  process.exit(1);
}

// 6. Locate output binary & copy to downloads
console.log("\n[4/4] Locating executable output...");
const releaseDir = path.join(distDir, "release");
const releaseFiles = fs.existsSync(releaseDir) ? fs.readdirSync(releaseDir) : [];
const exeFile = releaseFiles.find((f) => f.endsWith(".exe") && !f.includes("blockmap"));

if (exeFile) {
  const fullExePath = path.join(releaseDir, exeFile);
  const targetDownload = path.join(downloadsDir, "vibepulse-desktop.exe");
  fs.copyFileSync(fullExePath, targetDownload);
  const stats = fs.statSync(targetDownload);
  const sizeMb = (stats.size / 1024 / 1024).toFixed(1);

  console.log("\n==============================================================");
  console.log(`✓ Standalone Windows Desktop App Ready: ${sizeMb} MB`);
  console.log(`  Binary Path:  ${fullExePath}`);
  console.log(`  Web Download: ${targetDownload}`);
  console.log("==============================================================\n");
} else {
  console.log("Warning: Could not locate packaged .exe in " + releaseDir);
}
