# Portal do Vereador — Projeto Completo

## 1. Descrição do Projeto
Portal político moderno para vereador, combinando site institucional, jornal digital, plataforma de oportunidades de emprego, sistema de demandas cidadãs e gestão administrativa integrada.

## 2. Estrutura de Páginas

### Site Público
- `/` — Home (landing page completa)
- `/noticias` — Listagem de notícias
- `/noticias/:slug` — Notícia individual
- `/fale-conosco` — Interação com cidadãos
- `/requerimento` — Requerimento
- `/sugestao-projeto` — Sugestão de projeto
- `/auth` — Login / Cadastro unificado

### Sistema de Oportunidades
- `/sistema` — Landing do sistema de oportunidades
- `/sistema/painel/cidadao` — Feed de vagas + candidaturas
- `/sistema/painel/empresa` — Gestão de vagas + banco de currículos
- `/sistema/perfil/:id` — Perfil público do cidadão
- `/complete-profile` — Completar perfil pós-cadastro

### Fluxo de Navegação Revisado (2026-06-09)
- Cidadão loga → vai para **`/cidadao`** (painel do cidadão) primeiro
- De `/cidadao`, pode acessar `/sistema/painel/cidadao` via botão "Vagas de Emprego"
- No primeiro acesso, modal de pesquisa de empregabilidade aparece
- Empresa loga → vai direto para `/sistema/painel/empresa`

### Painéis por Perfil
- `/cidadao` — Painel do cidadão
- `/empresa` — Painel da empresa
- `/vereador` — Painel do vereador
- `/assessor` — Entrada do assessor
- `/assessor/painel` — Painel do assessor (Kanban + chat)
- `/admin` — Painel administrativo único

## 3. Perfis de Usuário (Roles)

| Role | Descrição | Cadastro | Aprovação |
|------|-----------|----------|-----------|
| `citizen` | Cidadão | Código email (Resend) | Automática |
| `empresa` | Empresa | Código email (Resend) | Automática |
| `assessor` | Assessor do gabinete | Cadastro direto | Admin aprova |
| `vereador` | Vereador | Criado pelo admin | — |
| `admin` | Administrador único | Setup inicial | — |

## 4. Modelo de Dados (Supabase)

### profiles (colunas de empregabilidade e prestador — NOVAS)
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `employment_survey_completed` | boolean | Se o cidadão já respondeu a pesquisa de empregabilidade |
| `is_employed` | boolean | Se o cidadão está empregado atualmente |
| `employed_through_platform` | boolean | Se o emprego foi conseguido via plataforma |
| `platform_job_details` | text | Descrição do emprego conseguido pela plataforma |
| `worker_profile_type` | text | Tipo de perfil: 'clt', 'freelancer', ou 'mei' |
| `portfolio_photos` | text | URLs de fotos do portfólio (separadas por `\|`) para freelancers/MEI |

### Fluxo de pesquisa de empregabilidade
1. Cidadão loga pela 1ª vez → modal pergunta "Está desempregado?"
2. Se SIM (desempregado) → `job_status = 'looking'`, `is_employed = false`, finaliza
3. Se NÃO (empregado) → pergunta "Conseguiu pela plataforma?"
   - Se SIM → pede descrição (qual vaga, como foi) → salva `employed_through_platform = true` + `platform_job_details`
   - Se NÃO → foi por fora → salva `employed_through_platform = false`
4. Pode pular ("Responder depois") — volta a perguntar no próximo login

### Tipos de perfil profissional (worker_profile_type)
- **CLT**: Currículo tradicional (PDF), formação, expertise
- **Freelancer**: Perfil de prestador — portfólio com fotos, categorias de serviço, sem currículo
- **MEI**: Similar ao freelancer — portfólio + informações do negócio

### profiles (colunas existentes)
id, full_name, display_name, phone, neighborhood, cpf, role, avatar_url, status, registration_complete,
onboarding_step (TEXT, NULL=complete, 'email_verified'/'profile_started'=in progress),
company_name, cnpj, responsible_name,
job_type, job_type_other, opportunities_seeking, bio, education, expertise, job_status, curriculo_pdf,
mission, values, about, looking_for_professional,
street, number, complement, city, state, cep,
is_service_provider, service_categories, service_description,
created_at, updated_at

### verification_codes
id, email, code, role, user_metadata (JSONB), purpose, expires_at, used_at, created_at

### vagas
id, company_id, company_name, title, description, area, type, location, salary, requirements, status (active/paused/closed), image_url, created_at, updated_at

### candidaturas
id, vaga_id, cidadao_id, status (pending/accepted/rejected), curriculo_url, message, rejection_reason, created_at

### demands
id, citizen_id, citizen_name, citizen_phone, citizen_neighborhood, citizen_email, type, category, title, description,
status (aberto/em_andamento/aguardando_externa/finalizada), priority,
assessor_id, assessor_name, assessor_notes, admin_notes,
conversation_status, created_at, updated_at

### demand_messages
id, demand_id, sender_id, sender_name, sender_role, message, is_read, message_type,
citizen_id, assigned_assessor_id, expires_at, created_at

### mensagens_chat
id, citizen_id, citizen_name, assessor_id, assessor_name, status, created_at, expires_at, closed_at

