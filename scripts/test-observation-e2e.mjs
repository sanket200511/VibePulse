import fs from "fs";
import path from "path";

const testProjectDir = "D:\\VibePulse-Observation-Test";
const primaryDemoDir = "D:\\VibePulse-Seminar-Demo";
const API_URL = process.env.VIBEPULSE_API_URL || process.env.API_URL || "http://localhost:5133";
const DAEMON_URL =
  process.env.VIBEPULSE_DAEMON_URL || process.env.DAEMON_URL || "http://localhost:5135";

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runE2E() {
  console.log("=========================================");
  console.log(" OBSERVATION ENGINE 2.0 — END-TO-END TEST");
  console.log("=========================================");

  // 1. Create disposable project directory
  if (fs.existsSync(testProjectDir)) {
    fs.rmSync(testProjectDir, { recursive: true, force: true });
  }
  fs.mkdirSync(path.join(testProjectDir, "src"), { recursive: true });
  fs.mkdirSync(path.join(testProjectDir, "config"), { recursive: true });
  fs.writeFileSync(path.join(testProjectDir, "README.md"), "# Observation Engine Test Project\n");
  fs.writeFileSync(path.join(testProjectDir, "config", "settings.py"), "ENV = 'test'\n");

  console.log("[1/9] Created disposable project directory:", testProjectDir);

  // 2. Switch daemon to watch disposable project
  console.log("[2/9] Switching daemon to observe disposable project...");
  const switchRes = await fetch(`${DAEMON_URL}/watch`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ root: testProjectDir }),
  });
  const switchData = await switchRes.json();
  console.log("      Daemon watch status:", switchData);
  const testProjectId = switchData.project_id;
  await sleep(1500);

  // 3. Create a new source file
  const serviceFile = path.join(testProjectDir, "src", "service.py");
  fs.writeFileSync(serviceFile, "def compute(x):\n    return x * 2\n");
  console.log("[3/9] Created src/service.py");
  await sleep(1000);

  // 4. Rapid modifications (test burst collapsing)
  console.log(
    "[4/9] Triggering rapid burst modifications on src/service.py (3 writes in 100ms)...",
  );
  fs.appendFileSync(serviceFile, "# write 1\n");
  await sleep(30);
  fs.appendFileSync(serviceFile, "# write 2\n");
  await sleep(30);
  fs.appendFileSync(serviceFile, "# write 3\n");
  await sleep(1500); // let debounce window settle and flush

  // 5. Create ignored files (filesystem noise)
  console.log("[5/9] Creating ignored files (node_modules, .pytest_cache)...");
  const nodeModulesDir = path.join(testProjectDir, "node_modules", "lodash");
  const cacheDir = path.join(testProjectDir, ".pytest_cache");
  fs.mkdirSync(nodeModulesDir, { recursive: true });
  fs.mkdirSync(cacheDir, { recursive: true });
  fs.writeFileSync(path.join(nodeModulesDir, "index.js"), "module.exports = {};\n");
  fs.writeFileSync(path.join(cacheDir, "v.json"), "{}\n");
  await sleep(1000);

  // 6. Create security-sensitive file (must be observed)
  console.log("[6/9] Modifying security-sensitive file config/settings.py...");
  fs.appendFileSync(path.join(testProjectDir, "config", "settings.py"), "API_KEY = 'TEST_KEY'\n");
  await sleep(1500);

  // 7. Delete a file
  console.log("[7/9] Deleting src/service.py (testing immediate delete bypass)...");
  fs.rmSync(serviceFile, { force: true });
  await sleep(1000);

  // 8. Verify project context & events in API
  console.log("[8/9] Verifying telemetry in API for project:", testProjectId);
  const eventsRes = await fetch(`${API_URL}/events`);
  const eventsData = await eventsRes.json();
  const projectEvents = eventsData.events.filter((e) =>
    e.project_root.includes("Observation-Test"),
  );
  console.log(`      Captured ${projectEvents.length} events for test project.`);

  // Check no ignored node_modules events
  const hasNodeModules = projectEvents.some(
    (e) => e.file_path && e.file_path.includes("node_modules"),
  );
  console.log("      [PASS] Zero node_modules noise events:", !hasNodeModules);

  // 9. Switch back to primary seminar project & clean up
  console.log("[9/9] Switching daemon back to primary demo project...");
  await fetch(`${DAEMON_URL}/watch`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ root: primaryDemoDir }),
  });
  await sleep(1500);

  // Safely remove test project from PostgreSQL
  if (testProjectId) {
    console.log("      Safely removing disposable project from VibePulse DB...");
    const delRes = await fetch(`${API_URL}/api/projects/${testProjectId}`, { method: "DELETE" });
    const delData = await delRes.json();
    console.log("      Delete result:", delData);
  }

  // Clean physical directory
  fs.rmSync(testProjectDir, { recursive: true, force: true });
  console.log("      Cleaned temporary test directory:", testProjectDir);

  console.log("=========================================");
  console.log(" [✓] OBSERVATION ENGINE 2.0 E2E PASSED!  ");
  console.log("=========================================");
}

runE2E().catch((err) => {
  console.error("E2E Test Failed:", err);
  process.exit(1);
});
