import { execSync } from "child_process";
import readline from "readline";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");

function runCmdThrow(cmd, cwd = rootDir) {
  console.log(`> ${cmd}`);
  execSync(cmd, { cwd, stdio: "inherit", encoding: "utf-8" });
}

console.log("\n===============================================");
console.log("WARNING:");
console.log("This will delete all local VibePulse database tables and data.");
console.log("This action is destructive and cannot be undone.");
console.log("===============================================\n");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question('Type "RESET VIBEPULSE DATABASE" to continue:\n> ', (answer) => {
  if (answer.trim() !== "RESET VIBEPULSE DATABASE") {
    console.log("\nReset aborted.");
    rl.close();
    process.exit(0);
  }

  const apiDir = path.join(rootDir, "apps", "api");
  console.log("\nClearing local PostgreSQL tables...");
  runCmdThrow("uv run python scripts/reset_db.py", apiDir);

  console.log("\nRe-applying migrations to head...");
  runCmdThrow("uv run alembic upgrade head", apiDir);

  console.log("\nDatabase reset complete.");
  rl.close();
});
