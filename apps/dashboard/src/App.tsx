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
import { EngineeringCommandCenter } from "./pages/command-center/EngineeringCommandCenter";
import { KnowledgeGraphPage } from "./pages/knowledge-graph/KnowledgeGraphPage";
import { CopilotPage } from "./pages/copilot/CopilotPage";
import { LoginPage } from "./pages/auth/LoginPage";
import { AuthProvider } from "./lib/auth-context";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";

/**
 * Application router.
 *
 * Routes are protected by `ProtectedRoute`. Unauthenticated visitors are
 * automatically redirected to `/login` to sign in or verify their account.
 */
export default function App() {
  return (
    <AuthProvider>
      <PresentationEngine>
        <Routes>
          {/* Public Authentication Route */}
          <Route path="/login" element={<LoginPage />} />

          {/* Protected Application Workspace */}
          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<WorkspaceHomePage />} />
            <Route path="/projects" element={<ProjectsPage />} />
            <Route path="/history" element={<SessionsPage />} />
            <Route path="/events" element={<EventsPage />} />
            <Route path="/investigation" element={<InvestigationPage />} />
            <Route path="/sessions/:sessionId" element={<SessionDetailsPage />} />
            <Route path="/sessions/:sessionId/replay" element={<ReplayPage />} />
            <Route path="/projects/:projectId" element={<ProjectStoryPage />} />
            <Route path="/projects/:projectId/story" element={<ProjectStoryPage />} />
            <Route
              path="/projects/:projectId/command-center"
              element={<EngineeringCommandCenter />}
            />
            <Route path="/projects/:projectId/knowledge-graph" element={<KnowledgeGraphPage />} />
            <Route path="/projects/:projectId/copilot" element={<CopilotPage />} />
            <Route path="/projects/:projectId/security" element={<SecurityCommandCenter />} />
            <Route path="/projects/:projectId/ai-provenance" element={<AIProvenancePage />} />
            <Route path="/projects/:projectId/investigation" element={<InvestigationPage />} />
            <Route path="/projects/:projectId/predictions" element={<PredictionsPage />} />
            <Route path="/projects/:projectId/files/*" element={<EngineeringDNAPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </PresentationEngine>
    </AuthProvider>
  );
}
