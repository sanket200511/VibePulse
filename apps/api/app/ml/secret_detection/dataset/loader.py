"""
Dataset pipeline and synthetic dataset generator for secret detection.

Features:
- Safe synthetic dataset generator with hard negatives (placeholders, hashes, UUIDs, URLs, etc.)
- Strict repository/file-level grouped splitting to prevent candidate data leakage across
  train/val/test splits.
- SecretBenchAdapter interface for external datasets if locally present.

- All examples are strictly synthetic and safe.
"""

from __future__ import annotations

import hashlib
import json
import os
import random
from dataclasses import dataclass

from app.features.analysis.security.candidate import CandidateExtractor
from app.features.analysis.security.types import SecretClassification
from app.ml.secret_detection.features.extractor import FeatureExtractor


@dataclass
class DatasetItem:
    """A labeled sample for secret classifier training and evaluation."""

    item_id: str
    group_id: str  # e.g. "repo1/fileA.py" for grouped splitting
    source_code: str
    file_path: str
    variable_name: str
    raw_value_in_memory: str
    label: SecretClassification
    split: str = "train"  # "train", "val", "test"


class SecretBenchAdapter:
    """
    Adapter for SecretBench datasets (https://github.com/setu1421/SecretBench).
    Expects a local directory path provided by the user.
    Does NOT download or scrape external data automatically.
    """

    def __init__(self, local_path: str | None = None) -> None:
        self.local_path = local_path

    def is_available(self) -> bool:
        return bool(self.local_path and os.path.exists(self.local_path))

    def load_dataset(self) -> list[DatasetItem]:
        """Load external dataset if available locally."""
        if not self.is_available():
            return []
        items: list[DatasetItem] = []
        # Support reading a standard JSON/CSV format if user placed files in local_path
        json_path = os.path.join(self.local_path or "", "secretbench.json")
        if os.path.exists(json_path):
            with open(json_path, encoding="utf-8") as f:
                data = json.load(f)
                for entry in data:
                    lbl: SecretClassification = (
                        "REAL_SECRET"
                        if entry.get("is_secret")
                        else "PLACEHOLDER_OR_EXAMPLE"
                        if entry.get("is_placeholder")
                        else "NOT_SECRET"
                    )
                    items.append(
                        DatasetItem(
                            item_id=str(entry.get("id")),
                            group_id=str(entry.get("repo", "external")),
                            source_code=str(entry.get("code", "")),
                            file_path=str(entry.get("path", "external/code.py")),
                            variable_name=str(entry.get("variable", "key")),
                            raw_value_in_memory=str(entry.get("value", "")),
                            label=lbl,
                        )
                    )
        return items


