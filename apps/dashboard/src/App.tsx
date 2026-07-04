import { Routes, Route } from "react-router-dom";
import { EventsPage } from "./pages/events/EventsPage";
import { SessionsPage } from "./pages/sessions/SessionsPage";
import { NotFoundPage } from "./pages/not-found/NotFoundPage";

/**
 * Application router.
 *
 *   /          → Live Event Feed
 *   /sessions  → Sessions (Sprint 3 – Session Intelligence)
 *   *          → 404
 */
export default function App() {
  return (
    <Routes>
      <Route path="/" element={<EventsPage />} />
      <Route path="/sessions" element={<SessionsPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
