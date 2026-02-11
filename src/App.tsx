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
import AcademyPage from "./pages/Academy";
import AcademyContenido from "./pages/academy/AcademyContenido";
import AcademyLesson from "./pages/academy/AcademyLesson";
import SumatePage from "./pages/Sumate";

// Portal (Client)
import PortalLayout from "./pages/portal/PortalLayout";
import PortalDashboard from "./pages/portal/PortalDashboard";
import PortalPolizas from "./pages/portal/PortalPolizas";
import PortalPagos from "./pages/portal/PortalPagos";
import PortalSiniestros from "./pages/portal/PortalSiniestros";
import PortalPerfil from "./pages/portal/PortalPerfil";
import PortalSolicitudes from "./pages/portal/PortalSolicitudes";

// Admin
import AdminLayout from "./pages/admin/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminLeads from "./pages/admin/AdminLeads";
import AdminClientes from "./pages/admin/AdminClientes";
import AdminProductores from "./pages/admin/AdminProductores";
import AdminPolizas from "./pages/admin/AdminPolizas";
import AdminContacts from "./pages/admin/AdminContacts";
import AdminSiniestros from "./pages/admin/AdminSiniestros";
import AdminPagos from "./pages/admin/AdminPagos";
import AdminSolicitudes from "./pages/admin/AdminSolicitudes";
import AdminBlog from "./pages/admin/AdminBlog";
import AdminConfig from "./pages/admin/AdminConfig";
import AdminAcademy from "./pages/admin/AdminAcademy";

// Productor
import ProductorLayout from "./pages/productor/ProductorLayout";
import ProductorDashboard from "./pages/productor/ProductorDashboard";
import ProductorLeads from "./pages/productor/ProductorLeads";
import ProductorClientes from "./pages/productor/ProductorClientes";
import ProductorPolizas from "./pages/productor/ProductorPolizas";
import ProductorEmisiones from "./pages/productor/ProductorEmisiones";
import ProductorAnulaciones from "./pages/productor/ProductorAnulaciones";
import ProductorSiniestros from "./pages/productor/ProductorSiniestros";
import ProductorNotas from "./pages/productor/ProductorNotas";
import ProductorTutoriales from "./pages/productor/ProductorTutoriales";
import ProductorMateriales from "./pages/productor/ProductorMateriales";
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
            <Route path="/comunidad/:slug" element={<ComunidadPage />} />
            <Route path="/contacto" element={<ContactoPage />} />
            <Route path="/cotizar" element={<CotizarPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/registro" element={<RegistroPage />} />
            <Route path="/academy" element={<AcademyPage />} />
            <Route path="/academy/contenido" element={<AcademyContenido />} />
            <Route path="/academy/:moduleSlug/:lessonSlug" element={<AcademyLesson />} />
            <Route path="/sumate" element={<SumatePage />} />

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
              <Route path="solicitudes" element={<PortalSolicitudes />} />
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
              <Route path="emisiones" element={<ProductorEmisiones />} />
              <Route path="anulaciones" element={<ProductorAnulaciones />} />
              <Route path="siniestros" element={<ProductorSiniestros />} />
              <Route path="notas" element={<ProductorNotas />} />
              <Route path="tutoriales" element={<ProductorTutoriales />} />
              <Route path="materiales" element={<ProductorMateriales />} />
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
              <Route path="clientes" element={<AdminClientes />} />
              <Route path="productores" element={<AdminProductores />} />
              <Route path="polizas" element={<AdminPolizas />} />
              <Route path="siniestros" element={<AdminSiniestros />} />
              <Route path="solicitudes" element={<AdminSolicitudes />} />
              <Route path="pagos" element={<AdminPagos />} />
              <Route path="contacts" element={<AdminContacts />} />
              <Route path="blog" element={<AdminBlog />} />
              <Route path="academy" element={<AdminAcademy />} />
              <Route path="config" element={<AdminConfig />} />
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
