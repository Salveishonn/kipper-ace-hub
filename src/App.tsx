import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/auth/ProtectedRoute";

// Public pages
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import CotizarPage from "./pages/Cotizar";
import LoginPage from "./pages/Login";
import RegistroPage from "./pages/Registro";
import ServiciosPage from "./pages/Servicios";
import NosotrosPage from "./pages/Nosotros";
import ContactoPage from "./pages/Contacto";
import ComunidadPage from "./pages/Comunidad";

// Portal (Client)
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

// Productor
import ProductorLayout from "./pages/productor/ProductorLayout";
import ProductorDashboard from "./pages/productor/ProductorDashboard";
import ProductorLeads from "./pages/productor/ProductorLeads";
import ProductorClientes from "./pages/productor/ProductorClientes";
import ProductorPolizas from "./pages/productor/ProductorPolizas";
import ProductorSiniestros from "./pages/productor/ProductorSiniestros";
import ProductorPerfil from "./pages/productor/ProductorPerfil";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* ============ PUBLIC ROUTES ============ */}
            <Route path="/" element={<Index />} />
            <Route path="/servicios" element={<ServiciosPage />} />
            <Route path="/nosotros" element={<NosotrosPage />} />
            <Route path="/comunidad" element={<ComunidadPage />} />
            <Route path="/contacto" element={<ContactoPage />} />
            <Route path="/cotizar" element={<CotizarPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/registro" element={<RegistroPage />} />

            {/* ============ CLIENT PORTAL (/portal) ============ */}
            <Route path="/portal" element={
              <ProtectedRoute allowedRoles={['admin', 'productor', 'cliente']}>
                <PortalLayout />
              </ProtectedRoute>
            }>
              <Route index element={<PortalDashboard />} />
              <Route path="polizas" element={<PortalPolizas />} />
              <Route path="pagos" element={<PortalPagos />} />
              <Route path="siniestros" element={<PortalSiniestros />} />
              <Route path="perfil" element={<PortalPerfil />} />
            </Route>

            {/* ============ PRODUCTOR PORTAL (/productor) ============ */}
            <Route path="/productor" element={
              <ProtectedRoute allowedRoles={['admin', 'productor']}>
                <ProductorLayout />
              </ProtectedRoute>
            }>
              <Route index element={<ProductorDashboard />} />
              <Route path="leads" element={<ProductorLeads />} />
              <Route path="clientes" element={<ProductorClientes />} />
              <Route path="polizas" element={<ProductorPolizas />} />
              <Route path="siniestros" element={<ProductorSiniestros />} />
              <Route path="perfil" element={<ProductorPerfil />} />
            </Route>

            {/* ============ ADMIN PORTAL (/admin) ============ */}
            <Route path="/admin" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminLayout />
              </ProtectedRoute>
            }>
              <Route index element={<AdminDashboard />} />
              <Route path="leads" element={<AdminLeads />} />
              {/* Placeholder routes - redirect to dashboard for now */}
              <Route path="clientes" element={<AdminDashboard />} />
              <Route path="productores" element={<AdminDashboard />} />
              <Route path="polizas" element={<AdminDashboard />} />
              <Route path="contacts" element={<AdminDashboard />} />
              <Route path="blog" element={<AdminDashboard />} />
              <Route path="config" element={<AdminDashboard />} />
            </Route>

            {/* ============ LEGACY REDIRECTS ============ */}
            <Route path="/app" element={<Navigate to="/portal" replace />} />
            <Route path="/app/*" element={<Navigate to="/portal" replace />} />
            <Route path="/dashboard" element={<Navigate to="/portal" replace />} />

            {/* ============ 404 ============ */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
