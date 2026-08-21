import fs from "fs";
import path from "path";

const base = "D:\\VibePulse-Seminar-Demo";
const settingsPath = path.join(base, "config", "settings.py");

const content = `import os

ENVIRONMENT = os.getenv("ENVIRONMENT", "development")
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///securepay.db")
MAX_PAYMENT_AMOUNT = 10000.00

# Controlled Fake Security Key for Seminar Demonstration
API_KEY = "VIBEPULSE_SEMINAR_FAKE_KEY_2026"
SECRET_KEY = "VIBEPULSE_SEMINAR_FAKE_SECRET_2026"
`;

fs.writeFileSync(settingsPath, content);
console.log("Saved config/settings.py with fake secret to " + settingsPath);