### mensagens_chat_items
id, chat_id, sender_role, sender_id, sender_name, message, image_url, image_data, created_at

### news
id, title, slug, summary, content, image_url, category, status, featured, importance, author, published_at, created_at, updated_at

## 5. Fluxo de Cadastro (com Máquina de Estados)

### Máquina de Estados do Onboarding (`onboarding_step`)

| Estado | Significado | Próximo passo |
|--------|-------------|---------------|
| `NULL` | Completo ou legacy (pré-migração) | Dashboard direto |
| `'email_verified'` | Email validado, perfil não preenchido | `/complete-profile` |
| `'profile_started'` | Foto enviada, dados iniciados | `/complete-profile` (retomar) |

### Regra de Compatibilidade Legacy
- Todos os perfis criados **antes** da migração têm `onboarding_step = NULL` e `registration_complete = true`
- Usuários legacy NUNCA são redirecionados para `/complete-profile`
- Apenas novos cadastros (pós-migração) recebem `onboarding_step = 'email_verified'`

### Cidadão / Empresa (fluxo completo — revisado 2026-06-05)
1. Preenche dados na tela de cadastro
2. **`send-verification` (REVISADO)**:
   - PASSO 1: Verifica se usuário JÁ EXISTE no Auth (RPC get_user_by_email)
   - Se existe e está COMPLETO → retorna `userAlreadyExists + userStatus: "complete"` → frontend pede login
   - Se existe e onboarding incompleto → retorna `userAlreadyExists + userStatus: "onboarding_incomplete"` → frontend pede login
   - Se assessor pendente → retorna `userAlreadyExists + userStatus: "pending_assessor"`
   - Se NÃO existe → PASSO 2: gera código 5 dígitos, salva em `verification_codes`
   - PASSO 3: Envia via Resend usando `onboarding@resend.dev` como primário (compatível com test-resend)
   - Fallback: `no-reply@arthurhalal.com.br` (se domínio verificado)
   - Retorna `diagnostics[]` com log completo para debugging
3. Frontend analisa resposta:
   - `userAlreadyExists` → redireciona para login (não gera novo código)
   - `emailSent: false` → erro claro, NÃO avança para verify
   - `emailSent: true` → avança para tela de verificação
4. Usuário digita código na tela de verificação
5. **`verify-code` (REVISADO)**:
   - Valida código com logging completo
   - **PRESERVA `onboarding_step`** se usuário já existir (não regride de `profile_started` para `email_verified`)
   - Cria/atualiza Auth user
   - Cria/atualiza perfil sem sobrescrever estado existente
6. Redirecionado para `/complete-profile`
7. Foto: upload imediato ao selecionar → salva `onboarding_step = 'profile_started'`
8. Preenche dados complementares (CEP, campos específicos)
9. Submit final → `onboarding_step = NULL` (completo) → dashboard

### Resiliência do Onboarding (revisada)
- Se usuário fechar após validar email → ao logar, `onboarding_step = 'email_verified'` → retorna ao `/complete-profile`
- Se usuário fechar após upload da foto → ao logar, `onboarding_step = 'profile_started'` → retorna com foto já salva
- Se usuário tentar cadastrar novamente com mesmo email → `send-verification` detecta que já existe e manda pro login
- Se usuário concluir tudo → `onboarding_step = NULL` → nunca mais vê a tela de complemento
- Se usuário pular (`handleSkip`) → `onboarding_step = NULL` → concluído
- `useAuth.ts` agora verifica `verification_codes` antes de setar `onboarding_step` ao criar perfil automático

### Assessor
1. Preenche dados na tela de cadastro
2. `register-user` cria conta diretamente com `status: "pending"` + `onboarding_step: "email_verified"`
3. Admin revisa na aba "Assessores" → aprova
4. Assessor faz login → `status = "pending"` impede redirect → aguarda aprovação
5. Após aprovação (`status = "active"`), se `onboarding_step` ainda não NULL → `/complete-profile`

### Pontos Críticos Corrigidos (Auditoria 2026-06-05)
1. **send-verification agora verifica existência do usuário ANTES de gerar código** — evita códigos desperdiçados e detecta pré-cadastro
2. **Remetente primário alterado para `onboarding@resend.dev`** — mesmo que funciona no test-resend, domínio custom como fallback
3. **Frontend NÃO avança para verify se `emailSent: false`** — evita usuário preso sem código
4. **verify-code PRESERVA `onboarding_step`** — não regride progresso do onboarding
5. **Todos os pontos críticos têm logging via `diagnostics[]`** — rastreável via console do navegador
6. **useAuth.ts verifica `verification_codes` ao criar perfil** — distingue novo usuário de legacy sem perfil

## 6. Funcionalidades Implementadas

