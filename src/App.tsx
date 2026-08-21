import { lazy, Suspense } from "react";
import { useParams } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { AuthProvider } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { KipperAssistant } from "@/components/assistant/KipperAssistant";

// Public
const Index = lazy(() => import("./pages/Index"));
const NotFound = lazy(() => import("./pages/NotFound"));
const CotizarPage = lazy(() => import("./pages/Cotizar"));
const LoginPage = lazy(() => import("./pages/Login"));
const AdminLoginPage = lazy(() => import("./pages/AdminLogin"));
const RegistroPage = lazy(() => import("./pages/Registro"));
const RecuperarContrasenaPage = lazy(() => import("./pages/RecuperarContrasena"));
const RestablecerContrasenaPage = lazy(() => import("./pages/RestablecerContrasena"));
const AuthCallbackPage = lazy(() => import("./pages/AuthCallback"));
const SolicitudPendientePage = lazy(() => import("./pages/productor/SolicitudPendiente"));
const AccesoNoDisponiblePage = lazy(() => import("./pages/productor/AccesoNoDisponible"));
const ServiciosPage = lazy(() => import("./pages/Servicios"));
const NosotrosPage = lazy(() => import("./pages/Nosotros"));
const ContactoPage = lazy(() => import("./pages/Contacto"));
const ComunidadPage = lazy(() => import("./pages/Comunidad"));
const AcademyPage = lazy(() => import("./pages/Academy"));
const AcademyContenido = lazy(() => import("./pages/academy/AcademyContenido"));
const AcademyLesson = lazy(() => import("./pages/academy/AcademyLesson"));
const SumatePage = lazy(() => import("./pages/Sumate"));

// Public landings
const SeguroAuto = lazy(() => import("./pages/landing/SeguroAuto"));
const SeguroMoto = lazy(() => import("./pages/landing/SeguroMoto"));
const SeguroHogar = lazy(() => import("./pages/landing/SeguroHogar"));
const SeguroComercio = lazy(() => import("./pages/landing/SeguroComercio"));
const SeguroAccidentesPersonales = lazy(() => import("./pages/landing/SeguroAccidentesPersonales"));
const SeguroVida = lazy(() => import("./pages/landing/SeguroVida"));

