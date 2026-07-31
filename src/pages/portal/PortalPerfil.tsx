import { useState, useEffect } from "react";
import { User, Phone, Mail, MapPin, Save, Camera } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const PortalPerfil = () => {
  const { profile, refreshProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    dni: '',
    address: '',
    city: '',
    province: '',
    postal_code: '',
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || '',
        phone: profile.phone || '',
        dni: profile.dni || '',
        address: profile.address || '',
        city: profile.city || '',
        province: profile.province || '',
        postal_code: profile.postal_code || '',
      });
    }
  }, [profile]);

  const handleSave = async () => {
    if (!profile?.user_id) return;
    
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update(formData)
        .eq('user_id', profile.user_id);

      if (error) throw error;

      await refreshProfile();
      setIsEditing(false);
      toast.success("Perfil actualizado correctamente");
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error("Error al actualizar el perfil");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Mi Perfil</h1>
        {!isEditing ? (
          <Button onClick={() => setIsEditing(true)}>Editar</Button>
        ) : (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsEditing(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={isSaving}>
              <Save size={16} className="mr-2" />
              {isSaving ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>
        )}
      </div>

      {/* Profile Card */}
      <div className="bg-card rounded-2xl shadow-soft p-6">
        <div className="flex items-start gap-6">
          {/* Avatar */}
          <div className="relative">
            <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center text-4xl font-bold text-primary">
              {profile?.full_name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            {isEditing && (
              <button className="absolute bottom-0 right-0 p-2 bg-primary text-primary-foreground rounded-full shadow-lg">
                <Camera size={14} />
              </button>
            )}
          </div>

          {/* Info */}
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-foreground">
              {profile?.full_name || 'Usuario'}
            </h2>
            <p className="text-muted-foreground flex items-center gap-2 mt-1">
              <Mail size={14} /> {profile?.email}
            </p>
            {profile?.phone && (
              <p className="text-muted-foreground flex items-center gap-2 mt-1">
                <Phone size={14} /> {profile.phone}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="bg-card rounded-2xl shadow-soft p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Datos personales</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="full_name">Nombre completo</Label>
            <Input
              id="full_name"
              value={formData.full_name}
              onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
              disabled={!isEditing}
              placeholder="Tu nombre completo"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="dni">DNI</Label>
            <Input
              id="dni"
              value={formData.dni}
              onChange={(e) => setFormData(prev => ({ ...prev, dni: e.target.value }))}
              disabled={!isEditing}
              placeholder="12345678"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Teléfono</Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
              disabled={!isEditing}
              placeholder="11 1234-5678"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              value={profile?.email || ''}
              disabled
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground">El email no se puede modificar</p>
          </div>
        </div>
      </div>

      {/* Address */}
      <div className="bg-card rounded-2xl shadow-soft p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <MapPin size={18} /> Dirección
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="address">Calle y número</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
              disabled={!isEditing}
              placeholder="Av. Corrientes 1234"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="city">Ciudad</Label>
            <Input
              id="city"
              value={formData.city}
              onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
              disabled={!isEditing}
              placeholder="CABA"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="province">Provincia</Label>
            <Input
              id="province"
              value={formData.province}
              onChange={(e) => setFormData(prev => ({ ...prev, province: e.target.value }))}
              disabled={!isEditing}
              placeholder="Buenos Aires"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="postal_code">Código Postal</Label>
            <Input
              id="postal_code"
              value={formData.postal_code}
              onChange={(e) => setFormData(prev => ({ ...prev, postal_code: e.target.value }))}
              disabled={!isEditing}
              placeholder="1000"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default PortalPerfil;
