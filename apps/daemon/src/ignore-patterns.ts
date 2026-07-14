/**
 * Consolidated filesystem ignore patterns for the daemon watcher.
 *
 * Passed directly to Chokidar's `ignored` option. All filtering happens
 * at the OS watcher layer — events matching these patterns never enter
 * the normaliser or the rest of the pipeline.
 *
 * Patterns are grouped into three categories:
 *   - Noise:    build artefacts, caches, lock files, and IDE metadata
 *   - Privacy:  credential files and secrets (best-effort, not a security boundary)
 *   - Binary:   non-text file extensions that carry no useful signal
 *
 * NOTE: .vscode/ is intentionally NOT ignored. VSCode workspace configuration
 * (launch.json, tasks.json, settings.json) represents intentional developer
 * decisions and is visible in the Timeline by design (ADR-0012 §8).
 */

export const IGNORED_PATTERNS: readonly RegExp[] = [
  // ── Noise: dependency and build artefacts ────────────────────────────────
  /node_modules/,
  /\.git/,
  /dist/,
  /build/,
  /coverage/,
  /\.turbo/,
  /__pycache__/,
  /\.venv/,
  /venv/,
  /\.uv/,
  /\.next/,
  /\.nuxt/,

  // ── Noise: caches and IDE metadata ───────────────────────────────────────
  /\.DS_Store/,
  /Thumbs\.db/,
  /\.idea/,
  /\.mypy_cache/,
  /\.pytest_cache/,
  /\.ruff_cache/,

  // ── Noise: editor swap files, logs, and lock files ───────────────────────
  /\.(swp|swo)$/,
  /~$/,
  /\.log$/,
  /\.lock$/,

  // ── Privacy: credential and secret files (best-effort) ───────────────────
  /\.env(\.|$)/, // .env, .env.local, .env.production, …
  /\.ssh/,
  /\.gnupg/,
  /\.pem$/,
  /\.key$/,
  /id_rsa/,
  /secrets?\./,

  // ── Binary: image formats ─────────────────────────────────────────────────
  /\.(png|jpe?g|gif|webp|svg|ico|bmp|tiff?)$/i,

  // ── Binary: documents and archives ───────────────────────────────────────
  /\.(pdf|docx?|xlsx?|pptx?)$/i,
  /\.(zip|tar|gz|bz2|7z|rar)$/i,

  // ── Binary: media ─────────────────────────────────────────────────────────
  /\.(mp[34]|wav|ogg|flac|aac)$/i,
  /\.(mp4|mkv|avi|mov|webm)$/i,

  // ── Binary: fonts and native libraries ────────────────────────────────────
  /\.(ttf|woff2?|eot|otf)$/i,
  /\.(exe|dll|so|dylib|lib|a)$/i,

  // ── Binary: database files ────────────────────────────────────────────────
  /\.(db|sqlite|sqlite3)$/i,
];
