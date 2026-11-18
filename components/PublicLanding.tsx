"use client";

import { useState, type FormEvent } from "react";

type IconName =
  | "arrow"
  | "calendar"
  | "check"
  | "chevron"
  | "clock"
  | "heart"
  | "heart-pulse"
  | "menu"
  | "message"
  | "phone"
  | "plus"
  | "shield"
  | "stethoscope"
  | "user"
  | "users"
  | "x";

const iconPaths: Record<IconName, string> = {
  arrow: "M5 12h14M12 5l7 7-7 7",
  calendar: "M8 2v4m8-4v4M3 9h18M5 4h14a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z",
  check: "m5 12 4 4L19 6",
  chevron: "m9 18 6-6-6-6",
  clock: "M12 8v4l3 2m6-2a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
  heart: "M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z",
  "heart-pulse": "M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8ZM3.5 12h4l2-3 3 6 2-3h5",
  menu: "M4 7h16M4 12h16M4 17h16",
  message: "M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8v.5Z",
  phone: "M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.4 19.4 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7l.4 2.8a2 2 0 0 1-.6 1.7L7.1 10a16 16 0 0 0 6 6l1.8-1.8a2 2 0 0 1 1.7-.6l2.8.4a2 2 0 0 1 1.6 1.9Z",
  plus: "M12 5v14M5 12h14",
  shield: "M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Zm-3-11 2 2 4-4",
  stethoscope: "M6 3v5a4 4 0 0 0 8 0V3M4 3h4m4 0h4m-6 9v2a6 6 0 0 0 12 0v-1m0 0a2 2 0 1 0-2-2 2 2 0 0 0 2 2Z",
  user: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2m8-10a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z",
  users: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m7-10a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm11 10v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
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

const navigation = [
  { label: "Início", href: "#inicio" },
  { label: "A clínica", href: "#sobre" },
  { label: "Atendimento", href: "#servicos" },
  { label: "Orientações", href: "#orientacoes" },
  { label: "Contato", href: "#contato" },
];

const quickLinks = [
  {
    icon: "calendar" as const,
    title: "Solicitar atendimento",
    text: "Entre em contato para consultar horários.",
    href: "#contato",
  },
  {
    icon: "stethoscope" as const,
    title: "Conhecer o atendimento",
    text: "Veja como funciona a jornada na clínica.",
    href: "#servicos",
  },
  {
    icon: "message" as const,
    title: "Tirar dúvidas",
    text: "Encontre orientações para sua visita.",
    href: "#orientacoes",
  },
  {
    icon: "users" as const,
    title: "Área da equipe",
    text: "Acesso ao ambiente interno da clínica.",
    href: "/acesso",
  },
];

const services = [
  {
    icon: "stethoscope" as const,
    title: "Consulta e avaliação",
    text: "Um momento para conversar sobre suas necessidades e receber orientação profissional.",
  },
  {
    icon: "heart-pulse" as const,
    title: "Acompanhamento",
    text: "Organização dos retornos e continuidade do cuidado conforme a orientação recebida.",
  },
  {
    icon: "calendar" as const,
    title: "Agendamento",
    text: "Solicite informações sobre horários e disponibilidade com nossa equipe.",
  },
  {
    icon: "message" as const,
    title: "Informações ao paciente",
    text: "Orientações administrativas para ajudar você a se preparar para o atendimento.",
  },
];

const commitments = [
  { icon: "heart" as const, title: "Acolhimento", text: "Atenção à pessoa, à sua história e às suas necessidades." },
  { icon: "shield" as const, title: "Privacidade", text: "Respeito às informações e à confidencialidade." },
  { icon: "users" as const, title: "Organização", text: "Informações e etapas do atendimento bem organizadas." },
  { icon: "message" as const, title: "Clareza", text: "Comunicação simples para orientar cada etapa." },
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

const clinicWhatsApp = (process.env.NEXT_PUBLIC_CLINIC_WHATSAPP ?? "").replace(/\D/g, "");
const clinicEmail = process.env.NEXT_PUBLIC_CLINIC_EMAIL ?? "";
const clinicPhone = process.env.NEXT_PUBLIC_CLINIC_PHONE ?? "";
const clinicAddress = process.env.NEXT_PUBLIC_CLINIC_ADDRESS ?? "";
const clinicHours = process.env.NEXT_PUBLIC_CLINIC_HOURS ?? "";

export function PublicLanding() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [reason, setReason] = useState("Consulta ou avaliação");
  const [feedback, setFeedback] = useState("");

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
    <main className="public-site">
      <a className="skip-link" href="#conteudo">Pular para o conteúdo</a>

      <header className="public-header">
        <div className="public-container header-inner">
          <a className="public-brand" href="#inicio" aria-label="Conquistar — início">
            <span className="public-brand-mark"><Icon name="plus" /></span>
            <span className="public-brand-copy">
              <strong>Conquistar</strong>
              <small>Com trabalho se conquista</small>
            </span>
          </a>

          <nav id="site-navigation" className={`public-nav ${menuOpen ? "is-open" : ""}`} aria-label="Navegação principal">
            {navigation.map((item) => (
              <a key={item.href} href={item.href} onClick={() => setMenuOpen(false)}>{item.label}</a>
            ))}
            <a className="nav-mobile-access" href="/acesso">Acesso da equipe <Icon name="arrow" /></a>
          </nav>

          <div className="header-actions">
            {clinicPhone ? (
              <a className="header-phone" href={`tel:${clinicPhone.replace(/[^\d+]/g, "")}`}>
                <span className="header-phone-icon"><Icon name="phone" /></span>
                <span><strong>{clinicPhone}</strong><small>Fale com a clínica</small></span>
              </a>
            ) : (
              <a className="staff-link" href="/acesso">Área da equipe</a>
            )}
            <a className="button button-primary header-cta" href="#contato">Solicitar atendimento <Icon name="arrow" /></a>
            <button
              className="menu-toggle"
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

      <div id="conteudo">
        <section className="public-hero" id="inicio">
          <div className="public-container hero-grid">
            <div className="hero-copy">
              <div className="section-kicker"><span /> CUIDADO E ATENÇÃO À SAÚDE</div>
              <h1>Seu cuidado merece <em>atenção por inteiro.</em></h1>
              <p>
                Na Conquistar, cada atendimento começa com escuta, informação clara e respeito à sua história.
              </p>
              <div className="hero-actions">
                <a className="button button-primary" href="#contato">Solicitar atendimento <Icon name="arrow" /></a>
                <a className="button button-outline" href="#sobre">Conheça a clínica</a>
              </div>
              <div className="hero-assurances">
                <span><Icon name="check" /> Atendimento com atenção</span>
                <span><Icon name="check" /> Informações com responsabilidade</span>
              </div>
            </div>

            <div className="hero-visual">
              <div className="hero-photo-frame">
                <img
                  src="/clinic-hero.webp"
                  alt="Profissionais da saúde trabalhando em um laboratório moderno"
                  fetchPriority="high"
                />
              </div>
              <div className="hero-info-card hero-info-top">
                <span className="hero-info-icon"><Icon name="heart-pulse" /></span>
                <span><strong>Cuidado centrado em você</strong><small>Atenção em cada etapa</small></span>
              </div>
              <div className="hero-info-card hero-info-bottom">
                <span className="hero-info-icon"><Icon name="shield" /></span>
                <span><strong>Respeito à privacidade</strong><small>Informações tratadas com cuidado</small></span>
              </div>
            </div>
          </div>
        </section>

        <section className="quick-section" aria-labelledby="quick-title">
          <div className="public-container quick-panel">
            <h2 id="quick-title">Como podemos ajudar?</h2>
            <div className="quick-grid">
              {quickLinks.map((item) => (
                <a className="quick-link" href={item.href} key={item.title}>
                  <span className="quick-icon"><Icon name={item.icon} /></span>
                  <span className="quick-copy"><strong>{item.title}</strong><small>{item.text}</small></span>
                  <Icon name="chevron" className="quick-arrow" />
                </a>
              ))}
            </div>
          </div>
        </section>

        <section className="public-section services-section" id="servicos">
          <div className="public-container">
            <div className="section-heading section-heading-centered">
              <div className="section-kicker"><span /> ATENDIMENTO CONQUISTAR</div>
              <h2>Informação e cuidado em <em>cada etapa.</em></h2>
              <p>Conheça os principais caminhos para entrar em contato, organizar sua consulta e acompanhar seu atendimento.</p>
            </div>
            <div className="service-grid">
              {services.map((service) => (
                <article className="service-card" key={service.title}>
                  <span className="service-icon"><Icon name={service.icon} /></span>
                  <h3>{service.title}</h3>
                  <p>{service.text}</p>
                  <a href="#contato">Saiba mais <Icon name="arrow" /></a>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="commitment-band" aria-label="Compromissos da Conquistar">
          <div className="public-container commitment-grid">
            {commitments.map((item) => (
              <div className="commitment-item" key={item.title}>
                <span><Icon name={item.icon} /></span>
                <div><strong>{item.title}</strong><small>{item.text}</small></div>
              </div>
            ))}
          </div>
        </section>

        <section className="public-section about-section" id="sobre">
          <div className="public-container about-grid">
            <div className="about-visual">
              <div className="about-card-mark"><Icon name="plus" /></div>
              <span className="about-card-label">CONQUISTAR</span>
              <h2>Cuidado bem organizado faz parte de uma boa experiência.</h2>
              <p>Da primeira informação ao acompanhamento, cada etapa merece atenção.</p>
              <div className="about-card-footer"><Icon name="heart-pulse" /><span>Com trabalho se conquista</span></div>
            </div>
            <div className="about-copy">
              <div className="section-kicker"><span /> SOBRE A CONQUISTAR</div>
              <h2>Uma clínica que valoriza <em>pessoas e histórias.</em></h2>
              <p>
                A Conquistar acredita que um atendimento de qualidade envolve mais do que uma consulta: envolve acolhimento, comunicação clara e responsabilidade com cada informação.
              </p>
              <ul className="about-check-list">
                <li><Icon name="check" /> Atenção às necessidades de cada paciente</li>
                <li><Icon name="check" /> Orientações claras sobre o atendimento</li>
                <li><Icon name="check" /> Organização das consultas e retornos</li>
                <li><Icon name="check" /> Respeito à privacidade das informações</li>
              </ul>
              <a className="button button-outline" href="#contato">Fale com nossa equipe <Icon name="arrow" /></a>
            </div>
          </div>
        </section>

        <section className="public-section information-section" id="orientacoes">
          <div className="public-container information-grid">
            <div className="information-intro">
              <div className="section-kicker"><span /> ANTES DO ATENDIMENTO</div>
              <h2>Informações que ajudam você a se <em>preparar.</em></h2>
              <p>Para tornar o primeiro contato mais simples, confira algumas orientações gerais.</p>
              <a href="#contato">Precisa de ajuda? Fale conosco <Icon name="arrow" /></a>
            </div>
            <div className="information-cards">
              <article><span className="information-number">01</span><div><h3>Solicite informações</h3><p>Informe seu nome e telefone para que a equipe possa orientar os próximos passos.</p></div></article>
              <article><span className="information-number">02</span><div><h3>Confirme os detalhes</h3><p>Verifique data, horário, endereço e orientações específicas antes de sair.</p></div></article>
              <article><span className="information-number">03</span><div><h3>Cuide dos seus dados</h3><p>Compartilhe informações de saúde apenas pelos canais indicados pela clínica.</p></div></article>
            </div>
          </div>
        </section>

        <section className="public-section faq-section" id="duvidas">
          <div className="public-container faq-grid">
            <div className="faq-intro">
              <div className="section-kicker"><span /> DÚVIDAS FREQUENTES</div>
              <h2>Podemos ajudar com <em>alguma informação?</em></h2>
              <p>Reunimos respostas para facilitar seu primeiro contato com a Conquistar.</p>
              <a href="#contato">Entre em contato com a equipe <Icon name="arrow" /></a>
            </div>
            <div className="faq-list">
              {faqs.map((faq, index) => (
                <details key={faq.question} open={index === 0}>
                  <summary><span>{faq.question}</span><Icon name="plus" /></summary>
                  <p>{faq.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="contact-section" id="contato">
          <div className="public-container contact-grid">
            <div className="contact-copy">
              <div className="section-kicker section-kicker-light"><span /> FALE COM A CONQUISTAR</div>
              <h2>Vamos ajudar você a dar o <em>próximo passo?</em></h2>
              <p>Envie uma solicitação e nossa equipe poderá orientar você sobre os canais e as etapas de atendimento.</p>
              <div className="contact-details">
                {clinicPhone ? <a href={`tel:${clinicPhone.replace(/[^\d+]/g, "")}`}><span><Icon name="phone" /></span><div><small>Telefone</small><strong>{clinicPhone}</strong></div></a> : null}
                {clinicEmail ? <a href={`mailto:${clinicEmail}`}><span><Icon name="message" /></span><div><small>E-mail</small><strong>{clinicEmail}</strong></div></a> : null}
                {clinicAddress ? <div><span><Icon name="plus" /></span><div><small>Endereço</small><strong>{clinicAddress}</strong></div></div> : null}
                {clinicHours ? <div><span><Icon name="clock" /></span><div><small>Horário de atendimento</small><strong>{clinicHours}</strong></div></div> : null}
                {!clinicPhone && !clinicEmail && !clinicAddress && !clinicHours ? (
                  <div className="contact-detail-note"><span><Icon name="shield" /></span><div><small>Informações da clínica</small><strong>Os canais oficiais de contato serão apresentados aqui quando configurados.</strong></div></div>
                ) : null}
              </div>
              <p className="contact-privacy">Não envie exames, documentos ou detalhes clínicos pelo formulário público.</p>
            </div>

            <form className="contact-form" onSubmit={submitContact}>
              <div className="contact-form-heading">
                <span>PRIMEIRO CONTATO</span>
                <h3>Solicite informações</h3>
                <p>Preencha os campos abaixo. Não inclua informações de saúde.</p>
              </div>
              <label>
                <span>Seu nome</span>
                <input name="name" type="text" autoComplete="name" placeholder="Nome completo" value={name} onChange={(event) => setName(event.target.value)} required maxLength={100} />
              </label>
              <label>
                <span>Telefone / WhatsApp</span>
                <input name="phone" type="tel" autoComplete="tel" inputMode="tel" placeholder="(00) 00000-0000" value={phone} onChange={(event) => setPhone(event.target.value)} required maxLength={24} />
              </label>
              <label>
                <span>Assunto</span>
                <select name="reason" value={reason} onChange={(event) => setReason(event.target.value)}>
                  <option>Consulta ou avaliação</option>
                  <option>Informações sobre atendimento</option>
                  <option>Acompanhamento ou retorno</option>
                  <option>Outras dúvidas</option>
                </select>
              </label>
              <button className="button button-primary contact-submit" type="submit">Enviar solicitação <Icon name="arrow" /></button>
              {feedback ? <p className="form-feedback" role="status">{feedback}</p> : null}
              <small className="form-legal">Ao enviar, você autoriza o contato da equipe para responder a esta solicitação.</small>
            </form>
          </div>
        </section>
      </div>

      <footer className="public-footer">
        <div className="public-container footer-main">
          <div className="footer-brand-block">
            <a className="public-brand public-brand-inverse" href="#inicio">
              <span className="public-brand-mark"><Icon name="plus" /></span>
              <span className="public-brand-copy"><strong>Conquistar</strong><small>Com trabalho se conquista</small></span>
            </a>
            <p>Atendimento com atenção, organização e respeito em cada etapa.</p>
          </div>
          <div className="footer-column"><strong>Institucional</strong><a href="#sobre">A clínica</a><a href="#servicos">Atendimento</a><a href="#orientacoes">Orientações</a><a href="#duvidas">Dúvidas frequentes</a></div>
          <div className="footer-column"><strong>Contato</strong><a href="#contato">Solicitar atendimento</a>{clinicPhone ? <a href={`tel:${clinicPhone.replace(/[^\d+]/g, "")}`}>{clinicPhone}</a> : null}{clinicEmail ? <a href={`mailto:${clinicEmail}`}>{clinicEmail}</a> : null}{clinicAddress ? <span>{clinicAddress}</span> : null}</div>
          <div className="footer-access"><span>ACESSO RESTRITO</span><h3>Área da equipe</h3><p>Ambiente interno destinado aos profissionais autorizados pela clínica.</p><a href="/acesso">Acessar sistema <Icon name="arrow" /></a></div>
        </div>
        <div className="public-container footer-bottom">
          <span>© {new Date().getFullYear()} Conquistar. Todos os direitos reservados.</span>
          <span>Privacidade e respeito em cada atendimento.</span>
          <a href="#inicio">Voltar ao início ↑</a>
        </div>
      </footer>
    </main>
  );
}
