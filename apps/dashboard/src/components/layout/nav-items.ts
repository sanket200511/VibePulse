import { FolderKanban, History, Home, Search } from "lucide-react";
import type { LucideIcon } from "lucide-react";

/**
 * The permanently stable anchor set from the Contextual Navigation model
 * (docs/design/PRODUCT_EXPERIENCE.md, Section 4). This list is intentionally
 * small and does not grow as features ship — Timeline, Replay, Reflection,
 * Health, and every future capability live as progressively-disclosed
 * sections within Session Detail, never as additional anchors here. Only
 * genuine peer, account-level destinations (Settings, Developer Profile) are
 * ever expected to join this set — see Section 7 of that document.
 */
export interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  /** Exact match required for `end` on <NavLink> — only Workspace Home needs this, since it lives at "/". */
  end?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { label: "Workspace Home", to: "/", icon: Home, end: true },
  { label: "Projects", to: "/projects", icon: FolderKanban },
  { label: "Investigation", to: "/investigation", icon: Search },
  { label: "History", to: "/history", icon: History },
];
