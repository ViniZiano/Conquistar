# Conquistar

**Com trabalho se conquista.**

Sistema de gestão para clínica médica de pequeno porte, com foco no fluxo **Paciente → Prontuário → Histórico → Médico → Continuidade do atendimento**.

## Funcionalidades

- Login próprio por e-mail ou usuário, senha protegida, sessão no servidor, bloqueio contra força bruta e perfis Administrador, Médico e Recepção.
- Dashboard por perfil, busca global e atalhos operacionais.
- Pacientes com validação de CPF, telefone e data de nascimento.
- Prontuário único, linha do tempo, evolução, prescrição, CID estruturado e exames com anexos privados.
- Cadastro de médicos e associação com usuários.
- Agenda interna diária, semanal e mensal.
- Auditoria narrativa e filtrável de acessos clínicos e alterações importantes, sem duplicar conteúdo sensível.
- Arquivamento seguro de pacientes e revogação de acessos, preservando vínculos e histórico.
- Persistência relacional em Cloudflare D1/SQLite.
- Governança operacional para acompanhar pentest, revisão jurídica/LGPD, backup/retenção e resposta a incidentes com responsável e evidência.

## Organização

- `app/`: páginas e endpoints protegidos.
- `components/`: interface, formulários e componentes de produto.
- `lib/services/`: casos de uso, autorização e regras de negócio.
- `lib/repositories/`: consultas e persistência.
- `lib/validation/`: validações de entrada.
- `db/` e `drizzle/`: esquema e migrações.
- `docs/architecture.md`: decisões, entidades e evolução planejada.

## Desenvolvimento

Requer Node.js 22.13 ou superior.

```bash
pnpm install
pnpm run dev
pnpm run build
pnpm test
pnpm run test:integration # com o servidor local ativo
```

### Primeiro administrador no ambiente local

Para criar a primeira conta durante o desenvolvimento local, copie `.env.example` para `.env.local` e gere um token aleatório com `node -e "console.log(require('crypto').randomBytes(32).toString(\'hex\'))"`. Adicione o resultado em `CONQUISTAR_BOOTSTRAP_TOKEN`, reinicie `pnpm dev` e abra `/configurar-administrador`. O cadastro exige esse token, aceita somente requisições em localhost e só funciona enquanto a tabela `users` estiver vazia. Depois de criar a conta, remova `CONQUISTAR_BOOTSTRAP_TOKEN` do `.env.local` e reinicie o servidor.

Usuários precisam ser cadastrados previamente. Contas existentes podem criar a própria senha por meio da identidade já validada, sem troca de ID, perfil, vínculo médico ou autoria; administradores também podem definir uma senha temporária com troca obrigatória. As senhas usam PBKDF2-HMAC-SHA-256 com salt aleatório e 100.000 iterações, teto imposto pelo runtime workerd; política de 12 caracteres, limitação de tentativas e resposta genérica são controles compensatórios. Antes do uso assistencial real, a autenticação deve ser incluída no pentest e recomenda-se avaliar uma infraestrutura que comporte Argon2id ou o custo PBKDF2 vigente recomendado. A sessão usa cookie `HttpOnly`, `SameSite=Lax` e `Secure` em produção, com token opaco armazenado apenas como hash. Contas médicas ativas continuam exigindo cadastro profissional associado.

Sem um serviço transacional de e-mail configurado, a recuperação é assistida pelo administrador. O sistema nunca envia, exibe ou registra a senha existente.

Por separação de responsabilidade, o Administrador gerencia cadastros e auditoria, mas não recebe acesso clínico automaticamente. Médicos ativos e vinculados podem consultar a continuidade do prontuário e registrar seus próprios atendimentos. A Recepção acessa somente dados administrativos.

## Marca

Enquanto a logo oficial não estiver disponível, a interface mostra um monograma temporário claramente identificado. Para aplicar a logo real sem alterar código, substitua exatamente `public/conquistar-logo.svg` pela arte vetorial oficial.

## Segurança para produção assistencial

Esta versão adota menor privilégio, consultas preparadas, respostas privadas sem cache, validação no servidor, registros clínicos acrescentados ao histórico, bloqueios de exclusão e auditoria. Anexos clínicos aceitam apenas PDF/JPG/PNG/WebP de até 10 MB, verificam assinatura de formato e conteúdo ativo conhecido, geram hash de integridade e ficam privados e imutáveis. Essa triagem técnica não substitui a validação independente de uma solução antimalware formal.

Antes do uso com pacientes reais, a clínica ainda deve concluir e documentar pentest independente, revisão jurídica/LGPD, política e testes de backup/retenção e plano de resposta a incidentes. Esses itens são acompanhados no próprio sistema, mas não são marcados como concluídos automaticamente.

## Site institucional

A rota `/` apresenta o site público da Conquistar. O acesso interno da equipe permanece separado em `/acesso`; o painel autenticado continua em `/app` e mantém os controles de perfil já existentes.

Antes de publicar, copie `.env.example` para `.env.local` e preencha os dados oficiais da clínica. `NEXT_PUBLIC_CLINIC_WHATSAPP` deve conter DDI, DDD e número, somente dígitos (por exemplo, 55 + DDD + número). O formulário abre uma conversa no WhatsApp; caso não haja WhatsApp configurado, poderá usar `NEXT_PUBLIC_CLINIC_EMAIL` como alternativa. Telefone, endereço e horário são exibidos somente quando preenchidos.

As fotografias da página pública são imagens ilustrativas carregadas do Unsplash. Substitua-as por fotografias autorizadas da própria clínica antes da publicação definitiva, caso prefira imagens institucionais.
