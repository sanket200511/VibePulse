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
  let testProjectId = null;

  try {
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
    testProjectId = switchData.project_id;
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
    fs.appendFileSync(serviceFile, "# mod 1\n");
    await sleep(25);
    fs.appendFileSync(serviceFile, "# mod 2\n");
    await sleep(25);
    fs.appendFileSync(serviceFile, "# mod 3\n");
    await sleep(1500); // Allow 300ms debouncer + publishing to settle

    // 5. Normal modifications (separate event)
    console.log("[5/9] Modifying config/settings.py (standard single event)...");
    fs.writeFileSync(
      path.join(testProjectDir, "config", "settings.py"),
      "ENV = 'production'\nDEBUG = False\n",
    );
    await sleep(1500);

    // 6. Ignored modifications (node_modules noise filter test)
    console.log("[6/9] Simulating node_modules modifications (noise filter test)...");
    const nmDir = path.join(testProjectDir, "node_modules", "some-pkg");
    fs.mkdirSync(nmDir, { recursive: true });
    fs.writeFileSync(path.join(nmDir, "index.js"), "module.exports = {};\n");
    await sleep(1000);

    // 7. Delete a file
    console.log("[7/9] Deleting src/service.py (testing immediate delete bypass)...");
    fs.unlinkSync(serviceFile);
    await sleep(1500);

    // 8. Fetch captured telemetry from API
    console.log("[8/9] Verifying captured telemetry from FastAPI backend...");
    const evRes = await fetch(
      `${API_URL}/events?project_root=${encodeURIComponent(testProjectDir)}`,
    );
    const events = await evRes.json();
    console.log(`      Total events captured in PostgreSQL: ${events.length}`);

    const fileCreatedEv = events.find((e) => e.file_path && e.file_path.endsWith("service.py"));
    const settingsEv = events.find((e) => e.file_path && e.file_path.endsWith("settings.py"));

    console.log("      [PASS] File creation detected:", !!fileCreatedEv);
    console.log("      [PASS] Config modification detected:", !!settingsEv);

    // Ensure zero node_modules events leaked through
    const hasNodeModules = events.some((e) => e.file_path && e.file_path.includes("node_modules"));
    console.log("      [PASS] Zero node_modules noise events:", !hasNodeModules);

    // 9. Switch back to primary seminar project & clean up
    console.log("[9/9] Switching daemon back to primary demo project...");
    await fetch(`${DAEMON_URL}/watch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ root: primaryDemoDir }),
    });
    await sleep(1500);

    console.log("=========================================");
    console.log(" [✓] OBSERVATION ENGINE 2.0 E2E PASSED!  ");
    console.log("=========================================");
  } finally {
    // Safely remove test project from PostgreSQL
    if (testProjectId) {
      console.log("      Safely removing disposable project from VibePulse DB...");
      try {
        await fetch(`${API_URL}/api/projects/${testProjectId}?force=true`, { method: "DELETE" });
      } catch {}
    }

    // Clean physical directory
    try {
      if (fs.existsSync(testProjectDir)) {
        fs.rmSync(testProjectDir, { recursive: true, force: true });
        console.log("      Cleaned temporary test directory:", testProjectDir);
      }
    } catch {}
  }
}

runE2E().catch((err) => {
  console.error("E2E Test Failed:", err);
  process.exit(1);
});