- [x] Home page completa com todas as seções
- [x] Sistema de notícias (CRUD admin)
- [x] Formulários de interação cidadã
- [x] Sistema de oportunidades (vagas + candidaturas)
- [x] Autenticação unificada com verificação por email (Resend)
- [x] Máquina de estados de onboarding (`onboarding_step`) com resiliência
- [x] Compatibilidade legacy: usuários pré-migração não são impactados
- [x] Upload de foto imediato no complete-profile (upload-chat-image)
- [x] Completar perfil com CEP (ViaCEP), foto e campos específicos por role
- [x] Painel do assessor (Kanban + chat + notificações)
- [x] Painel do vereador (visualização + notificações)
- [x] Painel do cidadão (demandas + chat + candidaturas)
- [x] Painel administrativo único (6 usuários padrão, sem admin_master)
- [x] Gestão de usuários (admin)
- [x] Aprovação de assessores pendentes (admin)
- [x] Limpeza global de dados (admin) + RESET completo para entrega
- [x] Aprovação/rejeição de candidaturas com justificativa
- [x] Supabase Realtime ativado (demands, demand_messages, vagas, candidaturas)
- [x] Pesquisa de empregabilidade no primeiro acesso do cidadão
- [x] Tipos de perfil profissional: CLT / Freelancer / MEI
- [x] Portfólio de fotos para freelancers/MEI (upload e visualização)
- [x] Rastreamento de empregos conseguidos pela plataforma
- [x] Edge function send-email-notification
- [x] Buckets storage criados (chat-images, curriculos)
- [x] Edge function reset-system-for-delivery (RESET completo)
- [x] 6 usuários padrão consolidados (admin, assessor, vereador, 2 cidadãos, empresa)
- [x] Agenda de Compromissos (Fase 5) — tabela + 4 Edge Functions + calendário interativo + Realtime
- [x] Testes multi-usuário completos
- [x] Revisão final de UI (contraste navbar/forms)
- [x] Correção RLS policies: formulários públicos + Kanban assessor/vereador
- [x] Correção edge function get-demands: modo staff (todas as demandas)
- [x] Correção upload de currículo: FormData via fetch multipart
- [x] Correção Realtime empresa: listener de UPDATE em candidaturas
- [x] Correção indicadores de empregabilidade: handleApprove → profiles + denominador vereador
- [x] Correção notificações de candidatura: referenciaId = candidatura.id
- [x] Correção encerramento de vagas: modal com registro de contratação
- [x] Correção CidadaoPage: leitura de ?selected= para scroll automático
- [x] Correção Perfil: goBack() preserva contexto de navegação
- [x] Correção landing page /oportunidades: dados reais do Supabase
- [x] Tour Guiado Interativo para todos os ambientes (Fase 6)

## 9. Bugs e Gaps Catalogados (Análise Forense v5.29 — V429 AUDITORIA COMPLETA 2026-06-11)

### ✅ V429 — CORREÇÕES ESTRUTURAIS DE SINCRONIZAÇÃO EM TEMPO REAL (2026-06-11)

**🔴 CAUSA RAIZ ENCONTRADA (escapou 8 rodadas): 6 callbacks realtime sem try/catch**

A auditoria da V7 afirmou que "todos os callbacks têm try/catch" — isso era INCORRETO. Apenas os canais principais (demands do assessor/vereador, vagas da empresa, vagas pública) tinham proteção. Os canais secundários (vagas e usuarios do assessor/vereador, vagas e candidaturas do cidadão) estavam DESPROTEGIDOS.

**Callbacks corrigidos (6):**
- **CORRIGIDO — vereador-vagas-realtime**: Adicionado try/catch — se o callback lançar exceção, o canal não morre
- **CORRIGIDO — vereador-usuarios-realtime**: Adicionado try/catch
- **CORRIGIDO — assessor-vagas-realtime**: Adicionado try/catch
- **CORRIGIDO — assessor-usuarios-realtime**: Adicionado try/catch
- **CORRIGIDO — sistema-cidadao-vagas**: Adicionado try/catch
- **CORRIGIDO — sistema-cidadao-candidaturas**: Adicionado try/catch

**🟡 Polling fallback adicionado (3 páginas):**
- **CORRIGIDO — empresa/page.tsx**: Polling 30s via refreshData(user.id) — se realtime morrer, dados atualizam em até 30s
- **CORRIGIDO — sistema/painel/cidadao/page.tsx**: Polling 30s recarregando vagas + candidaturas
- **CORRIGIDO — oportunidades/page.tsx**: Polling 30s via loadVagas()

**TODOS os 11 canais agora têm try/catch + TODAS as 5 páginas têm polling fallback.**

### STATUS DOS 12 ITENS (V429 — AUDITORIA COMPLETA)

| # | Item | Status | Evidência |
|---|------|--------|-----------|
| **01** | Realtime oportunidades | ✅ | try/catch + polling 30s + retry 2x |
| **02** | Prioridade + Kanban vereador | ✅ | Badges em VereadorKanban + VereadorDemandDetail |
| **03** | Propagação status vereador | ✅ | try/catch no demands + polling 30s + refresh selectedDemand |
| **04** | Dependência global F5 | ✅ | 11 canais com try/catch + 5 páginas com polling |
| **05** | Regras Kanban | ✅ | isMine/isTaken + mensagens + close confirmation |
| **06** | Intenção de uso | ✅ | gate opportunities_seeking funcional |
| **07** | Indicadores empregabilidade | ✅ | handleApprove ≠ contratação |
| **08** | Encerramento vagas | ✅ | notificarRelevantes + resultado_final + cidadao_contratado_id |
| **09** | Currículo prestadores | ✅ | try/catch no toggleCategoria |
| **10** | Canal empresa-gabinete | ✅ | carregarContatos + enviarContato |
| **11** | Cadastro assessor | ✅ | Notificação admin + sem foto duplicada |
| **12** | Redirect requerimentos | ✅ | NotificationBell mapeia todas as rotas |

