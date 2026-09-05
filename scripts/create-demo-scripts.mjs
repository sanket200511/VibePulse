import fs from "fs";
import path from "path";

const demoDir = "D:\\DepRadar-Seminar-Demo";

const resetScript = `Write-Host '=========================================' -ForegroundColor Cyan
Write-Host '  SECUREPAY SEMINAR DEMO — RESET SCRIPT   ' -ForegroundColor Cyan
Write-Host '=========================================' -ForegroundColor Cyan

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

$safeLines = @(
    'import os',
    '',
    'ENVIRONMENT = os.getenv("ENVIRONMENT", "development")',
    'DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///securepay.db")',
    'API_KEY = os.getenv("API_KEY", "demo-safe-key")',
    'MAX_PAYMENT_AMOUNT = 10000.00'
)

$settingsFile = Join-Path $scriptDir 'config\\settings.py'
$safeLines | Set-Content -Path $settingsFile -Encoding utf8
Write-Host '[PASS] Restored config/settings.py to safe baseline (no secrets present)' -ForegroundColor Green

if (Test-Path (Join-Path $scriptDir '.git')) {
    git reset --hard HEAD 2>$null
    git clean -fd 2>$null
    Write-Host '[PASS] Git working tree restored to clean baseline commit' -ForegroundColor Green
}

Write-Host ''
Write-Host '[PASS] Demo project is ready for a fresh live presentation!' -ForegroundColor Green
`;

const checkScript = `Write-Host '=========================================' -ForegroundColor Cyan
Write-Host '        SECUREPAY SEMINAR DEMO           ' -ForegroundColor Cyan
Write-Host '=========================================' -ForegroundColor Cyan

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$allPass = $true

function Test-Requirement($name, $condition) {
    if ($condition) {
        Write-Host "[PASS] $name" -ForegroundColor Green
    } else {
        Write-Host "[FAIL] $name" -ForegroundColor Red
        $script:allPass = $false
    }
}

Test-Requirement 'Project directory' (Test-Path $scriptDir)

$srcFiles = @('main.py', 'api.py', 'auth.py', 'payments.py', 'database.py', 'security.py')
$hasSrc = $true
foreach ($f in $srcFiles) {
    if (-not (Test-Path (Join-Path $scriptDir "src\\$f"))) { $hasSrc = $false }
}
Test-Requirement 'Source structure' $hasSrc

Test-Requirement 'Configuration' (Test-Path (Join-Path $scriptDir 'config\\settings.py'))

$hasTests = (Test-Path (Join-Path $scriptDir 'tests\\test_auth.py')) -and (Test-Path (Join-Path $scriptDir 'tests\\test_payments.py'))
Test-Requirement 'Tests' $hasTests

Test-Requirement 'Documentation' (Test-Path (Join-Path $scriptDir 'docs\\architecture.md'))

$settingsContent = Get-Content (Join-Path $scriptDir 'config\\settings.py') -Raw
$hasLiveSecret = $settingsContent -match 'VIBEPULSE_SEMINAR_FAKE_KEY_2026'
Test-Requirement 'Safe demo state (no secret in baseline)' (-not $hasLiveSecret)

Write-Host '=========================================' -ForegroundColor Cyan
if ($allPass) {
    Write-Host ' [✓] SECUREPAY DEMO IS 100% READY FOR SEMINAR ' -ForegroundColor Green
} else {
    Write-Host ' [!] Run .\\reset-demo.ps1 to reset demo baseline ' -ForegroundColor Yellow
}
Write-Host '=========================================' -ForegroundColor Cyan
`;

fs.writeFileSync(path.join(demoDir, "reset-demo.ps1"), resetScript, { encoding: "utf8" });
fs.writeFileSync(path.join(demoDir, "demo-check.ps1"), checkScript, { encoding: "utf8" });

console.log("Wrote scripts cleanly to " + demoDir);
