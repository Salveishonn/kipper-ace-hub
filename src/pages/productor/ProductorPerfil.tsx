import { useState, useEffect } from "react";
import { User, Phone, MapPin, Save, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { AvatarUpload } from "@/components/shared/AvatarUpload";
import { toast } from "sonner";

const ProductorPerfil = () => {
  const { profile, refreshProfile } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    full_name: "",
    phone: "",
    dni: "",
    address: "",
    city: "",
    province: "",
    postal_code: "",
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || "",
        phone: profile.phone || "",
        dni: profile.dni || "",
        address: profile.address || "",
        city: profile.city || "",
        province: profile.province || "",
        postal_code: profile.postal_code || "",
      });
    }
  }, [profile]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update(formData)
        .eq('id', profile?.id);

      if (error) throw error;

      await refreshProfile();
      toast.success("Perfil actualizado correctamente");
    } catch (err) {
      toast.error("Error al actualizar el perfil");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Mi Perfil</h1>
        <p className="text-muted-foreground">Actualizá tu información personal</p>
      </div>

      {/* Profile Card */}
      <div className="bg-card rounded-2xl shadow-soft p-6">
        <div className="mb-6 pb-6 border-b border-border space-y-3">
          <AvatarUpload />
          <span className="inline-block px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-medium rounded-full">
            Productor
          </span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Nombre completo
              </label>
              <div className="relative">
                <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleChange}
                  className="input-kipper pl-10"
                  placeholder="Tu nombre completo"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Teléfono
              </label>
              <div className="relative">
                <Phone size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="input-kipper pl-10"
                  placeholder="11 1234-5678"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                DNI
              </label>
              <input
                type="text"
                name="dni"
                value={formData.dni}
                onChange={handleChange}
                className="input-kipper"
                placeholder="12.345.678"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Código Postal
              </label>
              <input
                type="text"
                name="postal_code"
                value={formData.postal_code}
                onChange={handleChange}
                className="input-kipper"
                placeholder="1234"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-foreground mb-2">
                Dirección
              </label>
              <div className="relative">
                <MapPin size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  className="input-kipper pl-10"
                  placeholder="Av. Corrientes 1234"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Ciudad
              </label>
              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleChange}
                className="input-kipper"
                placeholder="Buenos Aires"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Provincia
              </label>
              <input
                type="text"
                name="province"
                value={formData.province}
                onChange={handleChange}
                className="input-kipper"
                placeholder="CABA"
              />
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <button
              type="submit"
              disabled={isLoading}
              className="btn-hero flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save size={18} />
                  Guardar cambios
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProductorPerfil;
