import { supabase } from '@/integrations/supabase/client';
import { addDays, format, isBefore } from 'date-fns';

export async function runDailyChecks(): Promise<{ 
  overdueMarked: number; 
  tasksCreated: number; 
  renewalAlerts: number;
}> {
  const today = new Date();
  const todayStr = format(today, 'yyyy-MM-dd');
  let overdueMarked = 0;
  let tasksCreated = 0;
  let renewalAlerts = 0;

  // 1) Mark overdue installments
  const { data: overdue } = await supabase
    .from('installments')
    .select('id, policy_id')
    .lt('due_date', todayStr)
    .in('status', ['pendiente']);

  if (overdue && overdue.length > 0) {
    const ids = overdue.map(i => i.id);
    await supabase
      .from('installments')
      .update({ status: 'atrasada' })
      .in('id', ids);
    overdueMarked = ids.length;
  }

  // 2) Create tasks for installments due in 1,3,7 days
  const dueSoonDays = [1, 3, 7];
  for (const days of dueSoonDays) {
    const targetDate = format(addDays(today, days), 'yyyy-MM-dd');
    
    const { data: dueSoon } = await supabase
      .from('installments')
      .select('id, policy_id, amount, installment_number')
      .eq('due_date', targetDate)
      .in('status', ['pendiente']);

    if (dueSoon) {
      for (const inst of dueSoon) {
        // Check if task already exists for this installment
        const { data: existing } = await supabase
          .from('tasks')
          .select('id')
          .eq('related_type', 'installment')
          .eq('related_id', inst.id)
          .eq('type', 'vencimiento')
          .in('status', ['pendiente', 'en_progreso'])
          .limit(1);

        if (!existing || existing.length === 0) {
          // Get assigned producer from policy
          const { data: policy } = await supabase
            .from('policies')
            .select('assigned_productor_id')
            .eq('id', inst.policy_id)
            .single();

          await supabase.from('tasks').insert({
            type: 'vencimiento',
            related_type: 'installment',
            related_id: inst.id,
            assigned_role: 'productor',
            assigned_producer_id: policy?.assigned_productor_id || null,
            title: `Cuota ${inst.installment_number} vence en ${days} día(s)`,
            description: `Monto: $${inst.amount}`,
            due_date: targetDate,
          });
          tasksCreated++;
        }
      }
    }
  }

  // 3) Renewal alerts - policies ending within 30 days
  const thirtyDaysStr = format(addDays(today, 30), 'yyyy-MM-dd');
  
  const { data: expiring } = await supabase
    .from('policies')
    .select('id, policy_number, policy_type, end_date, assigned_productor_id')
    .eq('status', 'activa')
    .lte('end_date', thirtyDaysStr)
    .gte('end_date', todayStr);

  if (expiring) {
    for (const pol of expiring) {
      const { data: existing } = await supabase
        .from('tasks')
        .select('id')
        .eq('related_type', 'policy')
        .eq('related_id', pol.id)
        .eq('type', 'renovacion')
        .in('status', ['pendiente', 'en_progreso'])
        .limit(1);

      if (!existing || existing.length === 0) {
        await supabase.from('tasks').insert({
          type: 'renovacion',
          related_type: 'policy',
          related_id: pol.id,
          assigned_role: 'productor',
          assigned_producer_id: pol.assigned_productor_id || null,
          title: `Renovación: ${pol.policy_type} #${pol.policy_number || pol.id.slice(0, 8)}`,
          description: `Vence el ${pol.end_date}`,
          due_date: pol.end_date,
        });
        tasksCreated++;
        renewalAlerts++;
      }
    }
  }

  // Write audit log
  const { data: { user } } = await supabase.auth.getUser();
  await supabase.from('audit_logs').insert({
    actor_user_id: user?.id || null,
    actor_role: 'admin',
    action: 'system.daily_checks',
    entity_type: 'system',
    metadata: { overdueMarked, tasksCreated, renewalAlerts, ran_at: new Date().toISOString() },
  });

  return { overdueMarked, tasksCreated, renewalAlerts };
}
