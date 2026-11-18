export function BrandLogo({ compact = false, inverse = false }: { compact?: boolean; inverse?: boolean }) {
  return <div className={`brand-lockup ${compact ? "compact" : ""} ${inverse ? "inverse" : ""}`} data-logo-source="/conquistar-logo.svg">
    <object className="brand-logo-object" data="/conquistar-logo.svg" type="image/svg+xml" aria-label="Logo temporária do Consultório Conquistar" title="Logo temporária — substitua public/conquistar-logo.svg">Conquistar</object>
    <div><strong>Conquistar</strong><span>Com trabalho se conquista</span></div>
  </div>;
}
