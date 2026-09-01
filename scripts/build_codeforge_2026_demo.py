import os
import sys
import time
import json
import subprocess
import urllib.request
import urllib.parse
import shutil

DEMO_ROOT = r"D:\CodeForge-2026-Demo"

def log(step: str, msg: str):
    print(f"[{step}] {msg}")

def ensure_dir(path: str):
    os.makedirs(path, exist_ok=True)

def write_file(rel_path: str, content: str):
    full_path = os.path.join(DEMO_ROOT, rel_path)
    ensure_dir(os.path.dirname(full_path))
    with open(full_path, "w", encoding="utf-8") as f:
        f.write(content.strip() + "\n")
    log("FILE", f"Updated {rel_path} ({os.path.getsize(full_path)} bytes)")
    time.sleep(0.35)

def register_project():
    log("REGISTER", f"Registering {DEMO_ROOT} with VibePulse Daemon (:5185)...")
    url = "http://localhost:5185/watch"
    payload = json.dumps({"root": DEMO_ROOT}).encode("utf-8")
    req = urllib.request.Request(url, data=payload, headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req) as resp:
            res = json.loads(resp.read().decode())
            log("REGISTER", f"Daemon status: {res.get('observing')} | Project ID: {res.get('project_id')} | Name: {res.get('project_name')}")
            return res.get("project_id")
    except Exception as e:
        log("ERROR", f"Failed to register project with daemon: {e}")
        return None

def run_phase_2_and_3():
    log("PHASE 2", "Creating D:\\CodeForge-2026-Demo codebase structure...")
    if os.path.exists(DEMO_ROOT):
        shutil.rmtree(DEMO_ROOT, ignore_errors=True)
    ensure_dir(DEMO_ROOT)
    ensure_dir(os.path.join(DEMO_ROOT, "src"))
    ensure_dir(os.path.join(DEMO_ROOT, "src", "services"))
    ensure_dir(os.path.join(DEMO_ROOT, "config"))
    ensure_dir(os.path.join(DEMO_ROOT, "tests"))
    ensure_dir(os.path.join(DEMO_ROOT, "docs"))

    pid = register_project()
    time.sleep(1.0)
    return pid

def run_phase_4_normal_dev():
    log("PHASE 4", "Executing healthy development sequence...")
    
    write_file(".gitignore", """
__pycache__/
*.pyc
.env
.venv/
.pytest_cache/
""")

    write_file("requirements.txt", """
fastapi>=0.110.0
uvicorn>=0.28.0
pydantic>=2.6.0
pytest>=8.0.0
""")

    write_file("README.md", """
# CodeForge-2026 Demo Application
Real-Time E-Commerce & Payment Gateway Microservice for CodeForge 2026 Hackathon.
""")

    write_file("config/settings.py", """
import os

APP_NAME = "CodeForge-2026 Payment Gateway"
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")
DEBUG = False

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./demo.db")
API_SECRET_KEY = os.getenv("API_SECRET_KEY", "default-dev-secret-key")
STRIPE_API_KEY = os.getenv("STRIPE_API_KEY", "")
""")

    write_file("src/database.py", """
import os

class DatabaseConnection:
    def __init__(self, db_url: str = None):
        self.db_url = db_url or os.getenv("DATABASE_URL", "sqlite:///./demo.db")
        self.connected = False

    def connect(self):
        self.connected = True
        return True

    def query(self, sql: str):
        if not self.connected:
            raise RuntimeError("Database not connected")
        return [{"id": 1, "status": "active"}]

db = DatabaseConnection()
""")

    write_file("src/auth.py", """
import os
import hmac
import hashlib

def generate_auth_token(user_id: str, secret_key: str = None) -> str:
    key = (secret_key or os.getenv("API_SECRET_KEY", "default-dev-secret-key")).encode()
    return hmac.new(key, user_id.encode(), hashlib.sha256).hexdigest()

def verify_token(token: str, user_id: str, secret_key: str = None) -> bool:
    expected = generate_auth_token(user_id, secret_key)
    return hmac.compare_digest(expected, token)
""")

    write_file("src/services/user_service.py", """
class UserService:
    def __init__(self):
        self.users = {}

    def register_user(self, email: str, name: str):
        user_id = f"usr_{len(self.users) + 1}"
        user = {"user_id": user_id, "email": email, "name": name}
        self.users[user_id] = user
        return user

    def get_user(self, user_id: str):
        return self.users.get(user_id)
""")

    write_file("src/services/order_service.py", """
class OrderService:
    def __init__(self):
        self.orders = []

    def create_order(self, user_id: str, items: list, amount: float):
        if amount <= 0:
            raise ValueError("Invalid order amount")
        order = {
            "order_id": f"ord_{len(self.orders) + 1}",
            "user_id": user_id,
            "items": items,
            "amount": amount,
            "status": "CREATED"
        }
        self.orders.append(order)
        return order
""")

    write_file("src/payments.py", """
import os

class PaymentProcessor:
    def __init__(self, api_key: str = None):
        self.api_key = api_key or os.getenv("STRIPE_API_KEY", "")

    def process_payment(self, order_id: str, amount: float) -> dict:
        if amount <= 0:
            return {"success": False, "error": "Amount must be greater than zero"}
        return {
            "success": True,
            "transaction_id": f"txn_{order_id}_processed",
            "amount": amount,
            "status": "PAID"
        }
""")

    write_file("src/api.py", """
from src.auth import generate_auth_token, verify_token
from src.services.user_service import UserService
from src.services.order_service import OrderService
from src.payments import PaymentProcessor

user_service = UserService()
order_service = OrderService()
payment_processor = PaymentProcessor()

def handle_checkout(user_id: str, items: list, amount: float, auth_token: str):
    if not verify_token(auth_token, user_id):
        return {"status": 401, "error": "Unauthorized"}
    
    order = order_service.create_order(user_id, items, amount)
    payment = payment_processor.process_payment(order["order_id"], amount)
    
    if payment["success"]:
        order["status"] = "COMPLETED"
    else:
        order["status"] = "FAILED"
        
    return {"status": 200, "order": order, "payment": payment}
""")

    write_file("src/main.py", """
from src.api import handle_checkout, user_service

def init_app():
    print("CodeForge-2026 Payment Gateway API Initialized")
    usr = user_service.register_user("demo@codeforge2026.com", "Hackathon Demo")
    return usr

if __name__ == "__main__":
    init_app()
""")

    write_file("tests/test_auth.py", """
from src.auth import generate_auth_token, verify_token

def test_token_generation_and_verification():
    token = generate_auth_token("usr_1", "test-secret")
    assert verify_token(token, "usr_1", "test-secret") is True

def test_invalid_token():
    assert verify_token("invalid-token-string", "usr_1") is False
""")

    write_file("tests/test_orders.py", """
import pytest
from src.services.order_service import OrderService

def test_create_order_success():
    svc = OrderService()
    order = svc.create_order("usr_1", [{"item": "laptop", "qty": 1}], 1200.0)
    assert order["status"] == "CREATED"
    assert order["amount"] == 1200.0

def test_invalid_order_amount():
    svc = OrderService()
    with pytest.raises(ValueError):
        svc.create_order("usr_1", [], 0.0)
""")

    write_file("tests/test_payments.py", """
from src.payments import PaymentProcessor

def test_payment_processing():
    processor = PaymentProcessor("test_key")
    res = processor.process_payment("ord_101", 250.0)
    assert res["success"] is True
    assert res["status"] == "PAID"
""")

    write_file("docs/architecture.md", """
# CodeForge-2026 System Architecture
The application is structured into decoupled components:
- `src/auth.py`: Cryptographic HMAC identity verification
- `src/payments.py`: Payment processor gateway integration
- `src/services/`: Core domain business logic (Users, Orders)
- `config/settings.py`: Central environment configuration
""")

