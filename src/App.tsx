import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Browse from "./pages/Browse";
import Search from "./pages/Search";
import Organizations from "./pages/Organizations";
import Conferences from "./pages/Conferences";
import ConferenceDetail from "./pages/ConferenceDetail";
import SessionLanding from "./pages/SessionLanding";
import SessionLive from "./pages/SessionLive";
import SessionReplay from "./pages/SessionReplay";
import SpeakerSessions from "./pages/SpeakerSessions";
import SessionAnalyticsPage from "./pages/SessionAnalyticsPage";
import RecordingTest from "./pages/RecordingTest";
import RecordedSessions from "./pages/RecordedSessions";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/browse" element={<Browse />} />
          <Route path="/search" element={<Search />} />
          <Route path="/organizations" element={<Organizations />} />
          <Route path="/conferences" element={<Conferences />} />
          <Route path="/conferences/:id" element={<ConferenceDetail />} />
          <Route path="/session/:id" element={<SessionLanding />} />
          <Route path="/session/:id/live" element={<SessionLive />} />
          <Route path="/session/:id/replay" element={<SessionReplay />} />
          <Route path="/session/:id/analytics" element={<SessionAnalyticsPage />} />
          <Route path="/speaker/sessions" element={<SpeakerSessions />} />
          <Route path="/recording-test" element={<RecordingTest />} />
          <Route path="/recorded-sessions" element={<RecordedSessions />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
