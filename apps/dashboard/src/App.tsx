import { Routes, Route } from "react-router-dom";
import { AppLayout } from "./components/layout/AppLayout";
import { WorkspaceHomePage } from "./pages/workspace-home/WorkspaceHomePage";
import { ProjectsPage } from "./pages/projects/ProjectsPage";
import { EventsPage } from "./pages/events/EventsPage";
import { SessionsPage } from "./pages/sessions/SessionsPage";
import { SessionDetailsPage } from "./pages/sessions/SessionDetailsPage";
import { NotFoundPage } from "./pages/not-found/NotFoundPage";

/**
 * Application router.
 *
 * Every route renders inside `AppLayout`, the persistent shell that hosts
 * the Contextual Navigation model's fixed anchor set (docs/design/PRODUCT_EXPERIENCE.md,
 * Section 4): Workspace Home, Projects, and History. `/events` and
 * `/sessions/:sessionId` are reached contextually — from Workspace Home or
 * from a row in History — never from the persistent anchor set itself.
 *
 *   /                     → Workspace Home    (anchor)
 *   /projects             → Projects          (anchor)
 *   /history              → Session History    (anchor; existing Sessions screen)
 *   /events               → Live Event Feed    (contextual, from Workspace Home)
 *   /sessions/:sessionId  → Session Detail
 *   *                     → 404
 */
export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<WorkspaceHomePage />} />
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/history" element={<SessionsPage />} />
        <Route path="/events" element={<EventsPage />} />
        <Route path="/sessions/:sessionId" element={<SessionDetailsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
