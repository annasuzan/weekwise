import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { SyncProvider } from "@/lib/SyncContext";
import Navbar from "@/components/Navbar";
import Index from "./pages/Index.tsx";
import UploadPage from "./pages/UploadPage.tsx";
import DashboardPage from "./pages/DashboardPage.tsx";
import NotFound from "./pages/NotFound.tsx";
import { EventProvider } from '@/lib/EventContext';

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <EventProvider>          {/* ← add */}
            <SyncProvider>
              <Navbar />
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/upload" element={
                  <ProtectedRoute><UploadPage /></ProtectedRoute>
                } />
                <Route path="/dashboard" element={
                  <ProtectedRoute><DashboardPage /></ProtectedRoute>
                } />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </SyncProvider>
          </EventProvider>         {/* ← add */}
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