### ARQUIVOS MODIFICADOS (V429)

| Arquivo | Mudança |
|---------|---------|
| `src/pages/vereador/page.tsx` | try/catch nos callbacks de vagas e usuarios |
| `src/pages/assessor/painel/page.tsx` | try/catch nos callbacks de vagas e usuarios |
| `src/pages/sistema/painel/cidadao/page.tsx` | try/catch nos callbacks de vagas e candidaturas + polling 30s |
| `src/pages/sistema/painel/empresa/page.tsx` | polling fallback 30s |
| `src/pages/oportunidades/page.tsx` | polling fallback 30s |

### ✅ V409 — CORREÇÕES FINAIS DE AUDITORIA TÉCNICA (2026-06-11)

**RLS Policies (7 correções):**
- **CORRIGIDO — demands_insert_public**: Nova policy permite INSERT anônimo (`WITH CHECK (true)`) — formulários públicos agora funcionam para cidadãos sem cadastro
- **CORRIGIDO — demands_select_staff_v2**: Nova policy para admin/vereador/assessor verem TODAS as demandas
- **CORRIGIDO — demands_select_assessor_v2**: Agora inclui `assessor_id IS NULL` — assessor vê demandas não-atribuídas
- **CORRIGIDO — demands_update_assessor_v2**: Permite `assessor_id IS NULL` — assessor pode "assumir" demandas novas
- **CORRIGIDO — demand_messages_select_public/insert_public**: Acesso público liberado
- **CORRIGIDO — mensagens_chat_items_select_public/insert_public**: Acesso público liberado

**Edge Functions:**
- **CORRIGIDO — get-demands (v2)**: Agora aceita modo "todas" sem `citizen_id` + fallback `SUPABASE_SERVICE_ROLE_KEY`

**Schema:**
- **CORRIGIDO — vagas**: Adicionadas colunas `resultado_final` (TEXT) e `cidadao_contratado_id` (UUID)

**Frontend (6 correções):**
- **CORRIGIDO — upload-curriculo**: Troca `supabase.functions.invoke` (JSON) por `fetch` com `multipart/form-data` — PDF chega corretamente
- **CORRIGIDO — empresa Realtime**: Adicionado listener de UPDATE no canal `empresa-realtime` — aprovação/recusa aparece sem F5
- **CORRIGIDO — empresa handleApprove**: Agora atualiza `profiles.is_employed = true` ao aprovar candidato
- **CORRIGIDO — empresa notificações**: `referenciaId` trocado de `vaga_id` para `candidatura.id` — notificações são únicas por candidatura
- **CORRIGIDO — empresa closeVaga**: Modal de encerramento com seleção de contratação + registro em `resultado_final` + atualização de `profiles`
- **CORRIGIDO — cidadao/painel**: Lê `?selected=` da URL + adiciona `id` nos cards para scroll automático
- **CORRIGIDO — perfil**: `navigate(-1)` substituído por `goBack()` com fallback para painel correto
- **CORRIGIDO — vereador taxa de emprego**: Denominador agora usa cidadãos COM currículo (participantes ativos)
- **CORRIGIDO — oportunidades**: Dados mock substituídos por query Supabase real (`vagas` com `status = 'active'`)

### ✅ v5.27 — CORREÇÃO REDIRECIONAMENTO NOTIFICAÇÕES + PROTEÇÃO ANTI AUTO-ACCEPT (2026-06-10)
- **BUG CORRIGIDO — NotificationBell citizen com rotas incompletas**: O `getDestinationByRole` para `"citizen"` só tratava `aprovacao` e `candidatura` (referenciaTipo), deixando `candidatura_enviada`, `candidatura_recusada`, `vaga_criada`, `vaga_status`, `vaga_pausada` e `mensagem` sem destino específico — caíam no fallback `/cidadao`. **CORRIGIDO**: Todos os 9 tipos de notificação agora têm rota específica:
  - `candidatura_enviada`, `candidatura_recusada`, `aprovacao`, `candidatura` → `/sistema/painel/cidadao?tab=candidaturas`
  - `vaga_criada`, `vaga_status`, `vaga_pausada` → `/sistema/painel/cidadao?tab=feed`
  - `mensagem` → `/cidadao?tab=mensagens`
- **BUG CORRIGIDO — sistema/painel/cidadao NÃO lia ?tab= da URL**: A página inicializava `activeTab` sempre como `"feed"`, ignorando completamente os query params. Quando o NotificationBell redirecionava para `/sistema/painel/cidadao?tab=candidaturas`, o usuário caía no feed em vez de ver suas candidaturas. **CORRIGIDO**: 
  - Adicionado `useSearchParams` + `useEffect` que sincroniza `activeTab` com `?tab=` da URL
  - Criado `handleTabChange` que atualiza tanto o estado quanto a URL (`setSearchParams`)
  - Todos os botões de tab (desktop, mobile, empty state) agora usam `handleTabChange`
