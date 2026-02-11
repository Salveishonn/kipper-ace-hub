
-- Tasks table for reminders/vencimientos/cobranza
CREATE TABLE public.tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('vencimiento','renovacion','siniestro','cobranza','seguimiento_lead')),
  related_type TEXT CHECK (related_type IN ('installment','policy','claim','lead')),
  related_id UUID,
  assigned_role TEXT CHECK (assigned_role IN ('admin','productor')),
  assigned_producer_id UUID,
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'pendiente' CHECK (status IN ('pendiente','en_progreso','hecho','descartado')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage all tasks"
ON public.tasks FOR ALL USING (public.is_admin());

CREATE POLICY "Productores can view assigned tasks"
ON public.tasks FOR SELECT
USING (public.is_productor() AND assigned_producer_id = auth.uid());

CREATE POLICY "Productores can update assigned tasks"
ON public.tasks FOR UPDATE
USING (public.is_productor() AND assigned_producer_id = auth.uid());

-- Audit logs
CREATE TABLE public.audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  actor_user_id UUID,
  actor_role TEXT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can view all audit logs"
ON public.audit_logs FOR ALL USING (public.is_admin());

CREATE POLICY "Admin can insert audit logs"
ON public.audit_logs FOR INSERT WITH CHECK (true);

CREATE POLICY "Productores can view related audit logs"
ON public.audit_logs FOR SELECT
USING (public.is_productor() AND actor_user_id = auth.uid());

-- Indexes for performance
CREATE INDEX idx_tasks_status ON public.tasks(status);
CREATE INDEX idx_tasks_due_date ON public.tasks(due_date);
CREATE INDEX idx_tasks_assigned_producer ON public.tasks(assigned_producer_id);
CREATE INDEX idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_created ON public.audit_logs(created_at DESC);
