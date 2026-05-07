import { useState } from "react";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Check, Send } from "lucide-react";
import { toast } from "sonner";
import { useCreateQuoteRequest, type QuoteRamo } from "@/hooks/useQuoteRequests";

const schema = z.object({
  full_name: z.string().trim().min(2, "Ingresá tu nombre").max(100),
  email: z.string().trim().email("Email inválido").max(255),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  city: z.string().trim().max(100).optional().or(z.literal("")),
  province: z.string().trim().max(100).optional().or(z.literal("")),
  message: z.string().trim().max(1000).optional().or(z.literal("")),
});

interface QuoteLeadFormProps {
  ramo: QuoteRamo;
  source?: string;
}

export function QuoteLeadForm({ ramo, source = "ramo_landing" }: QuoteLeadFormProps) {
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    city: "",
    province: "",
    message: "",
  });
  const create = useCreateQuoteRequest();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Revisá los campos");
      return;
    }
    try {
      await create.mutateAsync({
        ramo,
        full_name: parsed.data.full_name,
        email: parsed.data.email,
        phone: parsed.data.phone || null,
        city: parsed.data.city || null,
        province: parsed.data.province || null,
        message: parsed.data.message || null,
        source,
      });
      setSubmitted(true);
      toast.success("Recibimos tu solicitud. Un asesor de Kipper te va a contactar.");
    } catch (err) {
      console.error(err);
      toast.error("No pudimos enviar la solicitud. Probá de nuevo.");
    }
  };

  if (submitted) {
    return (
      <div className="bg-card border border-border rounded-2xl p-8 text-center">
        <div className="w-14 h-14 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <Check className="text-primary" size={28} />
        </div>
        <h3 className="text-xl font-semibold mb-2">¡Gracias!</h3>
        <p className="text-muted-foreground">
          Recibimos tu solicitud. Un asesor de Kipper te va a contactar a la brevedad.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="bg-card border border-border rounded-2xl p-6 space-y-4 shadow-soft">
      <h3 className="text-lg font-semibold">Pedí tu cotización</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor={`${ramo}-name`}>Nombre y apellido *</Label>
          <Input id={`${ramo}-name`} value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${ramo}-email`}>Email *</Label>
          <Input id={`${ramo}-email`} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${ramo}-phone`}>Teléfono</Label>
          <Input id={`${ramo}-phone`} type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${ramo}-city`}>Ciudad</Label>
          <Input id={`${ramo}-city`} value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor={`${ramo}-province`}>Provincia</Label>
          <Input id={`${ramo}-province`} value={form.province} onChange={(e) => setForm({ ...form, province: e.target.value })} />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${ramo}-msg`}>Detalles (opcional)</Label>
        <Textarea
          id={`${ramo}-msg`}
          value={form.message}
          rows={3}
          onChange={(e) => setForm({ ...form, message: e.target.value })}
          placeholder="Contanos un poco más sobre lo que necesitás..."
        />
      </div>
      <Button type="submit" size="lg" className="w-full" disabled={create.isPending}>
        <Send size={16} className="mr-2" />
        {create.isPending ? "Enviando..." : "Enviar solicitud"}
      </Button>
      <p className="text-xs text-muted-foreground text-center">
        Un asesor te contacta para armar la mejor cobertura. No mostramos precios automáticos.
      </p>
    </form>
  );
}

export default QuoteLeadForm;
