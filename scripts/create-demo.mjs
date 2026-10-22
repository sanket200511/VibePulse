import fs from "fs";
import path from "path";

const base = "D:\\VibePulse-Seminar-Demo";

const dirs = [
  base,
  path.join(base, "config"),
  path.join(base, "src"),
  path.join(base, "tests"),
  path.join(base, "docs"),
];

for (const d of dirs) {
  fs.mkdirSync(d, { recursive: true });
}

fs.writeFileSync(
  path.join(base, "README.md"),
  `# SecurePay API

A modern, lightweight payment gateway service built with FastAPI and PostgreSQL.

## Features
- Token-based Authentication (HMAC/JWT)
- Idempotent Payment Processing
- Secure Audit Logging & Risk Assessment
- Automated Unit & Security Tests
`,
);

fs.writeFileSync(
  path.join(base, "requirements.txt"),
  `fastapi>=0.115.0
uvicorn>=0.30.0
pydantic>=2.8.0
sqlalchemy>=2.0.0
pytest>=8.0.0
`,
);

fs.writeFileSync(
  path.join(base, ".gitignore"),
  `__pycache__/
*.pyc
.env
.pytest_cache/
`,
);

fs.writeFileSync(
  path.join(base, ".env.example"),
  `ENVIRONMENT=development
DATABASE_URL=postgresql://user:pass@localhost:5432/securepay
API_KEY=your_api_key_here
`,
);

fs.writeFileSync(
  path.join(base, "config", "__init__.py"),
  `# Configuration package
`,
);

fs.writeFileSync(
  path.join(base, "config", "settings.py"),
  `import os

ENVIRONMENT = os.getenv("ENVIRONMENT", "development")
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///securepay.db")
API_KEY = os.getenv("API_KEY", "demo-safe-key")
MAX_PAYMENT_AMOUNT = 10000.00
`,
);

fs.writeFileSync(
  path.join(base, "src", "__init__.py"),
  `# SecurePay source package
`,
);

fs.writeFileSync(
  path.join(base, "src", "main.py"),
  `from fastapi import FastAPI
from src.api import router

app = FastAPI(title="SecurePay API", version="1.0.0")
app.include_router(router, prefix="/api/v1")

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "securepay"}
`,
);

fs.writeFileSync(
  path.join(base, "src", "database.py"),
  `from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from config.settings import DATABASE_URL

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()
`,
);

fs.writeFileSync(
  path.join(base, "src", "auth.py"),
  `import hashlib
import hmac

def verify_signature(payload: str, secret: str, signature: str) -> bool:
    expected = hmac.new(secret.encode(), payload.encode(), hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature)
`,
);

fs.writeFileSync(
  path.join(base, "src", "payments.py"),
  `import uuid
from config.settings import MAX_PAYMENT_AMOUNT

def process_payment(amount: float, currency: str = "USD") -> dict:
    if amount <= 0:
        raise ValueError("Amount must be positive")
    if amount > MAX_PAYMENT_AMOUNT:
        raise ValueError("Amount exceeds per-transaction limit")
    return {
        "transaction_id": str(uuid.uuid4()),
        "status": "SUCCESS",
        "amount": amount,
        "currency": currency,
    }
`,
);

fs.writeFileSync(
  path.join(base, "src", "security.py"),
  `import re

def sanitize_card_number(card_number: str) -> str:
    digits = re.sub(r"\\D", "", card_number)
    if len(digits) < 4:
        return "****"
    return f"****-****-****-{digits[-4:]}"
`,
);

fs.writeFileSync(
  path.join(base, "src", "api.py"),
  `from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from src.payments import process_payment
from src.security import sanitize_card_number

router = APIRouter()

class PaymentRequest(BaseModel):
    amount: float
    currency: str = "USD"
    card_number: str

@router.post("/payments")
def create_payment(req: PaymentRequest):
    try:
        result = process_payment(req.amount, req.currency)
        result["card_masked"] = sanitize_card_number(req.card_number)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
`,
);

fs.writeFileSync(
  path.join(base, "tests", "__init__.py"),
  `# Tests package
`,
);

fs.writeFileSync(
  path.join(base, "tests", "test_auth.py"),
  `from src.auth import verify_signature

def test_verify_signature():
    assert verify_signature("data", "secret", "2bb80d537b1da3e38bd30361aa855686bde0eacd7162fef6a25fe97bf527a25b")
`,
);

fs.writeFileSync(
  path.join(base, "tests", "test_payments.py"),
  `import pytest
from src.payments import process_payment

def test_process_payment_success():
    res = process_payment(150.00)
    assert res["status"] == "SUCCESS"
    assert res["amount"] == 150.00

def test_process_payment_invalid_amount():
    with pytest.raises(ValueError):
        process_payment(-10)
`,
);

fs.writeFileSync(
  path.join(base, "docs", "architecture.md"),
  `# SecurePay Architecture

## Overview
SecurePay is a modular Python API for micro-transaction settlement.

\`\`\`mermaid
graph LR
  Client --> FastAPI[FastAPI Router]
  FastAPI --> Auth[Auth & Signature]
  FastAPI --> Payments[Payment Engine]
  FastAPI --> Sec[Card Masking & Security]
\`\`\`
`,
);

console.log("SecurePay API project files created successfully in " + base);
