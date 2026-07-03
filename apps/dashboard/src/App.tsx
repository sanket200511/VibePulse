import { Routes, Route } from "react-router-dom";
import { DashboardPage } from "./pages/dashboard/DashboardPage";
import { NotFoundPage } from "./pages/not-found/NotFoundPage";

/**
 * Application router.
 *
 * Route structure follows feature-first organisation:
 *   /          → Dashboard overview
 *   /sessions  → Session replay (Sprint 2)
 *   /health    → Project health (Sprint 2)
 *   /settings  → Settings (Sprint 3)
 *   *          → 404
 */
export default function App() {
  return (
    <Routes>
      <Route path="/" element={<DashboardPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