// Admin
const AdminLayout = lazy(() => import("./pages/admin/AdminLayout"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminProductores = lazy(() => import("./pages/admin/AdminProductores"));
const AdminBlog = lazy(() => import("./pages/admin/AdminBlog"));
const AdminConfig = lazy(() => import("./pages/admin/AdminConfig"));
const AdminAdministradores = lazy(() => import("./pages/admin/AdminAdministradores"));
const AdminAcademy = lazy(() => import("./pages/admin/AdminAcademy"));
const AdminAcademyModule = lazy(() => import("./pages/admin/AdminAcademyModule"));
const AdminAcademyLesson = lazy(() => import("./pages/admin/AdminAcademyLesson"));
const AdminNovedades = lazy(() => import("./pages/admin/AdminNovedades"));
const AdminRecursosGraficos = lazy(() => import("./pages/admin/AdminRecursosGraficos"));
const AdminConsultas = lazy(() => import("./pages/admin/AdminConsultas"));
const AdminConsultaDetail = lazy(() => import("./pages/admin/AdminConsultaDetail"));

// Productor
const ProductorLayout = lazy(() => import("./pages/productor/ProductorLayout"));
const ProductorDashboard = lazy(() => import("./pages/productor/ProductorDashboard"));
const ProductorMateriales = lazy(() => import("./pages/productor/ProductorMateriales"));
const ProductorRecursos = lazy(() => import("./pages/productor/ProductorRecursos"));
const ProductorPerfil = lazy(() => import("./pages/productor/ProductorPerfil"));
const ProductorConsultas = lazy(() => import("./pages/productor/ProductorConsultas"));
const ProductorConsultaDetail = lazy(() => import("./pages/productor/ProductorConsultaDetail"));

const queryClient = new QueryClient();

const RouteFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <Loader2 size={36} className="animate-spin text-primary" aria-label="Cargando" />
  </div>
);

/** Compatibility redirect: /academy/:moduleSlug/:lessonSlug → /productor/academy/... */
const LegacyAcademyLessonRedirect = () => {
  const { moduleSlug, lessonSlug } = useParams();
  return <Navigate to={`/productor/academy/${moduleSlug}/${lessonSlug}`} replace />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <KipperAssistant />
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/seguros" element={<ServiciosPage />} />
              <Route path="/servicios" element={<Navigate to="/seguros" replace />} />
              <Route path="/nosotros" element={<NosotrosPage />} />
              <Route path="/comunidad" element={<ComunidadPage />} />
              <Route path="/comunidad/:slug" element={<ComunidadPage />} />
              <Route path="/contacto" element={<ContactoPage />} />
              <Route path="/cotizar" element={<CotizarPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/admin/login" element={<AdminLoginPage />} />
              <Route path="/registro" element={<RegistroPage />} />
              <Route path="/recuperar-contrasena" element={<RecuperarContrasenaPage />} />
              <Route path="/restablecer-contrasena" element={<RestablecerContrasenaPage />} />
              <Route path="/auth/callback" element={<AuthCallbackPage />} />
              <Route path="/academy" element={<AcademyPage />} />
              {/* Internal Academy moved into the producer portal */}
              <Route path="/academy/contenido" element={<Navigate to="/productor/academy" replace />} />
              <Route path="/academy/:moduleSlug/:lessonSlug" element={<LegacyAcademyLessonRedirect />} />
              <Route path="/sumate" element={<SumatePage />} />

              <Route path="/seguro-auto" element={<SeguroAuto />} />
              <Route path="/seguro-moto" element={<SeguroMoto />} />
              <Route path="/seguro-hogar" element={<SeguroHogar />} />
              <Route path="/seguro-comercio" element={<SeguroComercio />} />
              <Route path="/seguro-accidentes-personales" element={<SeguroAccidentesPersonales />} />
              <Route path="/seguro-vida" element={<SeguroVida />} />

              {/* Legacy customer-portal routes: public site only */}
              <Route path="/portal" element={<Navigate to="/" replace />} />
              <Route path="/portal/*" element={<Navigate to="/" replace />} />

              <Route
                path="/productor/solicitud-pendiente"
                element={
                  <ProtectedRoute allowApplicantStatus>
                    <SolicitudPendientePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/productor/acceso-no-disponible"
                element={
                  <ProtectedRoute allowApplicantStatus>
                    <AccesoNoDisponiblePage />
                  </ProtectedRoute>
                }
              />

              <Route path="/productor" element={
                <ProtectedRoute allowedRoles={['admin', 'productor']}>
                  <ProductorLayout />
                </ProtectedRoute>
              }>
                <Route index element={<ProductorDashboard />} />
                <Route path="academy" element={<AcademyContenido />} />
                <Route path="academy/:moduleSlug/:lessonSlug" element={<AcademyLesson />} />
                <Route path="recursos" element={<ProductorRecursos />} />
                <Route path="novedades" element={<ProductorMateriales />} />
                <Route path="materiales" element={<Navigate to="/productor/novedades" replace />} />
                <Route path="tutoriales" element={<Navigate to="/productor/academy" replace />} />
                <Route path="consultas" element={<ProductorConsultas />} />
                <Route path="consultas/:id" element={<ProductorConsultaDetail />} />
                <Route path="perfil" element={<ProductorPerfil />} />
              </Route>

              <Route path="/admin" element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminLayout />
                </ProtectedRoute>
              }>
                <Route index element={<AdminDashboard />} />
                <Route path="solicitudes-pas" element={<Navigate to="/admin/productores" replace />} />
                <Route path="productores" element={<AdminProductores />} />
                <Route path="administradores" element={<AdminAdministradores />} />
                <Route path="academy" element={<AdminAcademy />} />
                <Route path="academy/:moduleSlug" element={<AdminAcademyModule />} />
                <Route path="academy/:moduleSlug/:lessonSlug" element={<AdminAcademyLesson />} />
                <Route path="recursos-graficos" element={<AdminRecursosGraficos />} />
                <Route path="novedades" element={<AdminNovedades />} />
                <Route path="recursos" element={<Navigate to="/admin/novedades" replace />} />
                <Route path="consultas" element={<AdminConsultas />} />
                <Route path="consultas/:id" element={<AdminConsultaDetail />} />
                <Route path="contacts" element={<Navigate to="/admin" replace />} />
                <Route path="blog" element={<AdminBlog />} />
                <Route path="config" element={<AdminConfig />} />
              </Route>

              <Route path="/app" element={<Navigate to="/login" replace />} />
              <Route path="/app/*" element={<Navigate to="/login" replace />} />
              <Route path="/dashboard" element={<Navigate to="/login" replace />} />

              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
