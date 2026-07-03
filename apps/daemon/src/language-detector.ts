/**
 * Maps a file extension to a human-readable language name.
 *
 * Deliberately a flat lookup table, not a library dependency — Sprint 1
 * only needs "what language is this" for the dashboard's Language column.
 */

const EXTENSION_TO_LANGUAGE: Record<string, string> = {
  ".ts": "TypeScript",
  ".tsx": "TypeScript",
  ".js": "JavaScript",
  ".jsx": "JavaScript",
  ".mjs": "JavaScript",
  ".cjs": "JavaScript",
  ".py": "Python",
  ".pyi": "Python",
  ".go": "Go",
  ".rs": "Rust",
  ".java": "Java",
  ".kt": "Kotlin",
  ".rb": "Ruby",
  ".php": "PHP",
  ".c": "C",
  ".h": "C",
  ".cpp": "C++",
  ".hpp": "C++",
  ".cs": "C#",
  ".swift": "Swift",
  ".css": "CSS",
  ".scss": "SCSS",
  ".html": "HTML",
  ".json": "JSON",
  ".yaml": "YAML",
  ".yml": "YAML",
  ".toml": "TOML",
  ".md": "Markdown",
  ".sql": "SQL",
  ".sh": "Shell",
  ".dockerfile": "Dockerfile",
};

export function detectLanguage(fileExtension: string | undefined): string | undefined {
  if (!fileExtension) return undefined;
  return EXTENSION_TO_LANGUAGE[fileExtension.toLowerCase()];
}
