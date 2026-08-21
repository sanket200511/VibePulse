import { Routes, Route } from "react-router-dom";
import { AppLayout } from "./components/layout/AppLayout";
import { WorkspaceHomePage } from "./pages/workspace-home/WorkspaceHomePage";
import { ProjectsPage } from "./pages/projects/ProjectsPage";
import { ProjectStoryPage } from "./pages/projects/ProjectStoryPage";
import { EventsPage } from "./pages/events/EventsPage";
import { SessionsPage } from "./pages/sessions/SessionsPage";
import { SessionDetailsPage } from "./pages/sessions/SessionDetailsPage";
import { ReplayPage } from "./pages/sessions/ReplayPage";
import { NotFoundPage } from "./pages/not-found/NotFoundPage";
import { PresentationEngine } from "./components/presentation";
import { EngineeringDNAPage } from "./pages/projects/EngineeringDNAPage";
import { AIProvenancePage } from "./pages/projects/AIProvenancePage";
import { InvestigationPage } from "./pages/investigation/InvestigationPage";
import { SecurityCommandCenter } from "./pages/security/SecurityCommandCenter";
import { PredictionsPage } from "./pages/predictions/PredictionsPage";

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
    <PresentationEngine>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<WorkspaceHomePage />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/history" element={<SessionsPage />} />
          <Route path="/events" element={<EventsPage />} />
          <Route path="/investigation" element={<InvestigationPage />} />
          <Route path="/sessions/:sessionId" element={<SessionDetailsPage />} />
          <Route path="/sessions/:sessionId/replay" element={<ReplayPage />} />
          <Route path="/projects/:projectId" element={<ProjectStoryPage />} />
          <Route path="/projects/:projectId/story" element={<ProjectStoryPage />} />
          <Route path="/projects/:projectId/security" element={<SecurityCommandCenter />} />
          <Route path="/projects/:projectId/ai-provenance" element={<AIProvenancePage />} />
          <Route path="/projects/:projectId/investigation" element={<InvestigationPage />} />
          <Route path="/projects/:projectId/predictions" element={<PredictionsPage />} />
          <Route path="/projects/:projectId/files/*" element={<EngineeringDNAPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </PresentationEngine>
  );
}
