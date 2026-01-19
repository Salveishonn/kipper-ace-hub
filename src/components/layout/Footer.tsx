import { Link } from "react-router-dom";
import { Phone, Mail, MapPin, Instagram, Facebook, Linkedin } from "lucide-react";
import logoKipper from "@/assets/logo-kipper.png";

export function Footer() {
  return (
    <footer className="bg-primary text-primary-foreground">
      <div className="max-w-7xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <img
                src={logoKipper}
                alt="Kipper Seguros"
                className="h-12 w-auto brightness-0 invert"
              />
              <div className="flex flex-col">
                <span className="text-xl font-bold">KIPPER</span>
                <span className="text-xs opacity-80 tracking-wider">SEGUROS</span>
              </div>
            </div>
            <p className="text-sm opacity-80 leading-relaxed">
              Tu seguro, simple. Tu info, ordenada. Tus pagos, al día.
              Más de 25 años acompañando a familias argentinas.
            </p>
            <div className="flex gap-4">
              <a href="#" className="opacity-80 hover:opacity-100 transition-opacity">
                <Instagram size={20} />
              </a>
              <a href="#" className="opacity-80 hover:opacity-100 transition-opacity">
                <Facebook size={20} />
              </a>
              <a href="#" className="opacity-80 hover:opacity-100 transition-opacity">
                <Linkedin size={20} />
              </a>
            </div>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-semibold mb-4">Seguros</h4>
            <ul className="space-y-2 text-sm opacity-80">
              <li><Link to="/servicios#auto" className="hover:opacity-100">Auto y Moto</Link></li>
              <li><Link to="/servicios#hogar" className="hover:opacity-100">Hogar</Link></li>
              <li><Link to="/servicios#vida" className="hover:opacity-100">Vida</Link></li>
              <li><Link to="/servicios#accidentes" className="hover:opacity-100">Accidentes Personales</Link></li>
              <li><Link to="/servicios#comercio" className="hover:opacity-100">Comercio / PyME</Link></li>
              <li><Link to="/servicios#flotas" className="hover:opacity-100">Flotas</Link></li>
            </ul>
          </div>

          {/* Portal */}
          <div>
            <h4 className="font-semibold mb-4">Tu Portal</h4>
            <ul className="space-y-2 text-sm opacity-80">
              <li><Link to="/portal" className="hover:opacity-100">Mis Pólizas</Link></li>
              <li><Link to="/portal/pagos" className="hover:opacity-100">Pagos</Link></li>
              <li><Link to="/portal/siniestros" className="hover:opacity-100">Siniestros</Link></li>
              <li><Link to="/cotizar" className="hover:opacity-100">Cotizar</Link></li>
              <li><Link to="/comunidad" className="hover:opacity-100">Blog & Tips</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold mb-4">Contacto</h4>
            <ul className="space-y-3 text-sm">
              <li className="flex items-center gap-2 opacity-80">
                <Phone size={16} />
                <span>(011) 4XXX-XXXX</span>
              </li>
              <li className="flex items-center gap-2 opacity-80">
                <Mail size={16} />
                <span>info@kipperseguros.com.ar</span>
              </li>
              <li className="flex items-start gap-2 opacity-80">
                <MapPin size={16} className="mt-0.5" />
                <span>Buenos Aires, Argentina</span>
              </li>
            </ul>
            <div className="mt-4">
              <a
                href="https://wa.me/5491XXXXXXXXX"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-primary-foreground/10 hover:bg-primary-foreground/20 
                           px-4 py-2 rounded-lg text-sm transition-colors"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                WhatsApp
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-primary-foreground/20 mt-12 pt-8 text-center text-sm opacity-60">
          <p>© {new Date().getFullYear()} Kipper Seguros. Todos los derechos reservados.</p>
          <p className="mt-1">Organización de Productores Asesores de Seguros</p>
        </div>
      </div>
    </footer>
  );
}