def run_phase_5_and_6_security_incident():
    log("PHASE 5 & 6", "Introducing controlled security incident (demo secret leak & DEBUG=True)...")
    
    write_file("config/settings.py", """
import os

APP_NAME = "CodeForge-2026 Payment Gateway"
ENVIRONMENT = "development"

# SECURITY INCIDENT: Exposed hardcoded secret & DEBUG mode enabled
DEBUG = True
API_SECRET_KEY = "sk_live_demo_998877665544332211"
STRIPE_API_KEY = "sk_test_demo_fake_key_12345"
DATABASE_PASSWORD = "SuperSecretDbPassword2026!"
""")

    write_file("src/auth.py", """
import os
import hmac
import hashlib
from config.settings import API_SECRET_KEY

def generate_auth_token(user_id: str, secret_key: str = None) -> str:
    key = (secret_key or API_SECRET_KEY).encode()
    return hmac.new(key, user_id.encode(), hashlib.sha256).hexdigest()

def verify_token(token: str, user_id: str, secret_key: str = None) -> bool:
    expected = generate_auth_token(user_id, secret_key)
    return hmac.compare_digest(expected, token)
""")

    write_file("src/database.py", """
from config.settings import DATABASE_PASSWORD

class DatabaseConnection:
    def __init__(self, db_url: str = None, password: str = None):
        self.password = password or DATABASE_PASSWORD
        self.connected = False

    def connect(self):
        self.connected = True
        return True

db = DatabaseConnection()
""")

def run_phase_7_engineering_regression():
    log("PHASE 7", "Introducing controlled engineering regression in payments.py...")
    
    write_file("src/payments.py", """
from config.settings import STRIPE_API_KEY

class PaymentProcessor:
    def __init__(self, api_key: str = None):
        self.api_key = api_key or STRIPE_API_KEY

    def process_payment(self, order_id: str, amount: float) -> dict:
        if amount == 0:
            raise UnboundLocalError("Unprocessed zero amount transaction")
        return {
            "success": True,
            "transaction_id": f"txn_{order_id}_processed",
            "amount": amount,
            "status": "PAID"
        }
""")

