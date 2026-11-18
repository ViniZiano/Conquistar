# Conquistar — arquitetura recomendada

## Objetivos arquiteturais

- Separar dados administrativos de dados clínicos e aplicar autorização no servidor.
- Preservar registros clínicos como uma linha do tempo acrescentada, sem exclusão destrutiva.
- Centralizar validação e regras de negócio em serviços, sem confiar no cliente.
- Manter persistência relacional em D1/SQLite, com chaves estrangeiras e índices orientados às buscas reais.
- Registrar autoria, data e entidade afetada em uma trilha de auditoria.

## Camadas

1. `app` e `components`: rotas, API protegida, telas responsivas e feedback ao usuário.
2. `lib/services`: casos de uso e autorização por perfil.
3. `lib/repositories`: consultas preparadas e persistência.
4. `lib/validation`: DTOs de entrada e validações de domínio.
5. `db`: esquema relacional, inicialização e migrações.

## Módulos

- Identidade e acesso: credenciais próprias por e-mail ou usuário, ativação híbrida dos usuários legados, perfis, status, associação explícita com médicos, rate limiting e sessões opacas no servidor.
- Pacientes: cadastro, pesquisa, atualização, arquivamento e exclusão somente sem histórico.
- Clínico: prontuário único, atendimentos imutáveis, prescrições, CID estruturado, exames e anexos privados em R2 com metadados no D1.
- Equipe: cadastro e associação de médicos.
- Agenda: compromissos internos diários, semanais e mensais.
- Auditoria: registro narrativo, filtrável e datado de acessos clínicos e mutações importantes.
- Governança: acompanhamento auditável de controles externos, responsáveis e evidências sem presumir a conclusão.

## Relacionamentos principais

- `users 1 — 0..1 doctors`: um usuário médico pode estar associado a um cadastro profissional.
- `patients 1 — 1 medical_records`: cada paciente recebe um prontuário único no cadastro.
- `medical_records 1 — N encounters`: o histórico é uma linha do tempo de atendimentos.
- `doctors 1 — N encounters`: cada atendimento identifica o médico responsável.
- `users 1 — N encounters`: o autor autenticado é registrado separadamente do médico.
- `encounters 1 — 0..1 prescriptions 1 — N prescription_medications`.
- `encounters 1 — N exam_requests`.
- `encounters 1 — N presented_exams 1 — 0..1 attachment`: metadados e hash no D1, conteúdo privado no R2.
- `doctors 1 — N appointments` e `users 1 — N appointments` como criador.
- `users 1 — N audit_logs` para autoria e rastreabilidade.
- `users 1 — N auth_sessions`: somente o hash do token opaco é persistido; sessões revogadas preservam a trilha técnica sem expor o cookie.

## Segurança

- Senhas próprias com PBKDF2-HMAC-SHA-256, salt aleatório por usuário e 100.000 iterações (teto do runtime workerd), somadas a senha mínima de 12 caracteres, limitação de tentativas e erro genérico; nunca há senha em texto puro, log ou resposta. O pentest pré-produção deve avaliar este limite e a migração futura para infraestrutura com Argon2id ou custo PBKDF2 mais alto.
- Sessão própria com token aleatório de 256 bits, apenas hash no D1 e cookie `HttpOnly`, `SameSite=Lax`, `Secure` em HTTPS, duração máxima de oito horas e revogação no logout, troca de senha, redefinição ou desativação.
- Rate limiting combina identificador e origem em hashes, limita cinco falhas por janela de quinze minutos e devolve mensagens genéricas para não confirmar a existência de contas.
- A identidade anterior da plataforma é aceita somente na rota explícita de ativação dos usuários já validados. O backend de produção não converte automaticamente uma identidade da plataforma em sessão do Conquistar; sem cookie próprio, páginas e APIs exigem novo login.
- Perfis `admin`, `doctor` e `reception`, com checagem em todos os serviços e endpoints.
- Administrador gerencia cadastros e auditoria sem acesso clínico implícito; Recepção não possui `clinical.read`; médico ativo e vinculado pode ler o histórico autorizado e criar atendimentos próprios.
- Queries preparadas, validação de CPF/telefone/data no servidor e arquivamento como regra para registros com histórico.
- Prontuários e atendimentos não têm rota de exclusão ou edição; a autoria é preservada separadamente do médico responsável.
- A auditoria armazena metadados e resumos operacionais, não a anamnese, diagnóstico, prescrição ou exames.
- O primeiro provisionamento legado continua disponível somente para compatibilidade; os usuários seguintes precisam ser pré-autorizados. A migration não recria IDs, perfis, vínculos médicos nem autoria.
- Respostas de API usam `private, no-store` e `nosniff`; anexos clínicos têm autorização própria, formato e tamanho limitados, hash, triagem de conteúdo e auditoria de upload/acesso.

## Matriz inicial de acesso

| Área | Administrador | Médico | Recepção |
| --- | --- | --- | --- |
| Usuários e auditoria | Gerencia | Não acessa | Não acessa |
| Pacientes administrativos | Gerencia e arquiva | Consulta | Cadastra e atualiza |
| Prontuário e histórico | Sem acesso implícito | Consulta | Sem acesso |
| Novo atendimento | Não registra | Registra como médico vinculado | Não registra |
| Agenda | Gerencia | Própria agenda | Informações básicas |

## Evolução futura

- Serviço transacional de e-mail para recuperação autônoma por token de uso único; até sua configuração, a redefinição é assistida por administrador com senha temporária e troca obrigatória.
- Políticas de acesso por equipe/unidade e consentimentos do paciente.
- Assinatura digital, versionamento por adendo e exportação clínica padronizada.
- Solução antimalware formal e política jurídica de retenção para anexos.
- Execução externa de pentest, revisão jurídica/LGPD, testes de backup/retenção e exercícios do plano de incidentes; o sistema acompanha, mas não substitui esses trabalhos.
- Integrações com laboratórios, faturamento, convênios e interoperabilidade em padrões de saúde.
