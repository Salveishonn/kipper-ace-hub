-- ============================================
-- KIPPER SEGUROS - DATABASE SCHEMA
-- ============================================

-- 1. Create ENUM for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'productor', 'cliente');

-- 2. Create user_roles table (CRITICAL: roles stored separately for security)
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- 3. Create profiles table for user information
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    email TEXT NOT NULL,
    full_name TEXT,
    phone TEXT,
    dni TEXT,
    address TEXT,
    city TEXT,
    province TEXT,
    postal_code TEXT,
    avatar_url TEXT,
    marketing_consent BOOLEAN DEFAULT false,
    preferred_contact TEXT DEFAULT 'email',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Create vehicle_brands table
CREATE TABLE public.vehicle_brands (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    type TEXT NOT NULL CHECK (type IN ('auto', 'moto', 'camioneta')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Create vehicle_models table
CREATE TABLE public.vehicle_models (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_id UUID REFERENCES public.vehicle_brands(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    year_start INTEGER,
    year_end INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Create leads table
CREATE TABLE public.leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    assigned_productor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'nuevo' CHECK (status IN ('nuevo', 'contactado', 'cotizado', 'cerrado', 'perdido')),
    origin TEXT DEFAULT 'cotizador' CHECK (origin IN ('cotizador', 'contacto', 'landing', 'referido', 'otro')),
    -- Vehicle info
    vehicle_type TEXT CHECK (vehicle_type IN ('auto', 'moto', 'camioneta')),
    vehicle_brand TEXT,
    vehicle_model TEXT,
    vehicle_year INTEGER,
    vehicle_version TEXT,
    vehicle_use TEXT CHECK (vehicle_use IN ('particular', 'comercial', 'uber_remis', 'otro')),
    -- Coverage
    coverage_type TEXT CHECK (coverage_type IN ('terceros', 'terceros_completo', 'todo_riesgo')),
    -- Contact info
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    dni TEXT,
    locality TEXT,
    postal_code TEXT,
    -- Additional
    notes TEXT,
    documents JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. Create insurance_companies table
CREATE TABLE public.insurance_companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    logo_url TEXT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. Create policies table
CREATE TABLE public.policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    assigned_productor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
    insurance_company_id UUID REFERENCES public.insurance_companies(id) ON DELETE SET NULL,
    policy_number TEXT,
    policy_type TEXT NOT NULL CHECK (policy_type IN ('auto', 'moto', 'hogar', 'vida', 'accidentes_personales', 'comercio', 'pyme', 'flota', 'otro')),
    coverage_type TEXT,
    status TEXT NOT NULL DEFAULT 'activa' CHECK (status IN ('activa', 'vencida', 'cancelada', 'pendiente')),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    premium_amount DECIMAL(12,2),
    payment_frequency TEXT DEFAULT 'mensual' CHECK (payment_frequency IN ('mensual', 'trimestral', 'semestral', 'anual')),
    -- Vehicle info (if applicable)
    vehicle_plate TEXT,
    vehicle_brand TEXT,
    vehicle_model TEXT,
    vehicle_year INTEGER,
    -- Documents
    documents JSONB DEFAULT '[]'::jsonb,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 9. Create installments (payments) table
CREATE TABLE public.installments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    policy_id UUID REFERENCES public.policies(id) ON DELETE CASCADE NOT NULL,
    installment_number INTEGER NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    due_date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'pendiente' CHECK (status IN ('pendiente', 'pagada', 'atrasada', 'anulada')),
    paid_at TIMESTAMPTZ,
    payment_method TEXT,
    mp_payment_id TEXT,
    mp_preference_id TEXT,
    receipt_url TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 10. Create claims (siniestros) table
CREATE TABLE public.claims (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    policy_id UUID REFERENCES public.policies(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    claim_number TEXT,
    status TEXT NOT NULL DEFAULT 'recibido' CHECK (status IN ('recibido', 'en_gestion', 'resuelto', 'rechazado')),
    incident_date DATE NOT NULL,
    incident_time TIME,
    incident_location TEXT,
    description TEXT NOT NULL,
    documents JSONB DEFAULT '[]'::jsonb,
    resolution_notes TEXT,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 11. Create contacts table (for marketing)
CREATE TABLE public.contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE,
    phone TEXT,
    full_name TEXT,
    origin TEXT DEFAULT 'website',
    opt_in BOOLEAN DEFAULT false,
    tags TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 12. Create blog_posts table
CREATE TABLE public.blog_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    content TEXT NOT NULL,
    excerpt TEXT,
    featured_image TEXT,
    tags TEXT[] DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- SECURITY FUNCTIONS
-- ============================================

-- Function to check if user has a specific role (SECURITY DEFINER to avoid recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = _user_id
          AND role = _role
    )
$$;

-- Function to check if current user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT public.has_role(auth.uid(), 'admin')
$$;

-- Function to check if current user is productor
CREATE OR REPLACE FUNCTION public.is_productor()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT public.has_role(auth.uid(), 'productor')
$$;

-- Function to check if current user is cliente
CREATE OR REPLACE FUNCTION public.is_cliente()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT public.has_role(auth.uid(), 'cliente')
$$;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- ============================================
-- TRIGGERS
-- ============================================

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_leads_updated_at
    BEFORE UPDATE ON public.leads
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_policies_updated_at
    BEFORE UPDATE ON public.policies
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_installments_updated_at
    BEFORE UPDATE ON public.installments
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_claims_updated_at
    BEFORE UPDATE ON public.claims
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_contacts_updated_at
    BEFORE UPDATE ON public.contacts
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_blog_posts_updated_at
    BEFORE UPDATE ON public.blog_posts
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- ENABLE RLS
-- ============================================

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.installments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insurance_companies ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES
-- ============================================

-- user_roles policies
CREATE POLICY "Admin can manage all roles" ON public.user_roles
    FOR ALL USING (public.is_admin());

CREATE POLICY "Users can view own roles" ON public.user_roles
    FOR SELECT USING (auth.uid() = user_id);

-- profiles policies
CREATE POLICY "Admin can manage all profiles" ON public.profiles
    FOR ALL USING (public.is_admin());

CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Productores can view client profiles" ON public.profiles
    FOR SELECT USING (
        public.is_productor() AND EXISTS (
            SELECT 1 FROM public.policies 
            WHERE policies.user_id = profiles.user_id 
            AND policies.assigned_productor_id = auth.uid()
        )
    );

-- leads policies
CREATE POLICY "Admin can manage all leads" ON public.leads
    FOR ALL USING (public.is_admin());

CREATE POLICY "Productores can view assigned leads" ON public.leads
    FOR SELECT USING (public.is_productor() AND assigned_productor_id = auth.uid());

CREATE POLICY "Productores can update assigned leads" ON public.leads
    FOR UPDATE USING (public.is_productor() AND assigned_productor_id = auth.uid());

CREATE POLICY "Clients can view own leads" ON public.leads
    FOR SELECT USING (public.is_cliente() AND user_id = auth.uid());

CREATE POLICY "Anyone can create leads (cotizador)" ON public.leads
    FOR INSERT WITH CHECK (true);

-- policies policies
CREATE POLICY "Admin can manage all policies" ON public.policies
    FOR ALL USING (public.is_admin());

CREATE POLICY "Productores can view assigned policies" ON public.policies
    FOR SELECT USING (public.is_productor() AND assigned_productor_id = auth.uid());

CREATE POLICY "Productores can update assigned policies" ON public.policies
    FOR UPDATE USING (public.is_productor() AND assigned_productor_id = auth.uid());

CREATE POLICY "Productores can insert policies" ON public.policies
    FOR INSERT WITH CHECK (public.is_productor());

CREATE POLICY "Clients can view own policies" ON public.policies
    FOR SELECT USING (public.is_cliente() AND user_id = auth.uid());

-- installments policies
CREATE POLICY "Admin can manage all installments" ON public.installments
    FOR ALL USING (public.is_admin());

CREATE POLICY "Productores can view installments of assigned policies" ON public.installments
    FOR SELECT USING (
        public.is_productor() AND EXISTS (
            SELECT 1 FROM public.policies 
            WHERE policies.id = installments.policy_id 
            AND policies.assigned_productor_id = auth.uid()
        )
    );

CREATE POLICY "Productores can update installments of assigned policies" ON public.installments
    FOR UPDATE USING (
        public.is_productor() AND EXISTS (
            SELECT 1 FROM public.policies 
            WHERE policies.id = installments.policy_id 
            AND policies.assigned_productor_id = auth.uid()
        )
    );

CREATE POLICY "Clients can view own installments" ON public.installments
    FOR SELECT USING (
        public.is_cliente() AND EXISTS (
            SELECT 1 FROM public.policies 
            WHERE policies.id = installments.policy_id 
            AND policies.user_id = auth.uid()
        )
    );

-- claims policies
CREATE POLICY "Admin can manage all claims" ON public.claims
    FOR ALL USING (public.is_admin());

CREATE POLICY "Productores can view claims of assigned policies" ON public.claims
    FOR SELECT USING (
        public.is_productor() AND EXISTS (
            SELECT 1 FROM public.policies 
            WHERE policies.id = claims.policy_id 
            AND policies.assigned_productor_id = auth.uid()
        )
    );

CREATE POLICY "Productores can update claims of assigned policies" ON public.claims
    FOR UPDATE USING (
        public.is_productor() AND EXISTS (
            SELECT 1 FROM public.policies 
            WHERE policies.id = claims.policy_id 
            AND policies.assigned_productor_id = auth.uid()
        )
    );

CREATE POLICY "Clients can view own claims" ON public.claims
    FOR SELECT USING (
        public.is_cliente() AND EXISTS (
            SELECT 1 FROM public.policies 
            WHERE policies.id = claims.policy_id 
            AND policies.user_id = auth.uid()
        )
    );

CREATE POLICY "Clients can create claims for own policies" ON public.claims
    FOR INSERT WITH CHECK (
        public.is_cliente() AND EXISTS (
            SELECT 1 FROM public.policies 
            WHERE policies.id = claims.policy_id 
            AND policies.user_id = auth.uid()
        )
    );

CREATE POLICY "Clients can update own claims" ON public.claims
    FOR UPDATE USING (
        public.is_cliente() AND EXISTS (
            SELECT 1 FROM public.policies 
            WHERE policies.id = claims.policy_id 
            AND policies.user_id = auth.uid()
        )
    );

-- contacts policies (admin only + insert for anyone)
CREATE POLICY "Admin can manage all contacts" ON public.contacts
    FOR ALL USING (public.is_admin());

CREATE POLICY "Anyone can create contacts" ON public.contacts
    FOR INSERT WITH CHECK (true);

-- blog_posts policies
CREATE POLICY "Anyone can view published posts" ON public.blog_posts
    FOR SELECT USING (status = 'published');

CREATE POLICY "Admin can manage all posts" ON public.blog_posts
    FOR ALL USING (public.is_admin());

-- vehicle_brands policies (public read)
CREATE POLICY "Anyone can view vehicle brands" ON public.vehicle_brands
    FOR SELECT USING (true);

CREATE POLICY "Admin can manage vehicle brands" ON public.vehicle_brands
    FOR ALL USING (public.is_admin());

-- vehicle_models policies (public read)
CREATE POLICY "Anyone can view vehicle models" ON public.vehicle_models
    FOR SELECT USING (true);

CREATE POLICY "Admin can manage vehicle models" ON public.vehicle_models
    FOR ALL USING (public.is_admin());

-- insurance_companies policies (public read)
CREATE POLICY "Anyone can view active insurance companies" ON public.insurance_companies
    FOR SELECT USING (active = true);

CREATE POLICY "Admin can manage insurance companies" ON public.insurance_companies
    FOR ALL USING (public.is_admin());

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX idx_profiles_email ON public.profiles(email);
CREATE INDEX idx_leads_status ON public.leads(status);
CREATE INDEX idx_leads_assigned_productor ON public.leads(assigned_productor_id);
CREATE INDEX idx_leads_email ON public.leads(email);
CREATE INDEX idx_policies_user_id ON public.policies(user_id);
CREATE INDEX idx_policies_assigned_productor ON public.policies(assigned_productor_id);
CREATE INDEX idx_policies_status ON public.policies(status);
CREATE INDEX idx_installments_policy_id ON public.installments(policy_id);
CREATE INDEX idx_installments_status ON public.installments(status);
CREATE INDEX idx_installments_due_date ON public.installments(due_date);
CREATE INDEX idx_claims_policy_id ON public.claims(policy_id);
CREATE INDEX idx_claims_status ON public.claims(status);
CREATE INDEX idx_contacts_email ON public.contacts(email);
CREATE INDEX idx_blog_posts_slug ON public.blog_posts(slug);
CREATE INDEX idx_blog_posts_status ON public.blog_posts(status);
CREATE INDEX idx_vehicle_models_brand_id ON public.vehicle_models(brand_id);