import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/auth/ProtectedRoute";

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

import SeguroAuto from "./pages/landing/SeguroAuto";
import SeguroMoto from "./pages/landing/SeguroMoto";
import SeguroHogar from "./pages/landing/SeguroHogar";
import SeguroComercio from "./pages/landing/SeguroComercio";
import SeguroAccidentesPersonales from "./pages/landing/SeguroAccidentesPersonales";
import SeguroVida from "./pages/landing/SeguroVida";

import AdminLayout from "./pages/admin/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminProductores from "./pages/admin/AdminProductores";
import AdminContacts from "./pages/admin/AdminContacts";
import AdminBlog from "./pages/admin/AdminBlog";
import AdminConfig from "./pages/admin/AdminConfig";
import AdminAcademy from "./pages/admin/AdminAcademy";
import AdminPasSolicitudes from "./pages/admin/AdminPasSolicitudes";
import AdminRecursos from "./pages/admin/AdminRecursos";
import AdminConsultas from "./pages/admin/AdminConsultas";
import AdminConsultaDetail from "./pages/admin/AdminConsultaDetail";

import ProductorLayout from "./pages/productor/ProductorLayout";
import ProductorDashboard from "./pages/productor/ProductorDashboard";
import ProductorTutoriales from "./pages/productor/ProductorTutoriales";
import ProductorMateriales from "./pages/productor/ProductorMateriales";
import ProductorPerfil from "./pages/productor/ProductorPerfil";
import ProductorConsultas from "./pages/productor/ProductorConsultas";
import ProductorConsultaDetail from "./pages/productor/ProductorConsultaDetail";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
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
            <Route path="/academy/contenido" element={
              <ProtectedRoute allowedRoles={['admin', 'productor']}>
                <AcademyContenido />
              </ProtectedRoute>
            } />
            <Route path="/academy/:moduleSlug/:lessonSlug" element={
              <ProtectedRoute allowedRoles={['admin', 'productor']}>
                <AcademyLesson />
              </ProtectedRoute>
            } />
            <Route path="/sumate" element={<SumatePage />} />

            <Route path="/seguro-auto" element={<SeguroAuto />} />
            <Route path="/seguro-moto" element={<SeguroMoto />} />
            <Route path="/seguro-hogar" element={<SeguroHogar />} />
            <Route path="/seguro-comercio" element={<SeguroComercio />} />
            <Route path="/seguro-accidentes-personales" element={<SeguroAccidentesPersonales />} />
            <Route path="/seguro-vida" element={<SeguroVida />} />

            <Route path="/portal" element={<Navigate to="/" replace />} />
            <Route path="/portal/*" element={<Navigate to="/" replace />} />

            <Route path="/productor" element={
              <ProtectedRoute allowedRoles={['admin', 'productor']}>
                <ProductorLayout />
              </ProtectedRoute>
            }>
              <Route index element={<ProductorDashboard />} />
              <Route path="novedades" element={<ProductorMateriales />} />
              <Route path="materiales" element={<Navigate to="/productor/novedades" replace />} />
              <Route path="consultas" element={<ProductorConsultas />} />
              <Route path="consultas/:id" element={<ProductorConsultaDetail />} />
              <Route path="tutoriales" element={<ProductorTutoriales />} />
              <Route path="perfil" element={<ProductorPerfil />} />
            </Route>

            <Route path="/admin" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminLayout />
              </ProtectedRoute>
            }>
              <Route index element={<AdminDashboard />} />
              <Route path="solicitudes-pas" element={<AdminPasSolicitudes />} />
              <Route path="productores" element={<AdminProductores />} />
              <Route path="recursos" element={<AdminRecursos />} />
              <Route path="consultas" element={<AdminConsultas />} />
              <Route path="consultas/:id" element={<AdminConsultaDetail />} />
              <Route path="contacts" element={<AdminContacts />} />
              <Route path="blog" element={<AdminBlog />} />
              <Route path="academy" element={<AdminAcademy />} />
              <Route path="config" element={<AdminConfig />} />
            </Route>

            <Route path="/app" element={<Navigate to="/login" replace />} />
            <Route path="/app/*" element={<Navigate to="/login" replace />} />
            <Route path="/dashboard" element={<Navigate to="/login" replace />} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
