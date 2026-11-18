import { useEffect, type RefObject } from "react";

/**
 * Movimento da página pública. Tudo é aprimoramento progressivo:
 * sem JavaScript, ou com "reduzir movimento" ligado no sistema, a página
 * aparece completa e parada.
 *
 * Marcadores usados no HTML:
 *  [data-reveal]   bloco que entra quando rola até ele (só os que estão abaixo da dobra)
 *  [data-header]   cabeçalho; ganha .is-scrolled depois de rolar um pouco
 *  [data-parallax] mídia do hero; desloca de leve conforme a rolagem
 *  [data-steps]    lista de etapas; marca com .is-reached os [data-step] já alcançados
 *  [data-nav-link] links do menu; o da seção visível recebe aria-current="location"
 */
export function initPublicMotion(root: HTMLElement): () => void {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  const motion = !reduce.matches;
  const cleanups: Array<() => void> = [];

  root.dataset.motion = motion ? "on" : "off";
  cleanups.push(() => {
    delete root.dataset.motion;
  });

  // 1) Entrada dos blocos ao rolar. Quem já está visível na carga nunca é escondido (sem "piscar").
  if (motion && "IntersectionObserver" in window) {
    const limit = window.innerHeight * 0.92;
    const pending = Array.from(root.querySelectorAll<HTMLElement>("[data-reveal]")).filter(
      (el) => el.getBoundingClientRect().top > limit,
    );
    pending.forEach((el) => el.classList.add("is-pending"));

    const reveal = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.remove("is-pending");
          reveal.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.1 },
    );
    pending.forEach((el) => reveal.observe(el));
    cleanups.push(() => {
      reveal.disconnect();
      pending.forEach((el) => el.classList.remove("is-pending"));
    });
  }

  // 2) Menu: destaca a seção que está na tela.
  const links = Array.from(root.querySelectorAll<HTMLAnchorElement>("[data-nav-link]"));
  const byId = new Map<string, HTMLAnchorElement>();
  for (const link of links) {
    const id = link.getAttribute("href")?.replace(/^#/, "");
    if (id) byId.set(id, link);
  }
  if ("IntersectionObserver" in window && byId.size > 0) {
    const sections = Array.from(byId.keys())
      .map((id) => root.querySelector<HTMLElement>(`#${CSS.escape(id)}`))
      .filter((el): el is HTMLElement => el !== null);
    const spy = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          links.forEach((link) => link.removeAttribute("aria-current"));
          byId.get(entry.target.id)?.setAttribute("aria-current", "location");
        }
      },
      { rootMargin: "-40% 0px -55% 0px" },
    );
    sections.forEach((section) => spy.observe(section));
    cleanups.push(() => {
      spy.disconnect();
      links.forEach((link) => link.removeAttribute("aria-current"));
    });
  }

  // 3) Efeitos ligados à rolagem: cabeçalho, deslocamento do hero e progresso das etapas.
  const header = root.querySelector<HTMLElement>("[data-header]");
  const parallax = root.querySelector<HTMLElement>("[data-parallax]");
  const steps = root.querySelector<HTMLElement>("[data-steps]");
  const stepItems = steps ? Array.from(steps.querySelectorAll<HTMLElement>("[data-step]")) : [];
  let frame = 0;

  const update = () => {
    frame = 0;
    const y = window.scrollY;
    header?.classList.toggle("is-scrolled", y > 8);

    if (motion && parallax && y < window.innerHeight) {
      parallax.style.setProperty("--shift", `${(y * 0.07).toFixed(1)}px`);
    }

    if (motion && steps) {
      const rect = steps.getBoundingClientRect();
      const raw = (window.innerHeight * 0.62 - rect.top) / Math.max(rect.height, 1);
      const progress = Math.min(1, Math.max(0, raw));
      stepItems.forEach((item, index) => {
        item.classList.toggle("is-reached", progress >= (index + 0.4) / stepItems.length);
      });
    }
  };
  const schedule = () => {
    if (!frame) frame = window.requestAnimationFrame(update);
  };

  update();
  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", schedule);
  cleanups.push(() => {
    window.removeEventListener("scroll", schedule);
    window.removeEventListener("resize", schedule);
    if (frame) window.cancelAnimationFrame(frame);
    header?.classList.remove("is-scrolled");
    parallax?.style.removeProperty("--shift");
    stepItems.forEach((item) => item.classList.remove("is-reached"));
  });

  return () => cleanups.forEach((fn) => fn());
}

export function usePublicMotion(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    return initPublicMotion(root);
  }, [ref]);
}
