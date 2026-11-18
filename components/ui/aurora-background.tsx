import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { cn } from "@/lib/utils";

type AuroraBackgroundProps = {
  /** Elemento HTML que envolve o conteúdo. Use "section" quando for uma seção da página. */
  as?: "div" | "section";
  className?: string;
  children: ReactNode;
  /** Desvanece a aurora a partir do canto superior direito (padrão do componente original). */
  showRadialGradient?: boolean;
} & Omit<ComponentPropsWithoutRef<"section">, "children" | "className">;

/**
 * Fundo animado "aurora".
 *
 * Adaptado do componente Aurora Background (shadcn/Aceternity) ao projeto:
 * - o estilo vive em app/public-site.css (classes `cq-aurora*`), porque o projeto usa
 *   Tailwind v4 (sem tailwind.config.js) e o site público é escrito em CSS próprio;
 * - não renderiza <main> nem altura fixa: o hero já está dentro do <main id="conteudo">;
 * - sem framer-motion: a animação é CSS puro e respeita `prefers-reduced-motion`.
 */
export function AuroraBackground({
  as: Tag = "div",
  className,
  children,
  showRadialGradient = true,
  ...props
}: AuroraBackgroundProps) {
  return (
    <Tag className={cn("cq-aurora-host", className)} {...props}>
      <div className="cq-aurora" data-radial={showRadialGradient ? "" : undefined} aria-hidden="true">
        <div className="cq-aurora-layer" />
      </div>
      {children}
    </Tag>
  );
}
