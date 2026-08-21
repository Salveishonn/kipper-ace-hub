import { useEffect, useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Button } from "@/components/ui/button";

type AdminMfaStepProps = {
  email: string;
  onRequestCode: () => Promise<{ ok: boolean; error?: string; retryAfterSeconds?: number }>;
  onVerify: (code: string) => Promise<{ ok: boolean; error?: string }>;
  onSignOut: () => Promise<void>;
};

export function AdminMfaStep({ email, onRequestCode, onVerify, onSignOut }: AdminMfaStepProps) {
  const [code, setCode] = useState("");
  const [sending, setSending] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const send = async () => {
      setSending(true);
      const result = await onRequestCode();
      if (cancelled) return;
      setSending(false);
      if (result.ok) {
        setSent(true);
        setCooldown(result.retryAfterSeconds ?? 60);
        toast.success("Código enviado", { description: `Revisá ${email}` });
        return;
      }
      if (result.retryAfterSeconds) {
        setSent(true);
        setCooldown(result.retryAfterSeconds);
      }
      toast.error("No se pudo enviar el código", {
        description: result.error,
      });
    };
    void send();
    return () => {
      cancelled = true;
    };
    // Request once when this step mounts (after password auth as admin).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = window.setInterval(() => {
      setCooldown((s) => (s <= 1 ? 0 : s - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [cooldown]);

  const handleVerify = async (value: string) => {
    if (value.length !== 6 || verifying) return;
    setVerifying(true);
    const result = await onVerify(value);
    if (!result.ok) {
      toast.error("Código inválido", { description: result.error });
      setCode("");
      setVerifying(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || sending) return;
    setSending(true);
    const result = await onRequestCode();
    setSending(false);
    if (result.ok) {
      setSent(true);
      setCooldown(60);
      toast.success("Código reenviado");
      return;
    }
    if (result.retryAfterSeconds) setCooldown(result.retryAfterSeconds);
    toast.error("No se pudo reenviar", { description: result.error });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <ShieldCheck size={22} className="text-primary" aria-hidden />
        <h1 className="text-3xl font-bold text-foreground">Verificá tu identidad</h1>
      </div>
      <p className="text-muted-foreground">
        Tu cuenta es de administración. Te enviamos un código de 6 dígitos a{" "}
        <span className="font-medium text-foreground">{email}</span>.
      </p>

      {sending && !sent ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 size={16} className="animate-spin" aria-hidden />
          Enviando código...
        </div>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void handleVerify(code);
          }}
          className="space-y-5"
        >
          <div>
            <label htmlFor="admin-mfa-code" className="block text-sm font-medium text-foreground mb-3">
              Código de seguridad
            </label>
            <InputOTP
              id="admin-mfa-code"
              maxLength={6}
              value={code}
              onChange={setCode}
              onComplete={(value) => void handleVerify(value)}
              disabled={verifying}
              autoFocus
            >
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>
          </div>

          <button
            type="submit"
            disabled={verifying || code.length !== 6}
            className="btn-hero w-full flex items-center justify-center gap-2"
          >
            {verifying ? (
              <>
                <Loader2 size={18} className="animate-spin" aria-hidden />
                Verificando...
              </>
            ) : (
              "Ingresar a administración"
            )}
          </button>
        </form>
      )}

      <div className="flex flex-col gap-2 text-sm">
        <button
          type="button"
          onClick={() => void handleResend()}
          disabled={sending || cooldown > 0}
          className="text-primary font-medium hover:underline disabled:text-muted-foreground disabled:no-underline text-left"
        >
          {cooldown > 0 ? `Reenviar código en ${cooldown}s` : "Reenviar código"}
        </button>
        <Button type="button" variant="ghost" className="justify-start px-0" onClick={() => void onSignOut()}>
          Cerrar sesión
        </Button>
      </div>
    </div>
  );
}
