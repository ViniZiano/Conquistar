"use client";

import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from "react";
import { usePublicMotion } from "./usePublicMotion";

type IconName =
  | "arrow"
  | "caret"
  | "check"
  | "clock"
  | "mail"
  | "menu"
  | "phone"
  | "pin"
  | "plus"
  | "shield"
  | "user"
  | "x";

const iconPaths: Record<IconName, string> = {
  arrow: "M5 12h14M13 6l6 6-6 6",
  caret: "m6 9 6 6 6-6",
  check: "m5 12.5 4.2 4.2L19 7",
  clock: "M12 7v5l3 2m6-2a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
  mail: "M3 6h18v12H3V6Zm0 1 9 6.5L21 7",
  menu: "M4 7h16M4 12h16M4 17h16",
  phone: "M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.4 19.4 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7l.4 2.8a2 2 0 0 1-.6 1.7L7.1 10a16 16 0 0 0 6 6l1.8-1.8a2 2 0 0 1 1.7-.6l2.8.4a2 2 0 0 1 1.6 1.9Z",
  pin: "M12 21s7-5.2 7-11a7 7 0 1 0-14 0c0 5.8 7 11 7 11Zm0-8.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z",
  plus: "M12 5v14M5 12h14",
  shield: "M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Zm-3-11 2 2 4-4",
  user: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2m8-10a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z",
  x: "M18 6 6 18M6 6l12 12",
};

function Icon({ name, className = "" }: { name: IconName; className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={iconPaths[name]} />
    </svg>
  );
}

/** Atraso escalonado: cada item de uma lista entra um pouco depois do anterior. */
const stagger = (index: number) => ({ "--i": index }) as CSSProperties;
const pad = (index: number) => String(index + 1).padStart(2, "0");

const navigation = [
  { label: "Início", href: "#inicio" },
  { label: "A clínica", href: "#sobre" },
  { label: "Atendimento", href: "#servicos", menu: true },
  { label: "Orientações", href: "#orientacoes" },
  { label: "Contato", href: "#contato" },
];

const quickLinks = [
  { title: "Solicitar atendimento", text: "Entre em contato para consultar horários.", href: "#contato" },
  { title: "Conhecer o atendimento", text: "Veja como funciona a jornada na clínica.", href: "#servicos" },
  { title: "Tirar dúvidas", text: "Encontre orientações para sua visita.", href: "#orientacoes" },
  { title: "Área da equipe", text: "Acesso ao ambiente interno da clínica.", href: "/acesso" },
];

const services = [
  {
    id: "consulta",
    title: "Consulta e avaliação",
    text: "Um momento para conversar sobre suas necessidades e receber orientação profissional.",
  },
  {
    id: "acompanhamento",
    title: "Acompanhamento",
    text: "Organização dos retornos e continuidade do cuidado conforme a orientação recebida.",
  },
  {
    id: "agendamento",
    title: "Agendamento",
    text: "Solicite informações sobre horários e disponibilidade com nossa equipe.",
  },
  {
    id: "informacoes",
    title: "Informações ao paciente",
    text: "Orientações administrativas para ajudar você a se preparar para o atendimento.",
  },
];

const commitments = [
  { title: "Acolhimento", text: "Atenção à pessoa, à sua história e às suas necessidades." },
  { title: "Privacidade", text: "Respeito às informações e à confidencialidade." },
  { title: "Organização", text: "Informações e etapas do atendimento bem organizadas." },
  { title: "Clareza", text: "Comunicação simples para orientar cada etapa." },
];

const steps = [
  { title: "Solicite informações", text: "Informe seu nome e telefone para que a equipe possa orientar os próximos passos." },
  { title: "Confirme os detalhes", text: "Verifique data, horário, endereço e orientações específicas antes de sair." },
  { title: "Cuide dos seus dados", text: "Compartilhe informações de saúde apenas pelos canais indicados pela clínica." },
];

const faqs = [
  {
    question: "Como faço para solicitar um atendimento?",
    answer: "Preencha o formulário desta página com seu nome, telefone e o assunto. A solicitação será encaminhada pelo canal oficial configurado pela clínica.",
  },
  {
    question: "Quais informações devo levar?",
    answer: "A equipe poderá orientar você sobre os documentos e informações necessários conforme o tipo de atendimento solicitado.",
  },
  {
    question: "Como posso confirmar um horário?",
    answer: "Entre em contato pelos canais oficiais da clínica para consultar disponibilidade e confirmar os detalhes do atendimento.",
  },
  {
    question: "Posso enviar exames ou informações de saúde pelo formulário?",
    answer: "Não. Por segurança, não envie exames, documentos pessoais ou detalhes clínicos por este formulário público. Utilize apenas os canais orientados pela equipe.",
  },
];

