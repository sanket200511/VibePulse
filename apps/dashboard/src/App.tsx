import { Routes, Route } from "react-router-dom";
import { EventsPage } from "./pages/events/EventsPage";
import { NotFoundPage } from "./pages/not-found/NotFoundPage";

/**
 * Application router.
 *
 * Sprint 1 ships exactly one page: the Live Event Feed.
 *   /  → Live Event Feed
 *   *  → 404
 */
export default function App() {
  return (
    <Routes>
      <Route path="/" element={<EventsPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