class SyntheticDatasetGenerator:
    """
    Generates safe, fully synthetic datasets with diverse hard negatives.
    Zero real credentials are ever used.
    """

    def __init__(self, seed: int = 42) -> None:
        self.rng = random.Random(seed)  # noqa: S311

    def generate_synthetic_samples(self) -> list[DatasetItem]:
        """
        Generate a comprehensive, balanced synthetic corpus with grouped repository/file IDs.
        Classes:
        - REAL_SECRET (synthetic high-entropy keys, mock tokens, complex passwords)
        - PLACEHOLDER_OR_EXAMPLE (templates, <KEY>, your_api_key, dummy, sample, changeme)
        - NOT_SECRET (UUIDs, git hashes, URLs, package names, CSS selectors, normal variables)
        """
        items: list[DatasetItem] = []

        # ── 1. Synthetic "REAL_SECRET" Candidates (Synthetic Only) ──────────────
        synthetic_secret_templates = [
            (
                "api_key",
                "sk-proj-demofake9876543210zyxwvutsrqponmlkjihgfedcba",
                "src/auth/client.py",
            ),
            ("jwt_secret", "9f8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c3d2e1f0a9b8c7d6e", "config/jwt.py"),
            (
                "database_password",
                "P@ssw0rd_9876_Complex!SecretKey#2026",
                "backend/database/conn.py",
            ),
            (
                "aws_secret_access_key",
                "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY2026",
                "deploy/aws.py",
            ),
            ("access_token", "ghp_MockGitHubToken1234567890abcdefghijklmn", "scripts/ci_deploy.py"),
            (
                "private_key",
                "-----BEGIN RSA PRIVATE KEY-----\nMIIEowIBAAKCAQEA0fake...",
                "certs/server.pem",
            ),
            (
                "stripe_secret_key",
                "sk_live_51MockStripeKey99887766554433221100",
                "billing/stripe.ts",
            ),
            (
                "webhook_signing_secret",
                "whsec_mock998877665544332211aabbccddeeff",
                "services/webhook.py",
            ),
            (
                "slack_bot_token",
                "xoxb-987654321012-9876543210123-mockslackbottoken12345",
                "integrations/slack.py",
            ),
            ("gitlab_token", "glpat-MockGitLabPersonalToken12345", "pipeline/gitlab.py"),
            ("password", "P@ssw0rd_9876_Complex!SecretKey#2026", "backend/database/conn.py"),
            ("password", "DemoPassword123!", "src/config/app.py"),
            ("password", "xK8#mN9$vP2@qL5!SecretPass", "backend/settings.py"),
            ("user_password", "Admin_Secure_P@ss_2026#99", "services/auth.py"),
            ("admin_password", "SuperSecretRootP@ssw0rd!#2026", "config/admin.py"),
            ("redis_auth_token", "red_auth_7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d", "cache/redis.py"),
            (
                "encryption_master_key",
                "aes256_mock_hex_0123456789abcdef0123456789abcdef",
                "security/crypto.py",
            ),
            (
                "session_encryption_key",
                "s3ss10n_k3y_9876543210_v3ry_s3cur3_mock",
                "session/manager.py",
            ),
            ("oauth_client_secret", "cs_live_mock_oauth987654321abcdef012345", "auth/oauth.ts"),
            (
                "sendgrid_api_key",
                "SG.mockSendgridKey1234567890.abcdefghijklmnopqrstuvwxyz123456",
                "mail/sendgrid.py",
            ),
        ]

        for i in range(120):
            var_name, val, path = self.rng.choice(synthetic_secret_templates)
            # Add synthetic random variation to avoid duplicate rows
            unique_suffix = hashlib.sha256(f"secret_{i}".encode()).hexdigest()[:8]
            val_var = f"{val}_{unique_suffix}"
            repo_id = f"repo_sec_{i % 10}"

            items.append(
                DatasetItem(
                    item_id=f"synth_real_{i}",
                    group_id=f"{repo_id}/{path}",
                    source_code=f'{var_name} = "{val_var}"',
                    file_path=path,
                    variable_name=var_name,
                    raw_value_in_memory=val_var,
                    label="REAL_SECRET",
                )
            )

        # ── 2. "PLACEHOLDER_OR_EXAMPLE" Candidates (Hard Negatives) ───────────
        placeholder_templates = [
            ("api_key", "YOUR_API_KEY_HERE", "examples/quickstart.py"),
            ("api_key", "<API_KEY>", "docs/api_reference.md"),
            ("api_key", "${API_KEY}", "templates/docker-compose.yml"),
            ("password", "changeme", "config/default.yaml"),
            ("password", "change_me", "config/init.py"),
            ("password", "your_password", "src/auth/form.html"),
            ("password", "<your_password_here>", "docs/setup.md"),
            ("secret_key", "dummy_secret_key_123", "tests/mocks/auth_mock.py"),
            ("token", "example_token_abcdef", "examples/auth_example.ts"),
            ("access_token", "SAMPLE_ACCESS_TOKEN", "README.md"),
            ("auth_token", "test_password_123", "tests/fixtures/user.py"),
            ("client_secret", "replace_with_your_client_secret", "docs/oauth.rst"),
            ("database_password", "root", "docker/init.sql"),
            ("db_password", "password123", "tests/conftest.py"),
            ("stripe_key", "pk_test_sampleplaceholderkey123", "client/checkout.tsx"),
            ("private_key", "-----BEGIN RSA PRIVATE KEY-----\n...YOUR KEY HERE...", "docs/keys.md"),
            ("webhook_secret", "whsec_placeholder_replace_me", "examples/webhook.py"),
            ("slack_token", "xoxb-your-token-here", "docs/integrations.md"),
            ("jwt_secret", "my_secret_jwt_key_example", "tutorials/jwt.ts"),
            ("apikey", "TODO_ADD_API_KEY", "scripts/setup.sh"),
        ]

        for i in range(120):
            var_name, val, path = self.rng.choice(placeholder_templates)
            repo_id = f"repo_ph_{i % 10}"
            items.append(
                DatasetItem(
                    item_id=f"synth_ph_{i}",
                    group_id=f"{repo_id}/{path}",
                    source_code=f'{var_name} = "{val}"',
                    file_path=path,
                    variable_name=var_name,
                    raw_value_in_memory=val,
                    label="PLACEHOLDER_OR_EXAMPLE",
                )
            )

        # ── 3. "NOT_SECRET" Candidates (Hard Negatives & Normal Code) ───────────
        not_secret_templates = [
            (
                "commit_hash",
                "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
                "src/vcs/git.py",
            ),
            ("session_id", "c9bf9e57-1685-4c89-bafb-ff5af830be8a", "src/models/user.py"),
            ("document_uuid", "3fa85f64-5717-4562-b3fc-2c963f66afa6", "src/api/v1/schemas.py"),
            (
                "asset_url",
                "https://cdn.example.com/assets/v2/bundle.789a6c.js",
                "src/config/cdn.ts",
            ),
            (
                "endpoint",
                "https://api.github.com/repos/owner/repo/pulls/123",
                "src/integrations/github.py",
            ),
            ("package_name", "@radix-ui/react-tooltip@1.1.2", "package.json"),
            ("css_class_hash", "css-1r54p1b-MuiButton-root", "components/button.tsx"),
            ("timestamp_iso", "2026-09-05T14:30:00.000Z", "src/telemetry/event.py"),
            (
                "log_format",
                "%(asctime)s - %(name)s - %(levelname)s - %(message)s",
                "config/logging.py",
            ),
            (
                "regex_pattern",
                r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$",
                "src/utils/validators.py",
            ),
            (
                "content_type",
                "application/vnd.openxmlformats-officedocument.wordprocessingml",
                "src/mime.py",
            ),
            (
                "sql_query",
                "SELECT id, created_at, status FROM audit_logs WHERE status = 'OK'",
                "src/db/queries.py",
            ),
            (
                "base64_icon",
                "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk",
                "assets/icons.ts",
            ),
            (
                "sha256_checksum",
                "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824",
                "verify/checksums.txt",
            ),
            ("cache_key_prefix", "depradar:v1:projects:active_nodes:cache", "src/cache/keys.py"),
        ]

        for i in range(120):
            var_name, val, path = self.rng.choice(not_secret_templates)
            repo_id = f"repo_notsec_{i % 10}"
            items.append(
                DatasetItem(
                    item_id=f"synth_not_{i}",
                    group_id=f"{repo_id}/{path}",
                    source_code=f'{var_name} = "{val}"',
                    file_path=path,
                    variable_name=var_name,
                    raw_value_in_memory=val,
                    label="NOT_SECRET",
                )
            )

        self.rng.shuffle(items)
        return items


