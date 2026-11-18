// Junta nomes de classe ignorando valores vazios.
// Mesma assinatura do `cn` do shadcn/ui, mas sem dependências extras.
// Se um dia você rodar `npx shadcn@latest init`, ele vai substituir este arquivo
// pela versão com clsx + tailwind-merge — os imports `@/lib/utils` continuam valendo.
export type ClassValue = string | number | null | false | undefined | ClassValue[];

export function cn(...inputs: ClassValue[]): string {
  const out: string[] = [];
  for (const input of inputs) {
    if (!input && input !== 0) continue;
    if (Array.isArray(input)) {
      const nested = cn(...input);
      if (nested) out.push(nested);
    } else {
      out.push(String(input));
    }
  }
  return out.join(" ");
}
