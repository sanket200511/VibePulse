import fs from "fs";
import path from "path";

const base = "D:\\VibePulse-Seminar-Demo";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  console.log("Starting realistic development telemetry for SecurePay API in " + base);

  // 1. Edit src/auth.py
  console.log("1. Enhancing src/auth.py...");
  fs.appendFileSync(
    path.join(base, "src", "auth.py"),
    `\ndef generate_hmac_token(user_id: str, secret: str) -> str:\n    """Generate a cryptographic session token."""\n    return hmac.new(secret.encode(), f"user:{user_id}".encode(), hashlib.sha256).hexdigest()\n`,
  );
  await sleep(1500);

  // 2. Edit src/payments.py
  console.log("2. Adding refund support to src/payments.py...");
  fs.appendFileSync(
    path.join(base, "src", "payments.py"),
    `\ndef process_refund(transaction_id: str, amount: float) -> dict:\n    """Process an idempotent refund request."""\n    if amount <= 0:\n        raise ValueError("Refund amount must be positive")\n    return {\n        "refund_id": str(uuid.uuid4()),\n        "original_transaction_id": transaction_id,\n        "status": "REFUNDED",\n        "refund_amount": amount\n    }\n`,
  );
  await sleep(1500);

  // 3. Edit src/database.py
  console.log("3. Enhancing src/database.py...");
  fs.appendFileSync(
    path.join(base, "src", "database.py"),
    `\ndef ping_database() -> bool:\n    """Ping database connection pool."""\n    try:\n        with engine.connect() as conn:\n            conn.execute("SELECT 1")\n        return True\n    except Exception:\n        return False\n`,
  );
  await sleep(1500);

  // 4. Edit src/api.py
  console.log("4. Adding refund endpoint to src/api.py...");
  fs.appendFileSync(
    path.join(base, "src", "api.py"),
    `\nclass RefundRequest(BaseModel):\n    transaction_id: str\n    amount: float\n\n@router.post("/refunds")\ndef create_refund(req: RefundRequest):\n    try:\n        return process_refund(req.transaction_id, req.amount)\n    except ValueError as e:\n        raise HTTPException(status_code=400, detail=str(e))\n`,
  );
  await sleep(1500);

  // 5. Edit tests/test_payments.py
  console.log("5. Adding test cases in tests/test_payments.py...");
  fs.appendFileSync(
    path.join(base, "tests", "test_payments.py"),
    `\nfrom src.payments import process_refund\n\ndef test_process_refund():\n    res = process_refund("tx-12345", 50.00)\n    assert res["status"] == "REFUNDED"\n    assert res["refund_amount"] == 50.00\n`,
  );
  await sleep(1500);

  // 6. Security Event — Controlled Fake Secret in config/settings.py
  console.log("6. Security signal: Introducing controlled fake key in config/settings.py...");
  fs.writeFileSync(
    path.join(base, "config", "settings.py"),
    `import os

ENVIRONMENT = os.getenv("ENVIRONMENT", "development")
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///securepay.db")
MAX_PAYMENT_AMOUNT = 10000.00

# Security-sensitive configuration (Fake key for demonstration)
API_KEY = "VIBEPULSE_SEMINAR_FAKE_KEY_2026"
SECRET_KEY = "VIBEPULSE_SEMINAR_FAKE_SECRET_2026"
`,
  );
  await sleep(2500);

  // 7. Edit src/security.py
  console.log("7. Enhancing card masking in src/security.py...");
  fs.appendFileSync(
    path.join(base, "src", "security.py"),
    `\ndef validate_luhn_checksum(card_number: str) -> bool:\n    """Validate credit card using Luhn algorithm."""\n    digits = [int(c) for c in re.sub(r"\\D", "", card_number)]\n    if not digits:\n        return False\n    checksum = 0\n    reverse_digits = digits[::-1]\n    for i, d in enumerate(reverse_digits):\n        if i % 2 == 1:\n            d *= 2\n            if d > 9:\n                d -= 9\n        checksum += d\n    return checksum % 10 == 0\n`,
  );
  await sleep(1500);

  // 8. Update docs/architecture.md
  console.log("8. Updating docs/architecture.md...");
  fs.appendFileSync(
    path.join(base, "docs", "architecture.md"),
    `\n## Security and Compliance\n- Tokenized HMAC signatures for all mutating calls\n- Zero raw PAN storage (masked at boundary)\n- Security audit event logging enabled\n`,
  );
  await sleep(1500);

  console.log("Development telemetry generation complete!");
}

main().catch(console.error);