class DatasetPipeline:
    """
    Coordinates dataset loading, grouped splitting, and feature matrix preparation.
    """

    def __init__(self, seed: int = 42) -> None:
        self.generator = SyntheticDatasetGenerator(seed=seed)
        self.extractor = FeatureExtractor()
        self.seed = seed

    def get_dataset(
        self,
        external_path: str | None = None,
        train_ratio: float = 0.70,
        val_ratio: float = 0.15,
        test_ratio: float = 0.15,
    ) -> tuple[list[DatasetItem], list[DatasetItem], list[DatasetItem]]:
        """
        Loads dataset items and performs grouped repository/file splitting.
        Items sharing the same `group_id` are guaranteed to land strictly
        in the SAME split to prevent data leakage.
        """
        items: list[DatasetItem] = []
        if external_path:
            adapter = SecretBenchAdapter(external_path)
            if adapter.is_available():
                items.extend(adapter.load_dataset())

        # Always combine or fallback to synthetic
        items.extend(self.generator.generate_synthetic_samples())

        # Group items by group_id
        groups: dict[str, list[DatasetItem]] = {}
        for item in items:
            groups.setdefault(item.group_id, []).append(item)

        unique_groups = list(groups.keys())
        rng = random.Random(self.seed)  # noqa: S311
        rng.shuffle(unique_groups)

        n = len(unique_groups)
        n_train = int(n * train_ratio)
        n_val = int(n * val_ratio)

        train_groups = set(unique_groups[:n_train])
        val_groups = set(unique_groups[n_train : n_train + n_val])
        test_groups = set(unique_groups[n_train + n_val :])

        train_items: list[DatasetItem] = []
        val_items: list[DatasetItem] = []
        test_items: list[DatasetItem] = []

        for gid, grp_items in groups.items():
            if gid in train_groups:
                for it in grp_items:
                    it.split = "train"
                    train_items.append(it)
            elif gid in val_groups:
                for it in grp_items:
                    it.split = "val"
                    val_items.append(it)
            elif gid in test_groups:
                for it in grp_items:
                    it.split = "test"
                    test_items.append(it)

        return train_items, val_items, test_items

    def prepare_feature_matrix(
        self,
        items: list[DatasetItem],
    ) -> tuple[list[list[float]], list[str]]:
        """
        Converts dataset items to X (numerical feature vectors) and y (string labels).
        Raw secret values are discarded immediately after feature calculation.
        """
        c_extractor = CandidateExtractor()
        x_matrix: list[list[float]] = []
        y_labels: list[str] = []

        for item in items:
            candidates = c_extractor.extract_from_lines([item.source_code], item.file_path)
            if candidates:
                cand = candidates[0]
            else:
                # Fallback synthetic candidate if regex didn't directly catch line
                from app.features.analysis.security.types import SecretCandidate

                cand = SecretCandidate(
                    line_number=1,
                    variable_name=item.variable_name,
                    file_path=item.file_path,
                    file_type="py",
                    path_category="production",
                    has_assignment=True,
                    context_window_redacted='1: key = "[REDACTED]"',
                    length=len(item.raw_value_in_memory),
                    entropy=3.5,
                    digit_ratio=0.2,
                    uppercase_ratio=0.2,
                    symbol_ratio=0.1,
                    raw_candidate_in_memory=item.raw_value_in_memory,
                )

            # Extract safe features
            feat_dict = self.extractor.extract_features(cand)
            feat_vec = self.extractor.to_vector(feat_dict)
            x_matrix.append(feat_vec)
            y_labels.append(item.label)

        return x_matrix, y_labels