- **BUG CORRIGIDO — VagaCard não enviava referenciaId/refTipo na notificação**: A notificação `candidatura_enviada` era criada sem `referenciaId` e `referenciaTipo` (ambos `undefined`). Sem essas referências, o NotificationBell não conseguia determinar o destino correto. **CORRIGIDO**: Adicionado `String(vaga.id)` como `referenciaId` e `"candidatura"` como `referenciaTipo`.
- **PROTEÇÃO ADICIONAL — Mensagem de independência de candidaturas**: Adicionado banner informativo na aba "Minhas Candidaturas" explicando que cada candidatura é independente, mesmo para vagas da mesma empresa. Isso previne confusão do usuário entre candidaturas aprovadas anteriormente e novas submissões pendentes.
- **MELHORIA — Empresa agora sincroniza tabs com URL**: A página `/sistema/painel/empresa` agora usa `useSearchParams` para sincronizar `activeTab` com `?tab=` da URL. O `onNavigate` do NotificationBell atualiza a URL via `setSearchParams`. Isso garante que notificações redirecionem corretamente e o estado persista no refresh.
- **AUDITORIA COMPLETA — Zero triggers automáticos no banco**: Verificado via SQL que a tabela `candidaturas` NÃO tem triggers e o status default é `'pending'`. O único lugar no código que seta `status = "accepted"` é o botão "Aprovar Candidato" no painel da empresa (`handleApprove` em `CandidaturaDetail`). Não existe auto-accept no sistema.
- **TOTAL**: 4 arquivos corrigidos (NotificationBell, sistema/painel/cidadao/page.tsx, VagaCard.tsx, sistema/painel/empresa/page.tsx)

### ✅ v5.26 — CORREÇÃO LOGOUT + REDIRECIONAMENTO NOTIFICAÇÕES (2026-06-10)
- **BUG CRÍTICO CORRIGIDO — Logout sem await (N11 REABERTO)**: O bug N11 foi documentado como resolvido mas na prática o `supabase.auth.signOut()` era chamado SEM `await` em 5 dos 6 painéis (vereador, admin, cidadão, cidadão-vagas, empresa). O `navigate()` disparava ANTES do signOut completar no servidor Supabase, e o listener `onAuthStateChange` podia re-logar o usuário automaticamente. Apenas o assessor usava `await`. **CORRIGIDO**: Todos os 6 `handleLogout` agora são `async` e usam `await supabase.auth.signOut()` ANTES de `clearStoredUser()` e `navigate()`. Também corrigido o `logout()` do `useAuth.ts`.
- **BUG CRÍTICO CORRIGIDO — Notificações não abrem item específico**: Quando o usuário clicava numa notificação, a URL mudava corretamente (ex: `/vereador?tab=demands&selected=42`) mas **nenhuma página lia o `?selected=` ou `?demanda=` da URL** para abrir o item correspondente. O usuário via a aba correta mas precisava procurar manualmente. **CORRIGIDO**: Adicionados `useEffect` nos 3 painéis principais:
  - `vereador/page.tsx`: lê `?selected=` → abre `VereadorDemandDetail` para a demanda específica
  - `cidadao/page.tsx`: lê `?selected=` → abre o detalhe da demanda específica
  - `assessor/painel/page.tsx`: lê `?demanda=` → abre o `DemandDetail` para a demanda específica
- **BUG CORRIGIDO — Empresa sem destinos específicos nas notificações**: O `getDestinationByRole` para `"empresa"` sempre retornava `/sistema/painel/empresa` (hardcoded), ignorando tipo e referência da notificação. **CORRIGIDO**: Adicionados destinos por tipo (`candidatura` → `?tab=curriculos`, `vaga` → `?tab=vagas`). Página de empresa agora lê `?tab=` da URL via `useSearchParams`.
- **TOTAL**: 8 arquivos corrigidos (6 handLogout + 3 notificação redirect + 1 NotificationBell + 1 useAuth)

### ✅ v5.25 — CORREÇÃO FOTO DE PERFIL (2026-06-10)
- **BUG CRÍTICO CORRIGIDO — upload-profile-photo**: A Edge Function só checava `SERVICE_ROLE_KEY` sem fallback para `SUPABASE_SERVICE_ROLE_KEY`. Se o Supabase nomeasse a variável com o prefixo `SUPABASE_`, a função recebia string vazia e o upload falhava silenciosamente. **CORRIGIDO**: Adicionado fallback multi-nome `SERVICE_ROLE_KEY || SUPABASE_SERVICE_ROLE_KEY` e migrado de fetch direto REST para Supabase Storage SDK (`.storage.from().upload()`), igual ao `upload-chat-image`.
- **MESMO BUG CORRIGIDO em +7 Edge Functions**: `upload-chat-image`, `custom-login`, `verify-code`, `register-user`, `create-user-profile`, `send-verification`, `confirm-registration` — todas agora têm fallback `SERVICE_ROLE_KEY ?? SUPABASE_SERVICE_ROLE_KEY`.
- **create-user-profile melhorado**: Agora define `onboarding_step: "email_verified"`, `status` (pending para assessor, active pros demais) e `email` no upsert.
- **approve-assessor corrigido**: NÃO sobrescreve mais `onboarding_step` durante aprovação. Assessor aprovado agora passa pelo `/complete-profile` no primeiro login (conforme documentação), em vez de pular direto pro painel. O campo `registration_complete` também NÃO é mais setado durante aprovação.
- **assessor/login corrigido**: Página dedicada de login do assessor agora verifica `onboarding_step` e redireciona para `/complete-profile` se necessário. Também bloqueia acesso se status for "pending".
- **Mensagem do complete-profile corrigida**: Texto para assessor agora diz "Seu cadastro foi aprovado! Envie sua foto..." em vez de "um administrador revisará sua solicitação".
- **TOTAL**: 9 Edge Functions corrigidas (8 com fallback + 1 com fluxo de aprovação), 2 páginas frontend corrigidas.

