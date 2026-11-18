import { useEffect, type RefObject } from "react";

/**
 * Coreografia e movimento da página pública da Conquistar.
 * Aprimoramento progressivo: sem JS ou com "prefers-reduced-motion: reduce",
 * todo o conteúdo permanece visível e estático.
 */
export function initPublicMotion(root: HTMLElement): () => void {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  const motion = !reduce.matches;
  const cleanups: Array<() => void> = [];

  root.dataset.motion = motion ? "on" : "off";
  cleanups.push(() => {
    delete root.dataset.motion;
  });

  // 1) Revelação escalonada ao rolar (apenas elementos abaixo da dobra inicial)
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
      { rootMargin: "0px 0px -7% 0px", threshold: 0.08 },
    );
    pending.forEach((el) => reveal.observe(el));
    cleanups.push(() => {
      reveal.disconnect();
      pending.forEach((el) => el.classList.remove("is-pending"));
    });
  }

  // 2) Scrollspy da navegação principal
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
      { rootMargin: "-38% 0px -55% 0px" },
    );
    sections.forEach((section) => spy.observe(section));
    cleanups.push(() => {
      spy.disconnect();
      links.forEach((link) => link.removeAttribute("aria-current"));
    });
  }

  // 3) Efeitos contínuos ligados à rolagem:
  //    - Cabeçalho elevado + barra de progresso editorial
  //    - Parallax suave da fotografia do hero
  //    - Trilho contínuo das etapas de preparo
  const header = root.querySelector<HTMLElement>("[data-header]");
  const progressBar = root.querySelector<HTMLElement>("[data-scroll-progress]");
  const parallax = root.querySelector<HTMLElement>("[data-parallax]");
  const steps = root.querySelector<HTMLElement>("[data-steps]");
  const stepItems = steps ? Array.from(steps.querySelectorAll<HTMLElement>("[data-step]")) : [];
  let frame = 0;

  const update = () => {
    frame = 0;
    const y = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const ratio = docHeight > 0 ? Math.min(1, Math.max(0, y / docHeight)) : 0;

    header?.classList.toggle("is-scrolled", y > 10);
    if (progressBar) {
      progressBar.style.transform = `scaleX(${ratio.toFixed(4)})`;
    }

    if (motion && parallax && y < window.innerHeight * 1.15) {
      parallax.style.setProperty("--shift", `${(y * 0.08).toFixed(1)}px`);
    }

    if (motion && steps) {
      const rect = steps.getBoundingClientRect();
      const raw = (window.innerHeight * 0.65 - rect.top) / Math.max(rect.height, 1);
      const progress = Math.min(1, Math.max(0, raw));
      steps.style.setProperty("--journey-progress", progress.toFixed(3));
      stepItems.forEach((item, index) => {
        item.classList.toggle("is-reached", progress >= (index + 0.35) / stepItems.length);
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
    progressBar?.style.removeProperty("transform");
    parallax?.style.removeProperty("--shift");
    steps?.style.removeProperty("--journey-progress");
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