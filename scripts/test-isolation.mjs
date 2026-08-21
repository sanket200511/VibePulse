import fs from "fs";
import path from "path";

const secondaryBase = "D:\\VibePulse-Seminar-Secondary";

fs.mkdirSync(secondaryBase, { recursive: true });
fs.writeFileSync(
  path.join(secondaryBase, "README.md"),
  "# Secondary Project\nHarmless secondary project for isolation test.\n",
);
fs.writeFileSync(path.join(secondaryBase, "app.py"), "print('hello secondary')\n");

async function main() {
  console.log("1. Switching daemon to secondary project...");
  const switchRes = await fetch("http://localhost:9000/watch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ root: secondaryBase }),
  });
  const switchData = await switchRes.json();
  console.log("Secondary project registered:", switchData.project_id, switchData.project_name);

  // Make an edit
  await new Promise((r) => setTimeout(r, 1000));
  fs.appendFileSync(path.join(secondaryBase, "app.py"), "print('isolation verified')\n");
  await new Promise((r) => setTimeout(r, 2000));

  // Verify secondary project exists separately
  const listRes = await fetch("http://localhost:8000/api/projects");
  const list = await listRes.json();
  const hasSecondary = list.projects.some((p) => p.root_path === secondaryBase);
  const hasPrimary = list.projects.some((p) => p.root_path === "D:\\VibePulse-Seminar-Demo");
  console.log("Both projects distinct in API:", { hasSecondary, hasPrimary });

  // Switch daemon back to primary demo project first (so secondary is not active)
  console.log("2. Switching daemon back to primary demo project...");
  await fetch("http://localhost:9000/watch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ root: "D:\\VibePulse-Seminar-Demo" }),
  });
  await new Promise((r) => setTimeout(r, 1000));

  // Now delete secondary project safely via API
  console.log("3. Safely removing secondary project from VibePulse...");
  const delRes = await fetch(`http://localhost:8000/api/projects/${switchData.project_id}`, {
    method: "DELETE",
  });
  const delData = await delRes.json();
  console.log("Secondary project removed from VibePulse:", delData.deleted);

  // Verify physical directory still exists untouched
  const dirExists = fs.existsSync(path.join(secondaryBase, "app.py"));
  console.log("Secondary physical directory still exists untouched:", dirExists);
}

main().catch(console.error);
