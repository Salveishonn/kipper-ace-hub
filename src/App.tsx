import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import CotizarPage from "./pages/Cotizar";
import LoginPage from "./pages/Login";
import ServiciosPage from "./pages/Servicios";
import NosotrosPage from "./pages/Nosotros";
import ContactoPage from "./pages/Contacto";
import ComunidadPage from "./pages/Comunidad";

// Portal
import PortalLayout from "./pages/portal/PortalLayout";
import PortalDashboard from "./pages/portal/PortalDashboard";
import PortalPolizas from "./pages/portal/PortalPolizas";
import PortalPagos from "./pages/portal/PortalPagos";
import PortalSiniestros from "./pages/portal/PortalSiniestros";
import PortalPerfil from "./pages/portal/PortalPerfil";

// Admin
import AdminLayout from "./pages/admin/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminLeads from "./pages/admin/AdminLeads";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public */}
            <Route path="/" element={<Index />} />
            <Route path="/servicios" element={<ServiciosPage />} />
            <Route path="/nosotros" element={<NosotrosPage />} />
            <Route path="/comunidad" element={<ComunidadPage />} />
            <Route path="/contacto" element={<ContactoPage />} />
            <Route path="/cotizar" element={<CotizarPage />} />
            <Route path="/login" element={<LoginPage />} />

            {/* Portal Cliente */}
            <Route path="/portal" element={<PortalLayout />}>
              <Route index element={<PortalDashboard />} />
              <Route path="polizas" element={<PortalPolizas />} />
              <Route path="pagos" element={<PortalPagos />} />
              <Route path="siniestros" element={<PortalSiniestros />} />
              <Route path="perfil" element={<PortalPerfil />} />
            </Route>

            {/* Admin */}
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboard />} />
              <Route path="leads" element={<AdminLeads />} />
            </Route>

            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