def run_phase_9_remediation():
    log("PHASE 9", "Remediating security incident & engineering regression...")
    
    write_file("config/settings.py", """
import os

APP_NAME = "CodeForge-2026 Payment Gateway"
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")
DEBUG = os.getenv("DEBUG", "False").lower() in ("true", "1")

# REMEDIATION: Credentials loaded strictly from environment
API_SECRET_KEY = os.getenv("API_SECRET_KEY", "default-dev-secret-key")
STRIPE_API_KEY = os.getenv("STRIPE_API_KEY", "")
DATABASE_PASSWORD = os.getenv("DATABASE_PASSWORD", "")
""")

    write_file(".env.example", """
ENVIRONMENT=development
DEBUG=False
API_SECRET_KEY=
STRIPE_API_KEY=
DATABASE_PASSWORD=
DATABASE_URL=sqlite:///./demo.db
""")

    write_file(".gitignore", """
__pycache__/
*.pyc
.env
.env.local
.venv/
.pytest_cache/
""")

    write_file("src/payments.py", """
import os

class PaymentProcessor:
    def __init__(self, api_key: str = None):
        self.api_key = api_key or os.getenv("STRIPE_API_KEY", "")

    def process_payment(self, order_id: str, amount: float) -> dict:
        if amount <= 0:
            return {"success": False, "error": "Amount must be greater than zero"}
        return {
            "success": True,
            "transaction_id": f"txn_{order_id}_processed",
            "amount": amount,
            "status": "PAID"
        }
""")

def run_phase_10_tests():
    log("PHASE 10", "Running pytest unit suite on CodeForge-2026-Demo...")
    try:
        res = subprocess.run(
            [sys.executable, "-m", "pytest", os.path.join(DEMO_ROOT, "tests")],
            cwd=DEMO_ROOT,
            capture_output=True,
            text=True
        )
        log("TESTS", f"Pytest exit code: {res.returncode}")
        print(res.stdout)
        if res.stderr:
            print(res.stderr)
        return res.returncode == 0
    except Exception as e:
        log("ERROR", f"Failed to execute pytest: {e}")
        return False

def run_phase_11_post_remediation():
    log("PHASE 11", "Adding post-remediation development telemetry...")
    
    write_file("tests/test_security_config.py", """
import os
from config.settings import DEBUG, API_SECRET_KEY

def test_debug_mode_disabled():
    assert DEBUG is False

def test_secret_key_from_env():
    assert API_SECRET_KEY != "sk_live_demo_998877665544332211"
""")

    write_file("docs/architecture.md", """
# CodeForge-2026 System Architecture & Remediation Log

## Security Remediation Audit
- `SEC001`: Removed hardcoded `API_SECRET_KEY`, `STRIPE_API_KEY`, and `DATABASE_PASSWORD`.
- `DEBUG_TRUE`: Disabled global debug flag (`DEBUG = False`).
- Environment Config: Hardened via `.env.example` placeholders and `os.getenv()` dynamic loading.
- Regression Fix: Added validation guards in `src/payments.py`.
""")

    write_file("docs/CODEFORGE_2026_DEVELOPMENT_SCENARIO.md", """
# CodeForge-2026 Live Development Scenario Notes

## 🎯 Development Timeline
1. **Initial Creation**: Microservice structure (`src/`, `config/`, `tests/`, `docs/`).
2. **Normal Feature Development**: User service, order service, HMAC auth, payment gateway.
3. **Controlled Security Mistake**: `config/settings.py` updated with hardcoded demo credentials and `DEBUG = True`.
4. **Engineering Activity**: `src/auth.py`, `src/database.py`, and `src/payments.py` modified around incident.
5. **Remediation**: `settings.py` refactored to use `os.getenv()`, `.env.example` created, `.gitignore` hardened.
6. **Post-Fix Development**: Added `test_security_config.py` and updated architecture remediation audit.

## 📺 Suggested Browser Demonstration Sequence (User Manual Steps)
1. **Project Story**: Navigate to `http://localhost:5183/projects/76727948-7562-43a9-8ecc-68eb4cec68e8` (or target project).
2. **Correlation & Causality Graph**:
   - Focus on `settings.py` or `SEC001`.
   - Click **Trace Root Cause** to walk step-by-step from raw file edit → finding → incident.
   - Click **Trace Impact** to walk downstream blast radius.
   - Toggle **Fullscreen Mode** (`F` key) and test cursor-centered zoom and Spacebar pan.
3. **Before / After Audit**: Click **Before / After** view toggle to present verified remediation posture.
""")

def main():
    log("START", "Starting CodeForge-2026-Demo development pipeline...")
    pid = run_phase_2_and_3()
    run_phase_4_normal_dev()
    
    time.sleep(1.0)
    run_phase_5_and_6_security_incident()
    run_phase_7_engineering_regression()
    
    log("TELEMETRY", "Waiting 2.5 seconds for daemon observation & correlation engine...")
    time.sleep(2.5)
    
    run_phase_9_remediation()
    run_phase_10_tests()
    run_phase_11_post_remediation()
    
    log("DONE", "CodeForge-2026-Demo telemetry scenario complete!")

if __name__ == "__main__":
    main()
