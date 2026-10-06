#!/usr/bin/env node
/**
 * VibePulse — Judges Live Demonstration Orchestrator
 *
 * Prepares the canonical "VORTEX-2026-Demo" project (D:\VORTEX-2026-Demo)
 * through real local filesystem development, natural daemon observation,
 * AST + ML hybrid security analysis, incident investigation, remediation,
 * and intelligence generation.
 *
 * STRICT INVARIANTS:
 * - NO browser automation or opening
 * - NO fake telemetry or fake database records
 * - NO real credentials used anywhere
 * - Strict [REDACTED] secret preservation
 */

import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

// ── Configuration ─────────────────────────────────────────────────────────────
const API_BASE = process.env.VIBEPULSE_API_URL || "http://127.0.0.1:5184";
const DAEMON_BASE = process.env.VIBEPULSE_DAEMON_URL || "http://127.0.0.1:5185";
const DEMO_ROOT = "D:\\VORTEX-2026-Demo";
const PROJECT_NAME = "VORTEX-2026-Demo";

// Color formatting
const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const CYAN = "\x1b[36m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const RED = "\x1b[31m";
const MAGENTA = "\x1b[35m";
const GRAY = "\x1b[90m";

function log(step, msg, detail = null) {
  const ts = new Date().toISOString().substring(11, 19);
  console.log(`${GRAY}[${ts}]${RESET} ${CYAN}${BOLD}[${step}]${RESET} ${msg}`);
  if (detail) {
    console.log(`         ${GRAY}${detail}${RESET}`);
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── HTTP Request Helper ───────────────────────────────────────────────────────
function apiRequest(baseUrl, method, pathName, body = null) {
  const url = new URL(pathName, baseUrl);
  const payload = body ? JSON.stringify(body) : null;

  return new Promise((resolve, reject) => {
    const req = http.request(
      url,
      {
        method,
        headers: {
          ...(payload
            ? {
                "Content-Type": "application/json",
                "Content-Length": Buffer.byteLength(payload),
              }
            : {}),
          Accept: "application/json, text/plain, */*",
        },
        timeout: 10000,
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            const parsed = data ? JSON.parse(data) : null;
            resolve({ status: res.statusCode, data: parsed, raw: data });
          } catch {
            resolve({ status: res.statusCode, data: null, raw: data });
          }
        });
      },
    );

    req.on("timeout", () => {
      req.destroy(new Error(`Timeout on ${method} ${url.toString()}`));
    });
    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });
}

// Helper to write file safely
function writeFile(relPath, content) {
  const fullPath = path.join(DEMO_ROOT, relPath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content.trim() + "\n", "utf8");
}

