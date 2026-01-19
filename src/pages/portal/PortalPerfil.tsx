import { User, Mail, Phone, MapPin, Save } from "lucide-react";

const PortalPerfil = () => (
  <div className="space-y-6">
    <h1 className="text-2xl font-bold text-foreground">Mi Perfil</h1>
    <div className="bg-card rounded-2xl shadow-soft p-6">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center text-primary text-2xl font-bold">JD</div>
        <div>
          <h2 className="text-xl font-semibold text-foreground">Juan Demo</h2>
          <p className="text-muted-foreground">Cliente desde 2020</p>
        </div>
      </div>
      <form className="space-y-6 max-w-lg">
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Nombre completo</label>
          <input type="text" defaultValue="Juan Demo" className="input-kipper"/>
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">DNI</label>
          <input type="text" defaultValue="12345678" className="input-kipper"/>
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Email</label>
          <input type="email" defaultValue="juan@demo.com" className="input-kipper"/>
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Teléfono</label>
          <input type="tel" defaultValue="11-5555-1234" className="input-kipper"/>
        </div>
        <button type="submit" className="btn-hero flex items-center gap-2">
          <Save size={18}/> Guardar cambios
        </button>
      </form>
    </div>
  </div>
);

export default PortalPerfil;
