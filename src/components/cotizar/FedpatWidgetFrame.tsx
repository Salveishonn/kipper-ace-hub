const FEDPAT_WIDGET_SCRIPT_SRC = "https://online.fedpat.com.ar/widget/fedpat-widget-v1.0.js";

const FRAME_HTML = `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      html, body { margin: 0; padding: 0; min-height: 100%; background: #fff; }
      fedpat-widget { display: block; width: 100%; min-height: 640px; }
    </style>
  </head>
  <body>
    <fedpat-widget id="44"></fedpat-widget>
    <script src="${FEDPAT_WIDGET_SCRIPT_SRC}" async></script>
  </body>
</html>`;

/**
 * Federación Patronal's widget injects Bootstrap-like global CSS
 * (html/body/header/footer/button) into document.head. Isolating it in a
 * srcDoc iframe keeps Kipper styles intact when the widget opens.
 */
export function FedpatWidgetFrame() {
  return (
    <iframe
      title="Cotizador online de Federación Patronal"
      className="block w-full min-h-[640px] rounded-xl bg-white"
      sandbox="allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-same-origin"
      srcDoc={FRAME_HTML}
      loading="lazy"
      referrerPolicy="strict-origin-when-cross-origin"
    />
  );
}