// ── MAIN ORCHESTRATION ────────────────────────────────────────────────────────
async function main() {
  console.log(
    `\n${BOLD}${MAGENTA}╔══════════════════════════════════════════════════════════════╗${RESET}`,
  );
  console.log(
    `${BOLD}${MAGENTA}║      VIBEPULSE — LIVE JUDGES DEMONSTRATION ORCHESTRATOR      ║${RESET}`,
  );
  console.log(
    `${BOLD}${MAGENTA}╚══════════════════════════════════════════════════════════════╝${RESET}\n`,
  );

  // Step 0: Check API and Daemon readiness
  log("PRE-CHECK", "Validating local VibePulse stack...");
  try {
    const apiHealth = await apiRequest(API_BASE, "GET", "/health");
    if (apiHealth.status !== 200) throw new Error(`API health returned ${apiHealth.status}`);
    log("API", `Connected to FastAPI Backend (port 5184)`, `Status: ${apiHealth.data.status}`);

    const daemonHealth = await apiRequest(DAEMON_BASE, "GET", "/health");
    if (daemonHealth.status !== 200)
      throw new Error(`Daemon health returned ${daemonHealth.status}`);
    log(
      "DAEMON",
      `Connected to Telemetry Daemon (port 5185)`,
      `Observing: ${daemonHealth.data.observing}`,
    );
  } catch (err) {
    console.error(
      `${RED}Failed to connect to VibePulse stack. Ensure pnpm dev is running!${RESET}`,
      err.message,
    );
    process.exit(1);
  }

  // Step 1: Create Demo Root Directory
  log("SETUP", `Preparing demo directory at: ${DEMO_ROOT}`);
  fs.mkdirSync(DEMO_ROOT, { recursive: true });

  // Step 2: Register Project in API
  log("REGISTER", `Registering ${PROJECT_NAME} in VibePulse API...`);
  const regRes = await apiRequest(API_BASE, "POST", "/api/projects/ensure", {
    root_path: DEMO_ROOT,
    display_name: PROJECT_NAME,
  });
  if (regRes.status !== 200) {
    throw new Error(`Project registration failed: ${regRes.raw}`);
  }
  const projectId = regRes.data.id;
  log("REGISTER", `Project registered successfully!`, `Project ID: ${projectId}`);

  // Step 3: Switch Daemon Watch Target
  log("DAEMON", `Switching live telemetry observation to ${DEMO_ROOT}...`);
  const watchRes = await apiRequest(DAEMON_BASE, "POST", "/watch", {
    root: DEMO_ROOT,
  });
  if (watchRes.status !== 200) {
    throw new Error(`Daemon watch switch failed: ${watchRes.raw}`);
  }
  log("DAEMON", `Daemon is now watching ${DEMO_ROOT}`, `Session ID: ${watchRes.data.session_id}`);

  await sleep(1500);

  // ── PHASE 1: BASELINE IMPLEMENTATION (HEALTHY) ──────────────────────────────
  log("PHASE 1", "Generating Project Baseline (Healthy Order & Auth Service)...");

  // requirements.txt
  writeFile(
    "requirements.txt",
    `fastapi>=0.110.0
uvicorn>=0.28.0
pydantic>=2.6.0
pytest>=8.0.0
pytest-asyncio>=0.23.0
httpx>=0.27.0
`,
  );

  // .gitignore
  writeFile(
    ".gitignore",
    `__pycache__/
*.py[cod]
*$py.class
.venv/
.pytest_cache/
.coverage
dist/
build/
`,
  );

  // README.md
  writeFile(
    "README.md",
    `# VORTEX-2026 Core Service

High-frequency order matching, authentication, and secure settlement service.

## Modules
- \`src/auth.py\`: JWT Token validation & role-based access control.
- \`src/orders.py\`: Order placement, state machine, and volume verification.
- \`src/payments.py\`: Idempotent settlement gateway.
- \`config/settings.py\`: Environment-driven typed configuration.
`,
  );

  // config/settings.py
  writeFile(
    "config/settings.py",
    `import os
from dataclasses import dataclass

@dataclass(frozen=True)
class ServiceConfig:
    environment: str = os.getenv("APP_ENV", "production")
    debug: bool = os.getenv("DEBUG", "false").lower() == "true"
    api_prefix: str = "/api/v1"
    database_url: str = os.getenv("DATABASE_URL", "sqlite:///./vortex.db")
    payment_gateway_url: str = os.getenv("PAYMENT_GATEWAY_URL", "https://api.vortex-settlement.internal")
    jwt_secret_key: str = os.getenv("JWT_SECRET_KEY", "default-dev-secret-key-change-in-prod")

config = ServiceConfig()
`,
  );

  // src/__init__.py
  writeFile("src/__init__.py", '"""VORTEX-2026 Core Package."""\n');

  // src/database.py
  writeFile(
    "src/database.py",
    `from typing import Any, Dict, Optional

class DatabaseClient:
    def __init__(self, connection_url: str) -> None:
        self.connection_url = connection_url
        self._connected = True
        self._store: Dict[str, Dict[str, Any]] = {"orders": {}, "users": {}}

    def get_order(self, order_id: str) -> Optional[Dict[str, Any]]:
        return self._store["orders"].get(order_id)

    def save_order(self, order_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        self._store["orders"][order_id] = data
        return data

    def is_healthy(self) -> bool:
        return self._connected

db = DatabaseClient("sqlite:///./vortex.db")
`,
  );

  // src/auth.py
  writeFile(
    "src/auth.py",
    `import hmac
import hashlib
from typing import Dict, Any, Optional

def verify_jwt_token(token: str, secret_key: str) -> Optional[Dict[str, Any]]:
    """Verify and decode authentication token claims."""
    if not token or not token.startswith("Bearer "):
        return None
    raw_jwt = token.replace("Bearer ", "").strip()
    parts = raw_jwt.split(".")
    if len(parts) != 3:
        return None
    # Simulated signature verification
    expected_sig = hmac.new(secret_key.encode(), parts[1].encode(), hashlib.sha256).hexdigest()[:16]
    if parts[2] == expected_sig:
        return {"sub": "trader-4412", "roles": ["order:create", "order:read"]}
    return None

def has_required_role(user: Dict[str, Any], role: str) -> bool:
    return role in user.get("roles", [])
`,
  );

  // src/orders.py
  writeFile(
    "src/orders.py",
    `import uuid
from typing import Dict, Any

class OrderService:
    @staticmethod
    def create_order(symbol: str, quantity: int, price: float, side: str) -> Dict[str, Any]:
        if quantity <= 0:
            raise ValueError("Quantity must be positive")
        if price <= 0.0:
            raise ValueError("Price must be positive")
        if side.upper() not in ("BUY", "SELL"):
            raise ValueError("Invalid order side")

        return {
            "order_id": str(uuid.uuid4()),
            "symbol": symbol.upper(),
            "quantity": quantity,
            "price": price,
            "side": side.upper(),
            "status": "PENDING_EXECUTION",
            "notional": round(quantity * price, 2),
        }
`,
  );

  // src/api.py
  writeFile(
    "src/api.py",
    `from typing import Dict, Any
from src.auth import verify_jwt_token
from src.orders import OrderService
from src.database import db
from config.settings import config

def handle_create_order(auth_header: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    user = verify_jwt_token(auth_header, config.jwt_secret_key)
    if not user:
        return {"error": "Unauthorized", "code": 401}
    order = OrderService.create_order(
        symbol=payload.get("symbol", "VORTEX"),
        quantity=payload.get("quantity", 10),
        price=payload.get("price", 100.0),
        side=payload.get("side", "BUY"),
    )
    db.save_order(order["order_id"], order)
    return {"status": "SUCCESS", "order": order}
`,
  );

  // tests/test_auth.py
  writeFile(
    "tests/test_auth.py",
    `from src.auth import verify_jwt_token, has_required_role

def test_auth_rejection():
    assert verify_jwt_token("", "secret") is None
    assert verify_jwt_token("InvalidToken", "secret") is None

def test_role_check():
    user = {"sub": "trader-1", "roles": ["order:create"]}
    assert has_required_role(user, "order:create") is True
    assert has_required_role(user, "admin") is False
`,
  );

  // tests/test_orders.py
  writeFile(
    "tests/test_orders.py",
    `import pytest
from src.orders import OrderService

def test_order_creation_valid():
    order = OrderService.create_order("BTC-USD", 2, 50000.0, "BUY")
    assert order["symbol"] == "BTC-USD"
    assert order["notional"] == 100000.0
    assert order["status"] == "PENDING_EXECUTION"

def test_order_creation_invalid():
    with pytest.raises(ValueError):
        OrderService.create_order("BTC-USD", -1, 50000.0, "BUY")
`,
  );

  log("PHASE 1", "Baseline files written. Waiting for daemon observation debouncer...");
  await sleep(3500);

  // ── PHASE 2: NORMAL FEATURE DEVELOPMENT (PAYMENTS & ARCHITECTURE) ───────────
  log("PHASE 2", "Developing Feature: Payment Gateway & Settlement Integration...");

  // docs/architecture.md
  writeFile(
    "docs/architecture.md",
    `# VORTEX-2026 Architecture Specification

## Flow
1. Client submits authenticated order via REST API.
2. Token verified against JWT authorization filter.
3. Order validated and placed in pending state.
4. Settlement initiated via Payment Gateway.
5. Transaction finalized and recorded in database.
`,
  );

  // src/payments.py (Healthy baseline)
  writeFile(
    "src/payments.py",
    `import os
import uuid
import logging
from typing import Dict, Any

logger = logging.getLogger("vortex.payments")

class PaymentGateway:
    def __init__(self, endpoint_url: str | None = None) -> None:
        self.endpoint_url = endpoint_url or "https://api.vortex-settlement.internal"
        # Environment-driven gateway token
        self.auth_token = os.getenv("PAYMENT_GATEWAY_TOKEN", "")

    def process_settlement(self, order_id: str, amount: float, currency: str = "USD") -> Dict[str, Any]:
        if amount <= 0:
            raise ValueError("Settlement amount must be positive")
        tx_id = f"tx_{uuid.uuid4().hex[:12]}"
        logger.info("Processing settlement %s for order %s (%s %s)", tx_id, order_id, amount, currency)
        return {
            "transaction_id": tx_id,
            "order_id": order_id,
            "amount": amount,
            "currency": currency,
            "status": "SETTLED",
        }
`,
  );

  // tests/test_payments.py
  writeFile(
    "tests/test_payments.py",
    `import pytest
from src.payments import PaymentGateway

def test_payment_settlement():
    gw = PaymentGateway("https://test.vortex.internal")
    res = gw.process_settlement("ord-1234", 250.0, "USD")
    assert res["status"] == "SETTLED"
    assert res["amount"] == 250.0

def test_payment_invalid_amount():
    gw = PaymentGateway("https://test.vortex.internal")
    with pytest.raises(ValueError):
        gw.process_settlement("ord-1234", -50.0)
`,
  );

  log("PHASE 2", "Feature files written. Waiting for daemon observation...");
  await sleep(3500);

  // ── PHASE 3: INTRODUCE CONTROLLED PROBLEM (SECURITY/QUALITY) ────────────────
  log(
    "PHASE 3",
    "Introducing controlled engineering issue: Unsafe credential hardcoding & Debug mode...",
  );

  // Accidentally hardcode high-entropy synthetic secret in payments.py and enable debug
  writeFile(
    "src/payments.py",
    `import os
import uuid
import logging
from typing import Dict, Any

logger = logging.getLogger("vortex.payments")

# ACCIDENTAL HARDCODED SECRET INTRODUCED DURING RUSHED INTEGRATION
# Synthetic high-entropy secret token (safe for demo, tests ML secret detection)
PAYMENT_GATEWAY_TOKEN = "sk_live_9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2"

class PaymentGateway:
    def __init__(self, endpoint_url: str | None = None) -> None:
        self.endpoint_url = endpoint_url or "https://api.vortex-settlement.internal"
        self.auth_token = PAYMENT_GATEWAY_TOKEN

    def process_settlement(self, order_id: str, amount: float, currency: str = "USD") -> Dict[str, Any]:
        if amount <= 0:
            raise ValueError("Settlement amount must be positive")
        tx_id = f"tx_{uuid.uuid4().hex[:12]}"
        logger.info("Processing settlement %s for order %s (%s %s)", tx_id, order_id, amount, currency)
        return {
            "transaction_id": tx_id,
            "order_id": order_id,
            "amount": amount,
            "currency": currency,
            "status": "SETTLED",
        }
`,
  );

  // Update config with unsafe debug mode
  writeFile(
    "config/settings.py",
    `import os
from dataclasses import dataclass

@dataclass(frozen=True)
class ServiceConfig:
    environment: str = os.getenv("APP_ENV", "production")
    # Unsafe debug configuration introduced
    debug: bool = True
    api_prefix: str = "/api/v1"
    database_url: str = os.getenv("DATABASE_URL", "sqlite:///./vortex.db")
    payment_gateway_url: str = os.getenv("PAYMENT_GATEWAY_URL", "https://api.vortex-settlement.internal")
    jwt_secret_key: str = os.getenv("JWT_SECRET_KEY", "default-dev-secret-key-change-in-prod")

config = ServiceConfig()
`,
  );

  log(
    "PHASE 3",
    "Issue files written. Allowing VibePulse daemon & ML analysis pipeline to observe and detect...",
  );
  await sleep(4500);

  // Verify finding was generated
  const secStatus = await apiRequest(API_BASE, "GET", `/api/projects/${projectId}/security`);
  const findingsCount = secStatus.data?.findings?.length || 0;
  log(
    "DETECTION",
    `Security finding evaluation: ${findingsCount} finding(s) recorded`,
    `Score: ${secStatus.data?.risk_explanation?.total_score || "N/A"}, Risk Level: ${secStatus.data?.risk_explanation?.risk_level || "LOW"}`,
  );
  if (findingsCount > 0) {
    for (const f of secStatus.data.findings) {
      log(
        "FINDING",
        `[${f.rule_id}] ${f.title} (${f.severity}) in ${f.file_path}:${f.line_number}`,
        `Evidence: ${f.redacted_evidence} [Source: ${f.detection_source}]`,
      );
    }
  }

  // ── PHASE 4: INVESTIGATION ──────────────────────────────────────────────────
  log("PHASE 4", "Developer notices security finding and performs investigation...");

  // Developer adds investigation logging and checks tests
  writeFile(
    "src/payments.py",
    `import os
import uuid
import logging
from typing import Dict, Any

logger = logging.getLogger("vortex.payments")

# INVESTIGATION IN PROGRESS: Developer reviewing credential exposure
# TODO SECURITY: Move credential to external environment manager
PAYMENT_GATEWAY_TOKEN = "sk_live_9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2"

class PaymentGateway:
    def __init__(self, endpoint_url: str | None = None) -> None:
        self.endpoint_url = endpoint_url or "https://api.vortex-settlement.internal"
        logger.warning("Verifying gateway credentials configuration...")
        self.auth_token = PAYMENT_GATEWAY_TOKEN

    def process_settlement(self, order_id: str, amount: float, currency: str = "USD") -> Dict[str, Any]:
        if amount <= 0:
            raise ValueError("Settlement amount must be positive")
        tx_id = f"tx_{uuid.uuid4().hex[:12]}"
        logger.info("Processing settlement %s for order %s (%s %s)", tx_id, order_id, amount, currency)
        return {
            "transaction_id": tx_id,
            "order_id": order_id,
            "amount": amount,
            "currency": currency,
            "status": "SETTLED",
        }
`,
  );

  await sleep(3500);

  // ── PHASE 5: REMEDIATION ────────────────────────────────────────────────────
  log(
    "PHASE 5",
    "Remediating: Removing hardcoded secret and restoring clean environment configuration...",
  );

  // Fix payments.py: clean environment retrieval
  writeFile(
    "src/payments.py",
    `import os
import uuid
import logging
from typing import Dict, Any

logger = logging.getLogger("vortex.payments")

class PaymentGateway:
    def __init__(self, endpoint_url: str | None = None) -> None:
        self.endpoint_url = endpoint_url or "https://api.vortex-settlement.internal"
        # REMEDIATED: Securely retrieve credential from environment
        self.auth_token = os.getenv("PAYMENT_GATEWAY_TOKEN", "")

    def process_settlement(self, order_id: str, amount: float, currency: str = "USD") -> Dict[str, Any]:
        if amount <= 0:
            raise ValueError("Settlement amount must be positive")
        tx_id = f"tx_{uuid.uuid4().hex[:12]}"
        logger.info("Processing settlement %s for order %s (%s %s)", tx_id, order_id, amount, currency)
        return {
            "transaction_id": tx_id,
            "order_id": order_id,
            "amount": amount,
            "currency": currency,
            "status": "SETTLED",
        }
`,
  );

  // Fix settings.py: disable debug mode
  writeFile(
    "config/settings.py",
    `import os
from dataclasses import dataclass

@dataclass(frozen=True)
class ServiceConfig:
    environment: str = os.getenv("APP_ENV", "production")
    # REMEDIATED: Strict debug check
    debug: bool = os.getenv("DEBUG", "false").lower() == "true"
    api_prefix: str = "/api/v1"
    database_url: str = os.getenv("DATABASE_URL", "sqlite:///./vortex.db")
    payment_gateway_url: str = os.getenv("PAYMENT_GATEWAY_URL", "https://api.vortex-settlement.internal")
    jwt_secret_key: str = os.getenv("JWT_SECRET_KEY", "default-dev-secret-key-change-in-prod")

config = ServiceConfig()
`,
  );

  // Add regression test to tests/test_payments.py
  writeFile(
    "tests/test_payments.py",
    `import os
import pytest
from src.payments import PaymentGateway

def test_payment_settlement():
    gw = PaymentGateway("https://test.vortex.internal")
    res = gw.process_settlement("ord-1234", 250.0, "USD")
    assert res["status"] == "SETTLED"
    assert res["amount"] == 250.0

def test_payment_invalid_amount():
    gw = PaymentGateway("https://test.vortex.internal")
    with pytest.raises(ValueError):
        gw.process_settlement("ord-1234", -50.0)

def test_no_hardcoded_token_in_source():
    """Security regression test: verify source file does not contain hardcoded secret."""
    source_path = os.path.join(os.path.dirname(__file__), "..", "src", "payments.py")
    with open(source_path, "r", encoding="utf-8") as f:
        content = f.read()
    assert "sk_live_" not in content, "Regression: hardcoded sk_live_ secret found in payments.py!"
`,
  );

  log("PHASE 5", "Remediation files written. Waiting for daemon observation...");
  await sleep(3500);

  // ── PHASE 6: POST-REMEDIATION DEVELOPMENT ───────────────────────────────────
  log("PHASE 6", "Post-remediation enhancements: Webhook signature & Idempotency cache...");

  // Enhance src/payments.py with webhook validation
  writeFile(
    "src/payments.py",
    `import os
import hmac
import hashlib
import uuid
import logging
from typing import Dict, Any

logger = logging.getLogger("vortex.payments")

class PaymentGateway:
    def __init__(self, endpoint_url: str | None = None) -> None:
        self.endpoint_url = endpoint_url or "https://api.vortex-settlement.internal"
        self.auth_token = os.getenv("PAYMENT_GATEWAY_TOKEN", "")

    def process_settlement(self, order_id: str, amount: float, currency: str = "USD") -> Dict[str, Any]:
        if amount <= 0:
            raise ValueError("Settlement amount must be positive")
        tx_id = f"tx_{uuid.uuid4().hex[:12]}"
        logger.info("Processing settlement %s for order %s (%s %s)", tx_id, order_id, amount, currency)
        return {
            "transaction_id": tx_id,
            "order_id": order_id,
            "amount": amount,
            "currency": currency,
            "status": "SETTLED",
        }

    @staticmethod
    def verify_webhook_signature(payload_bytes: bytes, signature: str, webhook_secret: str) -> bool:
        """Validate webhook HMAC SHA-256 signature for settlement notifications."""
        expected = hmac.new(webhook_secret.encode(), payload_bytes, hashlib.sha256).hexdigest()
        return hmac.compare_digest(expected, signature)
`,
  );

  // Update docs/architecture.md
  writeFile(
    "docs/architecture.md",
    `# VORTEX-2026 Architecture Specification

## Flow
1. Client submits authenticated order via REST API.
2. Token verified against JWT authorization filter.
3. Order validated and placed in pending state.
4. Settlement initiated via Payment Gateway.
5. Transaction finalized and recorded in database.

## Security Posture
- All credentials supplied via runtime environment configuration.
- Payment webhooks verified via HMAC-SHA256 signature.
- Strict session-isolated observation enforced by VibePulse.
`,
  );

  log("PHASE 6", "Post-remediation files written. Allowing telemetry to settle...");
  await sleep(4000);

  // Refresh project context and predictions
  log("INTELLIGENCE", "Refreshing project context memory & predictive intelligence...");
  await apiRequest(API_BASE, "POST", `/api/projects/${projectId}/context/refresh`);
  await apiRequest(API_BASE, "POST", `/api/projects/${projectId}/predictions/refresh`);
  await apiRequest(API_BASE, "POST", `/api/projects/${projectId}/health/refresh`);

  // ── PHASE 7: VERIFICATION AUDIT ─────────────────────────────────────────────
  log("AUDIT", "Performing complete intelligence pipeline verification...");

  const [projectRes, sessionsRes, healthRes, secRes, predRes, kgRes] = await Promise.all([
    apiRequest(API_BASE, "GET", `/api/projects/${projectId}`),
    apiRequest(API_BASE, "GET", `/api/projects/${projectId}/sessions`),
    apiRequest(API_BASE, "GET", `/api/projects/${projectId}/health`),
    apiRequest(API_BASE, "GET", `/api/projects/${projectId}/security`),
    apiRequest(API_BASE, "GET", `/api/projects/${projectId}/predictions`),
    apiRequest(API_BASE, "GET", `/api/projects/${projectId}/knowledge-graph`),
  ]);

  const sessionCount = sessionsRes.data?.sessions?.length || 0;
  const totalEvents =
    sessionsRes.data?.sessions?.reduce((acc, s) => acc + (s.event_count || 0), 0) || 0;

  console.log(
    `\n${BOLD}${GREEN}================================================================${RESET}`,
  );
  console.log(
    `${BOLD}${GREEN}         VIBEPULSE DEMO SCENARIO SUCCESSFULLY GENERATED         ${RESET}`,
  );
  console.log(
    `${BOLD}${GREEN}================================================================${RESET}\n`,
  );

  console.log(`Project Name    : ${projectRes.data?.display_name}`);
  console.log(`Project Root    : ${projectRes.data?.root_path}`);
  console.log(`Project ID      : ${projectId}`);
  console.log(`Sessions        : ${sessionCount} active observation session(s)`);
  console.log(`Total Events    : ${totalEvents} real observed filesystem events`);
  console.log(
    `Health Score    : ${healthRes.data?.overall_score ?? "Computed"} (${healthRes.data?.status ?? "Healthy"})`,
  );
  console.log(
    `Security Score  : ${secRes.data?.security_score ?? "N/A"} (Risk Level: ${secRes.data?.risk_level ?? "LOW"})`,
  );
  const finalFindingsCount = secRes.data?.findings?.length || 0;
  console.log(`Findings Count  : ${finalFindingsCount} finding(s) recorded`);
  console.log(
    `Predictions     : ${predRes.data?.total_predictions || 0} active signals / hotspots`,
  );
  console.log(
    `Knowledge Graph : ${kgRes.data?.nodes?.length || 0} nodes, ${kgRes.data?.edges?.length || 0} edges`,
  );

  // Test Copilot Grounding
  log("COPILOT", "Testing AI Engineering Copilot retrieval grounding...");
  const copilotRes = await apiRequest(
    API_BASE,
    "POST",
    `/api/projects/${projectId}/copilot/query`,
    {
      query: "What security issues have been observed in this project?",
    },
  );
  if (copilotRes.status === 200 && copilotRes.data) {
    console.log(`\n${BOLD}Copilot Response Summary:${RESET}`);
    console.log(`${CYAN}${copilotRes.data.summary}${RESET}\n`);
    console.log(`Intent          : ${copilotRes.data.intent}`);
    console.log(`Answerable      : ${copilotRes.data.answerable}`);
    console.log(`Observed Facts  : ${copilotRes.data.observed?.length || 0}`);
    for (const obs of (copilotRes.data.observed || []).slice(0, 4)) {
      console.log(`  ${GREEN}[OBSERVED]${RESET} ${obs.statement}`);
    }
    console.log(`Inferred Facts  : ${copilotRes.data.inferred?.length || 0}`);
    for (const inf of (copilotRes.data.inferred || []).slice(0, 3)) {
      console.log(`  ${YELLOW}[INFERRED]${RESET} ${inf.statement}`);
    }
    console.log(`Unknowns        : ${copilotRes.data.unknown?.length || 0}`);
    for (const unk of (copilotRes.data.unknown || []).slice(0, 2)) {
      console.log(`  ${GRAY}[UNKNOWN]${RESET} ${unk.statement}`);
    }
  }

  console.log(`\n${BOLD}Ready for Manual Browser Demonstration in VibePulse Dashboard!${RESET}\n`);
}

main().catch((err) => {
  console.error(`\n${RED}Orchestrator encountered an error:${RESET}`, err);
  process.exit(1);
});