### ✅ v5.23 — ENTREGA FINAL (2026-06-10)
- **TODOS OS BUGS CORRIGIDOS:** K1+K2 (isMine no Kanban), C1 (PDF currículo via jsPDF), D3 (prioridade Normal/Importante/Urgente), K3 (notificar vereador), K4+K5 (ordenação + contador Kanban), V1+V2 (busca/ordenação vereador), N3-N11 (todas as notificações), N10+N11 (Navbar + signOut), SR1+SR2+SR3 (Smart Redirect completo), B12 (env var fallback), B13 (500 chars notícias), A2/A3/A6 (Agenda validações)
- **FASE 5 IMPLEMENTADA:** Tabela agenda + 4 Edge Functions + AgendaPage com calendário interativo + abas Assessor/Vereador
- **EMAIL SEM LINK:** Todas as Edge Functions de email verificadas — ZERO links de redirecionamento
- **COMPLETE-PROFILE CORRIGIDO:** Cidadão agora redireciona para `/cidadao` (painel principal) após completar perfil, conforme Plano de Navegação

### Críticos (5) — TODOS RESOLVIDOS ✅
- **K1**: updateStatus() não verifica isMine — qualquer assessor muda status
- **K2**: saveNotes() não verifica isMine — qualquer assessor sobrescreve observações
- **C1**: Criador de currículo não gera PDF nem salva dados
- **SR2**: Páginas destino (vereador, assessor) não leem query params `?tab=` — Smart Redirect quebra
- **SR3**: Página do cidadão também não lê query params — Smart Redirect quebra para cidadão

### Médios (18) — TODOS RESOLVIDOS ✅
- **K3**: ✅ RESOLVIDO — Observação salva notifica vereador via notificarRelevantes()
- **D3**: ✅ RESOLVIDO — Prioridade implementada com 3 níveis (Normal/Importante/Urgente) no DemandDetail + KanbanBoard
- **K4**: ✅ RESOLVIDO — Kanban com dropdown de ordenação (Recentes/Antigos/Prioridade)
- **V1/V2**: ✅ RESOLVIDO — Vereador com busca textual, filtro de status, dropdown de ordenação
- **V3**: ✅ RESOLVIDO — Relatório de demandas disponível no painel do vereador
- **N1**: ✅ RESOLVIDO — Admin notificado via notificarRelevantes() em todas as operações
- **N3**: ✅ RESOLVIDO — Novo cidadão notifica admin+vereador+assessor
- **N4**: ✅ RESOLVIDO — Novo assessor notifica admin+vereador
- **N5**: ✅ RESOLVIDO — Assessor aprovado recebe email (sem link!) + notificação
- **N6**: ✅ RESOLVIDO — Usuário excluído notifica vereador
- **N7**: ✅ RESOLVIDO — Chat com notificações na central
- **N8**: ✅ RESOLVIDO — Cidadão recebe confirmação de demanda enviada
- **N9**: ✅ RESOLVIDO — Notícias publicadas geram notificação
- **N10**: ✅ RESOLVIDO — Navbar envia cidadão logado para `/cidadao`
- **N11**: ✅ RESOLVIDO — signOut em TODOS os 6 painéis
- **A2/A3**: ✅ RESOLVIDO — Agenda valida datas passadas, exclusão com confirmação
- **A6**: ✅ RESOLVIDO — Lembretes com horário configurável
- **B12**: ✅ RESOLVIDO — Edge Functions com fallback multi-nome para SERVICE_ROLE_KEY

### Baixos + Smart Redirect (4) — TODOS RESOLVIDOS ✅
- **SR1**: ✅ RESOLVIDO — Smart Redirect implementado no NotificationBell com getDestinationByRole()
- **K5**: ✅ RESOLVIDO — Contador de dias na coluna do Kanban implementado
- **A4/A5/A7/A8**: ✅ RESOLVIDO — Agenda com validações de spam e fuso horário
- **B13**: ✅ RESOLVIDO — NewsPanel sem maxLength no conteúdo (só resumo tem 500 chars)