const aboutChecks = [
  "Atenção às necessidades de cada paciente",
  "Orientações claras sobre o atendimento",
  "Organização das consultas e retornos",
  "Respeito à privacidade das informações",
];

const clinicWhatsApp = (process.env.NEXT_PUBLIC_CLINIC_WHATSAPP ?? "").replace(/\D/g, "");
const clinicEmail = process.env.NEXT_PUBLIC_CLINIC_EMAIL ?? "";
const clinicPhone = process.env.NEXT_PUBLIC_CLINIC_PHONE ?? "";
const clinicAddress = process.env.NEXT_PUBLIC_CLINIC_ADDRESS ?? "";
const clinicHours = process.env.NEXT_PUBLIC_CLINIC_HOURS ?? "";
const clinicPhoneHref = clinicPhone ? `tel:${clinicPhone.replace(/[^\d+]/g, "")}` : "";

export function PublicLanding({ fontClassName = "" }: { fontClassName?: string }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const groupRef = useRef<HTMLDivElement>(null);
  const caretRef = useRef<HTMLButtonElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [groupOpen, setGroupOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [reason, setReason] = useState("Consulta ou avaliação");
  const [feedback, setFeedback] = useState("");

  usePublicMotion(rootRef);

  // Fecha o menu do cabeçalho com Esc ou clicando fora.
  useEffect(() => {
    if (!menuOpen && !groupOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (groupOpen) caretRef.current?.focus();
      setGroupOpen(false);
      setMenuOpen(false);
    };
    const onPointer = (event: MouseEvent) => {
      if (groupRef.current && !groupRef.current.contains(event.target as Node)) setGroupOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("click", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("click", onPointer);
    };
  }, [menuOpen, groupOpen]);

  function closeMenus() {
    setMenuOpen(false);
    setGroupOpen(false);
  }

  function submitContact(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback("");

    const message = [
      "Olá! Gostaria de solicitar informações sobre atendimento na Conquistar.",
      `Nome: ${name.trim()}`,
      `Telefone: ${phone.trim()}`,
      `Assunto: ${reason}`,
    ].join("\n");

    if (clinicWhatsApp) {
      window.open(
        `https://wa.me/${clinicWhatsApp}?text=${encodeURIComponent(message)}`,
        "_blank",
        "noopener,noreferrer",
      );
      setFeedback("O WhatsApp foi aberto com sua solicitação preenchida. Revise a mensagem antes de enviar.");
      return;
    }

    if (clinicEmail) {
      window.location.href = `mailto:${clinicEmail}?subject=${encodeURIComponent("Solicitação de atendimento")}&body=${encodeURIComponent(message)}`;
      setFeedback("Seu aplicativo de e-mail foi aberto com a solicitação preenchida.");
      return;
    }

    setFeedback("O formulário está pronto, mas o canal oficial ainda não foi configurado. Entre em contato com a clínica por um meio já informado por ela.");
  }

  return (
    <div className={`cq ${fontClassName}`} ref={rootRef}>
      <a className="cq-skip" href="#conteudo">Pular para o conteúdo</a>

      <header className="cq-header" data-header>
        <div className="cq-wrap cq-header-inner">
          <a className="cq-brand" href="#inicio" aria-label="Conquistar — início" onClick={closeMenus}>
            <img src="/conquistar-logo.svg" alt="" width={40} height={40} />
            <span>
              <strong>Conquistar</strong>
              <small>Com trabalho se conquista</small>
            </span>
          </a>

          <nav id="site-navigation" className={`cq-nav ${menuOpen ? "is-open" : ""}`} aria-label="Navegação principal">
            {navigation.map((item) =>
              item.menu ? (
                <div className="cq-nav-group" key={item.href} ref={groupRef} data-open={groupOpen}>
                  <a href={item.href} data-nav-link onClick={closeMenus}>{item.label}</a>
                  <button
                    ref={caretRef}
                    className="cq-caret"
                    type="button"
                    aria-label="Ver tipos de atendimento"
                    aria-expanded={groupOpen}
                    aria-controls="menu-atendimento"
                    onClick={() => setGroupOpen((open) => !open)}
                  >
                    <Icon name="caret" />
                  </button>
                  <div className="cq-mega" id="menu-atendimento">
                    <p className="cq-mega-label">Atendimento</p>
                    <ul>
                      {services.map((service) => (
                        <li key={service.id}>
                          <a href={`#${service.id}`} onClick={closeMenus}>
                            <strong>{service.title}</strong>
                            <small>{service.text}</small>
                          </a>
                        </li>
                      ))}
                    </ul>
                    <a className="cq-mega-foot" href="#contato" onClick={closeMenus}>
                      Precisa de ajuda? Fale com a equipe <Icon name="arrow" />
                    </a>
                  </div>
                </div>
              ) : (
                <a key={item.href} href={item.href} data-nav-link onClick={closeMenus}>{item.label}</a>
              ),
            )}
            <a className="cq-nav-staff" href="/acesso">Acesso da equipe <Icon name="arrow" /></a>
          </nav>

          <div className="cq-header-actions">
            {clinicPhone ? (
              <a className="cq-header-phone" href={clinicPhoneHref}>
                <Icon name="phone" />
                <span><strong>{clinicPhone}</strong><small>Fale com a clínica</small></span>
              </a>
            ) : null}
            <a className="cq-staff-link" href="/acesso"><Icon name="user" /> Área da equipe</a>
            <a className="cq-btn cq-btn-primary cq-header-cta" href="#contato">Solicitar atendimento <Icon name="arrow" /></a>
            <button
              className="cq-menu-toggle"
              type="button"
              aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}
              aria-expanded={menuOpen}
              aria-controls="site-navigation"
              onClick={() => setMenuOpen((open) => !open)}
            >
              <Icon name={menuOpen ? "x" : "menu"} />
            </button>
          </div>
        </div>
      </header>

      <main id="conteudo">
        <section className="cq-hero" id="inicio" aria-labelledby="hero-title">
          <div className="cq-wrap cq-hero-grid">
            <div className="cq-hero-copy">
              <p className="cq-kicker cq-hero-in" style={stagger(0)}>Cuidado e atenção à saúde</p>
              <h1 id="hero-title">
                <span className="cq-line"><span style={stagger(0)}>Seu cuidado</span></span>
                <span className="cq-line"><span style={stagger(1)}>merece <em>atenção</em></span></span>
                <span className="cq-line"><span style={stagger(2)}><em>por inteiro.</em></span></span>
              </h1>
              <p className="cq-lead cq-hero-in" style={stagger(3)}>
                Na Conquistar, cada atendimento começa com escuta, informação clara e respeito à sua história.
              </p>
              <div className="cq-actions cq-hero-in" style={stagger(4)}>
                <a className="cq-btn cq-btn-primary" href="#contato">Solicitar atendimento <Icon name="arrow" /></a>
                <a className="cq-btn cq-btn-ghost" href="#sobre">Conheça a clínica</a>
              </div>
              <a className="cq-scroll-hint cq-hero-in" style={stagger(5)} href="#atalhos">
                Role para conhecer <Icon name="caret" />
              </a>
            </div>

            <div className="cq-hero-media">
              <div className="cq-hero-plate">
                <div className="cq-hero-parallax" data-parallax>
                  <img
                    src="/clinic-hero.webp"
                    alt="Profissionais da saúde trabalhando em um laboratório moderno"
                    width={1672}
                    height={941}
                    fetchPriority="high"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="cq-wrap">
            <ul className="cq-facts cq-hero-in" style={stagger(6)}>
              <li><strong>Cuidado centrado em você</strong><small>Atenção em cada etapa</small></li>
              <li><strong>Respeito à privacidade</strong><small>Informações tratadas com cuidado</small></li>
              <li><Icon name="check" /><strong>Atendimento com atenção</strong></li>
              <li><Icon name="check" /><strong>Informações com responsabilidade</strong></li>
            </ul>
          </div>
        </section>

        <section className="cq-shortcuts" id="atalhos" aria-labelledby="quick-title">
          <div className="cq-wrap cq-shortcuts-grid">
            <h2 id="quick-title" data-reveal>Como podemos <em>ajudar?</em></h2>
            <ul>
              {quickLinks.map((item, index) => (
                <li key={item.title} data-reveal style={stagger(index)}>
                  <a className="cq-shortcut" href={item.href}>
                    <span className="cq-shortcut-index">{pad(index)}</span>
                    <span className="cq-shortcut-copy"><strong>{item.title}</strong><small>{item.text}</small></span>
                    <Icon name="arrow" className="cq-shortcut-arrow" />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="cq-section cq-services" id="servicos" aria-labelledby="services-title">
          <div className="cq-wrap cq-split">
            <div className="cq-split-intro" data-reveal>
              <p className="cq-kicker">Atendimento Conquistar</p>
              <h2 id="services-title">Informação e cuidado em <em>cada etapa.</em></h2>
              <p>Conheça os principais caminhos para entrar em contato, organizar sua consulta e acompanhar seu atendimento.</p>
            </div>
            <div className="cq-service-list">
              {services.map((service, index) => (
                <article className="cq-service" id={service.id} key={service.id} data-reveal style={stagger(index)}>
                  <span className="cq-service-index">{pad(index)}</span>
                  <div>
                    <h3>{service.title}</h3>
                    <p>{service.text}</p>
                  </div>
                  <a href="#contato">Saiba mais <Icon name="arrow" /></a>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="cq-commitments" aria-label="Compromissos da Conquistar">
          <div className="cq-wrap cq-commitment-grid">
            {commitments.map((item, index) => (
              <div className="cq-commitment" key={item.title} data-reveal style={stagger(index)}>
                <span className="cq-commitment-mark" aria-hidden="true">{pad(index)}</span>
                <strong>{item.title}</strong>
                <small>{item.text}</small>
              </div>
            ))}
          </div>
        </section>

        <section className="cq-section cq-about" id="sobre" aria-labelledby="about-title">
          <div className="cq-wrap cq-about-grid">
            <figure className="cq-statement" data-reveal>
              <span className="cq-statement-label">Conquistar</span>
              <blockquote>
                <p>Cuidado bem organizado faz parte de uma boa experiência.</p>
              </blockquote>
              <figcaption>
                <span>Da primeira informação ao acompanhamento, cada etapa merece atenção.</span>
                <strong>Com trabalho se conquista</strong>
              </figcaption>
            </figure>
            <div className="cq-about-copy">
              <p className="cq-kicker" data-reveal>Sobre a Conquistar</p>
              <h2 id="about-title" data-reveal>Uma clínica que valoriza <em>pessoas e histórias.</em></h2>
              <p data-reveal>
                A Conquistar acredita que um atendimento de qualidade envolve mais do que uma consulta: envolve acolhimento, comunicação clara e responsabilidade com cada informação.
              </p>
              <ul className="cq-checks">
                {aboutChecks.map((item, index) => (
                  <li key={item} data-reveal style={stagger(index)}>
                    <svg className="cq-check" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d={iconPaths.check} pathLength={1} />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
              <div data-reveal>
                <a className="cq-btn cq-btn-ghost" href="#contato">Fale com nossa equipe <Icon name="arrow" /></a>
              </div>
            </div>
          </div>
        </section>

        <section className="cq-section cq-journey" id="orientacoes" aria-labelledby="journey-title">
          <div className="cq-wrap cq-split">
            <div className="cq-split-intro" data-reveal>
              <p className="cq-kicker">Antes do atendimento</p>
              <h2 id="journey-title">Informações que ajudam você a se <em>preparar.</em></h2>
              <p>Para tornar o primeiro contato mais simples, confira algumas orientações gerais.</p>
              <a className="cq-link" href="#contato">Precisa de ajuda? Fale conosco <Icon name="arrow" /></a>
            </div>
            <ol className="cq-steps" data-steps>
              {steps.map((step, index) => (
                <li className="cq-step" key={step.title} data-step data-reveal>
                  <span className="cq-step-num">{pad(index)}</span>
                  <div>
                    <h3>{step.title}</h3>
                    <p>{step.text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="cq-section cq-faq" id="duvidas" aria-labelledby="faq-title">
          <div className="cq-wrap cq-split">
            <div className="cq-split-intro" data-reveal>
              <p className="cq-kicker">Dúvidas frequentes</p>
              <h2 id="faq-title">Podemos ajudar com <em>alguma informação?</em></h2>
              <p>Reunimos respostas para facilitar seu primeiro contato com a Conquistar.</p>
              <a className="cq-link" href="#contato">Entre em contato com a equipe <Icon name="arrow" /></a>
            </div>
            <div className="cq-faq-list">
              {faqs.map((faq, index) => (
                <details key={faq.question} open={index === 0} data-reveal style={stagger(index)}>
                  <summary><span>{faq.question}</span><Icon name="plus" /></summary>
                  <p>{faq.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="cq-contact" id="contato" aria-labelledby="contact-title">
          <div className="cq-wrap cq-contact-grid">
            <div className="cq-contact-copy" data-reveal>
              <p className="cq-kicker">Fale com a Conquistar</p>
              <h2 id="contact-title">Vamos ajudar você a dar o <em>próximo passo?</em></h2>
              <p>Envie uma solicitação e nossa equipe poderá orientar você sobre os canais e as etapas de atendimento.</p>
              <ul className="cq-contact-details">
                {clinicPhone ? <li><a href={clinicPhoneHref}><Icon name="phone" /><span><small>Telefone</small><strong>{clinicPhone}</strong></span></a></li> : null}
                {clinicEmail ? <li><a href={`mailto:${clinicEmail}`}><Icon name="mail" /><span><small>E-mail</small><strong>{clinicEmail}</strong></span></a></li> : null}
                {clinicAddress ? <li><div><Icon name="pin" /><span><small>Endereço</small><strong>{clinicAddress}</strong></span></div></li> : null}
                {clinicHours ? <li><div><Icon name="clock" /><span><small>Horário de atendimento</small><strong>{clinicHours}</strong></span></div></li> : null}
                {!clinicPhone && !clinicEmail && !clinicAddress && !clinicHours ? (
                  <li><div><Icon name="shield" /><span><small>Informações da clínica</small><strong>Os canais oficiais de contato serão apresentados aqui quando configurados.</strong></span></div></li>
                ) : null}
              </ul>
              <p className="cq-contact-privacy"><Icon name="shield" /> Não envie exames, documentos ou detalhes clínicos pelo formulário público.</p>
            </div>

            <form className="cq-form" onSubmit={submitContact} data-reveal style={stagger(1)}>
              <div className="cq-form-heading">
                <span>Primeiro contato</span>
                <h3>Solicite informações</h3>
                <p>Preencha os campos abaixo. Não inclua informações de saúde.</p>
              </div>
              <label className="cq-field">
                <span>Seu nome</span>
                <input name="name" type="text" autoComplete="name" placeholder="Nome completo" value={name} onChange={(event) => setName(event.target.value)} required maxLength={100} />
              </label>
              <label className="cq-field">
                <span>Telefone / WhatsApp</span>
                <input name="phone" type="tel" autoComplete="tel" inputMode="tel" placeholder="(00) 00000-0000" value={phone} onChange={(event) => setPhone(event.target.value)} required maxLength={24} />
              </label>
              <label className="cq-field">
                <span>Assunto</span>
                <select name="reason" value={reason} onChange={(event) => setReason(event.target.value)}>
                  <option>Consulta ou avaliação</option>
                  <option>Informações sobre atendimento</option>
                  <option>Acompanhamento ou retorno</option>
                  <option>Outras dúvidas</option>
                </select>
              </label>
              <button className="cq-btn cq-btn-primary cq-submit" type="submit">Enviar solicitação <Icon name="arrow" /></button>
              {feedback ? <p className="cq-feedback" role="status">{feedback}</p> : null}
              <small className="cq-legal">Ao enviar, você autoriza o contato da equipe para responder a esta solicitação.</small>
            </form>
          </div>
        </section>
      </main>

      <footer className="cq-footer">
        <div className="cq-wrap cq-footer-main">
          <div className="cq-footer-brand">
            <a className="cq-brand cq-brand-inverse" href="#inicio">
              <img src="/conquistar-logo.svg" alt="" width={40} height={40} />
              <span><strong>Conquistar</strong><small>Com trabalho se conquista</small></span>
            </a>
            <p>Atendimento com atenção, organização e respeito em cada etapa.</p>
          </div>
          <div className="cq-footer-col">
            <strong>Institucional</strong>
            <a href="#sobre">A clínica</a>
            <a href="#servicos">Atendimento</a>
            <a href="#orientacoes">Orientações</a>
            <a href="#duvidas">Dúvidas frequentes</a>
          </div>
          <div className="cq-footer-col">
            <strong>Contato</strong>
            <a href="#contato">Solicitar atendimento</a>
            {clinicPhone ? <a href={clinicPhoneHref}>{clinicPhone}</a> : null}
            {clinicEmail ? <a href={`mailto:${clinicEmail}`}>{clinicEmail}</a> : null}
            {clinicAddress ? <span>{clinicAddress}</span> : null}
          </div>
          <div className="cq-footer-access">
            <span>Acesso restrito</span>
            <h3>Área da equipe</h3>
            <p>Ambiente interno destinado aos profissionais autorizados pela clínica.</p>
            <a href="/acesso">Acessar sistema <Icon name="arrow" /></a>
          </div>
        </div>
        <div className="cq-wrap cq-footer-bottom">
          <span>© {new Date().getFullYear()} Conquistar. Todos os direitos reservados.</span>
          <span>Privacidade e respeito em cada atendimento.</span>
          <a href="#inicio">Voltar ao início ↑</a>
        </div>
      </footer>
    </div>
  );
}