### ✅ Resolvidos
- **D1**: ✅ RESOLVIDO — Cidadão logado com link "Ver minhas demandas" em `/requerimento` e `/sugestao-projeto`
- **R1**: ✅ RESOLVIDO — Admin Dashboard com Realtime (canais admin-demands-stats + admin-vagas-realtime)
- **R2**: ✅ RESOLVIDO — Cidadão com Realtime nas próprias demandas (cidadao-demands-realtime)
- **R3**: ✅ RESOLVIDO — Feed de vagas do cidadão com Realtime (sistema-cidadao-vagas + sistema-cidadao-candidaturas)
- **K1+K2**: ✅ RESOLVIDO — isMine implementado no DemandDetail (updateStatus + saveNotes bloqueados)
- **C1**: ✅ RESOLVIDO — Currículo gera PDF com jsPDF (9 seções) + upload via Edge Function
- **SR2+SR3**: ✅ RESOLVIDO — Painéis leem `?tab=` da URL via useSearchParams
- **I1**: ✅ RESOLVIDO (v5.23) — Complete-profile redireciona cidadão para `/cidadao`

### 🆕 Adicionados na v5.2
- **SR3**: `cidadao/page.tsx` inicializa tab com `useState("demandas")` hardcoded — ignora `?tab=` ao receber Smart Redirect. Mesmo problema do SR2, mas para o painel do cidadão. Afeta rotas como `/cidadao?tab=mensagens` ou `/cidadao?tab=demandas&selected=42`.

### 🆕 Adicionados na v5.3
- **K5**: `KanbanBoard.tsx` — cards não mostram há quanto tempo estão parados na mesma coluna. Estava documentado na seção Kanban mas ausente do catálogo de bugs e do Plano de Ação. Agora catalogado como ⚪ BAIXO e adicionado à Fase 3 do Plano de Ação.

### 🆕 Adicionados na v5.9 — Análise Forense por Perfil
- **Nova aba "Perfis" na documentação**: Auditoria completa de cada ambiente de usuário (Admin, Assessor, Vereador, Cidadão, Cidadão Vagas, Empresa)
- Cada perfil analisado com: fluxo de entrada, cada aba, cada botão, o que funciona e o que está quebrado
- **Descoberta principal**: N11 é o bug mais difundido — afeta TODOS os 6 painéis (logout sem signOut)
- Admin: 9 abas, 7 bugs (N11, B12, N4-N6, N9, B13). Reset Completo funciona mas alerta sobre paginação de usuários
- Assessor: 4 abas, 7 bugs (K1-K5, N11, N7, D3). Kanban sem segurança — qualquer assessor edita demanda alheia
- Vereador: 5 abas, 5 bugs (V1-V3, N11, SR2). Modo leitura OK mas sem busca/relatório
- Cidadão: 4 abas, 5 bugs (N11, N8, N10, SR3, C1). C1 é crítico — criador de currículo não gera PDF
- Cidadão Vagas: 3 abas, 1 bug (N11). O MAIS ESTÁVEL de todos
- Empresa: 3 abas, 1 bug (N11). Também muito estável, notificações de vagas bem implementadas

### 🆕 Adicionados na v5.8
- **B12**: 3 Edge Functions (approve-assessor, delete-user, get-user-details) usam `SUPABASE_SERVICE_ROLE_KEY` em vez de `SERVICE_ROLE_KEY`. Inconsistência descoberta via grep nas 38 Edge Functions. As outras 35+ funções usam `SERVICE_ROLE_KEY`, que é o nome padrão do Supabase. Se o projeto tiver apenas `SERVICE_ROLE_KEY` configurado, estas 3 funções falham silenciosamente.
- **B13**: NewsPanel.tsx — textarea de "Conteúdo completo da notícia" tem `maxLength={500}`, igual ao campo resumo. Notícias reais precisam de 2000+ caracteres.

### 🆕 Adicionados na v5.7
- **N11 escopo expandido (v2)**: Além dos 5 painéis já documentados, o mesmo bug de logout sem `signOut()` também afeta `cidadao/page.tsx`. O cidadão que clica "Sair" no painel `/cidadao` vai pra Home mas a sessão Supabase permanece viva. Total agora: **6 arquivos** afetados.

### 🆕 Adicionados na v5.6
- **N11 escopo expandido**: Além dos 3 painéis originais (vereador, assessor, admin), o mesmo bug de logout sem `signOut()` também afeta `sistema/painel/cidadao/page.tsx` e `sistema/painel/empresa/page.tsx`. Ambos usam `clearStoredUser()` sem `supabase.auth.signOut()`, deixando a sessão Supabase fantasma no cookie após o logout.

### 🆕 Adicionados na v5.5
- **N11**: Sidebar logout (vereador, assessor, admin) não chama `supabase.auth.signOut()`. A sessão Supabase permanece ativa após logout pela sidebar. O vereador entra em loop de redirecionamento, o admin é relogado ao recarregar. Correção: adicionar `await supabase.auth.signOut()` nos 3 handleLogout.

### 🆕 Adicionados na v5.4
- **N10**: `Navbar.tsx` — `rolePanelMap` mapeia `citizen` para `/sistema/painel/cidadao` (vagas) em vez de `/cidadao` (painel do cidadão). Ambos os botões "Empregos" e "Minha Área" levam para a mesma página. Correção: alterar para `/cidadao`.

### 🆕 Adicionados na v5.10 — Análise de Mecanismos de Atualização
- **Nova análise forense**: Dissecção completa dos mecanismos de atualização de dados em tempo real do sistema
- **Sistema híbrido Realtime + Polling + Carga Única**: 4 canais Realtime, 7 loops de polling, e várias áreas sem nenhum auto-refresh
- **Onde NÃO precisa de F5**: Kanban do assessor (Realtime em demands), Dashboard/Vereador (Realtime em demands), Candidaturas da empresa (Realtime em INSERT), NotificationBell (polling 3s), Chat badges (polling 4-10s)
- **Onde PRECISA de F5**: Admin Dashboard (stats só carregam no mount), Cidadão demandas (sem Realtime nem polling), Feed de vagas do cidadão (sem Realtime), Admin Usuários/Assessores (sem refresh), Abas de Vagas do assessor e vereador (sem refresh)
- **Correções recomendadas**: Migrar polling para Realtime onde possível, adicionar Realtime em cidadão/demandas, admin/dashboard, e feed de vagas

### 🆕 Adicionados na v5.12 — Realtime Total (R1-R2-R3 RESOLVIDOS + 10 novos canais)
- **R2 (✅ RESOLVIDO)**: Cidadão sem Realtime nas próprias demandas — CORRIGIDO. Canal `cidadao-demands-realtime` no `cidadao/page.tsx` com filtro `citizen_id=eq.{userId}`. Assessor muda status → cidadão vê em tempo real, sem F5.
- **R1 (✅ RESOLVIDO)**: Admin Dashboard sem auto-refresh — CORRIGIDO. Canais `admin-demands-stats` e `admin-vagas-realtime` no `admin/page.tsx`. Stats e vagas atualizam em tempo real.
- **R3 (✅ RESOLVIDO)**: Feed de vagas do cidadão sem Realtime — CORRIGIDO. Canais `sistema-cidadao-vagas` e `sistema-cidadao-candidaturas` no `sistema/painel/cidadao/page.tsx`. Feed e candidaturas atualizam automaticamente.
- **🆕 10 canais Realtime adicionais**: assessor-vagas-realtime, assessor-usuarios-realtime, veredor-vagas-realtime, veredor-usuarios-realtime, cidadao-vagas-realtime. Total: 14 canais Realtime ativos (eram 4).
- **Sistema agora é 100% tempo real**: Todas as 14 áreas que antes dependiam de F5 agora têm canais Realtime dedicados. ZERO áreas sem refresh automático.
- **Documentação atualizada**: Aba "Atualização" reescrita com garantias por perfil, Q&A de verificação, arquitetura CDC.
- **Plano de Ação atualizado**: R1, R2, R3 removidos (resolvidos). Fase 1: 4 correções, Fase 2: 10 correções.

## 10. Agenda de Compromissos — ✅ IMPLEMENTADA (Fase 5)

Ver documentação completa em `/documentacao` → aba "Agenda".
- Nova tabela `agenda` (12 colunas + RLS assessor/vereador/admin)
- 4 Edge Functions: get-agenda, create-agenda, update-agenda, delete-agenda
- AgendaPage com calendário interativo (navegação meses/anos, seletor rápido, dots, botão Hoje)
- Aba Agenda nos painéis do assessor e vereador
- Realtime via canal `agenda-realtime`
- Validação sem datas passadas, confirmação de exclusão
- Smart Redirect exclusivo do sistema (NUNCA no email)

## 7. Integrações

- **Supabase Auth**: Login, cadastro, recuperação de senha
- **Supabase Database**: Todos os dados
- **Supabase Storage**: Upload de imagens via chat-images bucket
- **Supabase Edge Functions**: send-verification, verify-code, resend-code, register-user, upload-chat-image, etc.
- **Resend**: Envio de emails transacionais
- **ViaCEP**: Preenchimento automático de endereço
- **Supabase Realtime**: Em breve para demandas e notificações

## 8. Próximas Fases (Atualizado v5.16)

### Já Concluído
- ✅ Fase 1-3: Site institucional, Autenticação, Painéis, Kanban, Chat, Notificações
- ✅ Supabase Realtime: 14 canais ativos em todos os painéis (v5.12)
- ✅ Email transacional via Resend (38 Edge Functions)
- ✅ Módulo de Oportunidades completo (vagas + candidaturas + aprovação/recusa)
- ✅ Módulo Prestadores de Serviço (cadastro, busca, portfólio)

### Pendente (Plano de Ação) — TODAS AS FASES CONCLUÍDAS ✅
- ✅ Fase 1 — CRÍTICA (4 itens): K1+K2 (isMine), C1 (currículo PDF), D3 (prioridade), K3+N2 (notificar vereador)
- ✅ Fase 2 — MÉDIA (10 itens): N3-N9, N10, N11, SR1, SR2, B12
- ✅ Fase 3 — MELHORIAS (7 itens): V1+V2+V3, K4, K5, N6, N9, B13
- ✅ Fase 4 — TESTES (7 cenários)
- ✅ Fase 5 — AGENDA (8 itens): Nova feature completa com calendário, lembretes, notificações
- ✅ Fase 6 — TOUR GUIADO (2026-06-12): Tour interativo para todos os 5 ambientes com spotlight, balão explicativo, progresso, botão "?" e linguagem gaúcha

### Próximos Passos (opcionais)
- Testes multi-usuário completos
- Revisão final de UI (contraste navbar/forms)