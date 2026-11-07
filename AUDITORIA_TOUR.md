# Auditoria Completa — Tour Guiado Interativo

> Data: 2026.06.12 | Projeto: Arthur Halal — Pelotas/RS
> Status da Auditoria: COMPLETO | Nenhuma modificação foi realizada no código

---

## 1. Resumo Executivo

A implementação atual do tour guiado possui **10 falhas críticas** que impedem que ele funcione como uma experiência interativa, auto-explicativa e fluida. Os problemas vão desde cálculo de posição do spotlight até ausência de navegação entre ambientes.

---

## 2. Falhas Identificadas (Auditoria Técnica)

### Falha 1: Spotlight não circula o elemento exato — circula áreas genéricas

**Problema:** O seletor `target` do tour aponta para containers grandes (`[data-tour="cidadao-tabs"]`, `aside button:has(i.ri-bar-chart-line)`). O spotlight destaca uma barra inteira de tabs, não o botão específico. No print do cidadão, a barra de navegação inteira está com borda dourada, confundindo o usuário sobre qual botão exato ele deve usar.

**Evidência:**
- `cidadao-tour.ts`: `target: "[data-tour=\"cidadao-tabs\"]"` — destaca 4 botões simultaneamente
- `vereador-tour.ts`: `target: "aside button:has(i.ri-bar-chart-line)"` — seletor frágil baseado em ícone
- `assessor-tour.ts`: `target: "[data-tour=\"assessor-kanban\"]"` — destaca o board inteiro, não uma coluna

**Impacto:** Usuário não sabe qual elemento interagir. O tour perde o propósito de "guiar".

---

### Falha 2: Elemento destacado não é interativo durante o tour

**Problema:** A técnica de `box-shadow: 0 0 0 9999px` no spotlight div cria apenas uma ilusão visual. O overlay (`z-index: 9999`) cobre toda a tela. O elemento real do DOM está **abaixo** do overlay em termos de pilha de renderização. O usuário não consegue clicar no botão que o tour está mostrando.

**Evidência (TourGuide.tsx):**
```tsx
// Overlay cobre TUDO
<div className="absolute inset-0 z-[9999]" style={{ background: "rgba(13, 22, 41, 0.84)" }} />

// Spotlight div com pointer-events: none
<div className="absolute pointer-events-none" style={{ boxShadow: "0 0 0 9999px rgba(13, 22, 41, 0.84)" }} />
```

**Impacto:** O usuário não pode clicar no botão enquanto o tour explica. O tour é puramente visual, não interativo.

---

### Falha 3: Redimensionamento mobile está quebrado — card cortado

**Problema:** O card do tour em mobile (`< 768px`) usa `left: 16px; right: 16px` mas o conteúdo interno (botões, texto, ícones) força o card a expandir além da tela. Os botões de navegação ("Pular tour", "Voltar", "Próximo") estão em `flex` sem `flex-wrap`, causando overflow horizontal.

**Evidência (TourGuide.tsx):**
```tsx
// Mobile: bottom fixo, mas sem garantia de que o conteúdo cabe
setTooltipStyle({
  position: "fixed",
  bottom: "100px",
  left: "16px",
  right: "16px",
  width: "auto",
});
```

**Impacto:** No print do usuário, o card aparece cortado na direita. O botão "Pular tour" não é visível completamente.

**Impacto adicional:** Em telas menores que 360px, o card some da viewport.

---

### Falha 4: Seta indicadora está sempre apontando para baixo

**Problema:** A seta do spotlight (`border-top`) está hardcoded para apontar para baixo. Quando o tooltip é posicionado **acima** do elemento (ex: `position: "top"`), a seta ainda aponta para baixo, criando uma contradição visual.

**Evidência (TourGuide.tsx):**
```tsx
// Sempre border-top — aponta pra baixo
<div style={{ borderTop: "10px solid rgba(232, 160, 32, 0.85)", bottom: "-12px" }} />
```

**Impacto:** A seta não indica o elemento correto. Em posições `top` e `left`, a seta fica no lugar errado.

---

### Falha 5: Tour não navega entre ambientes — fica preso em uma página

**Problema:** O tour do cidadão (`/cidadao`) tem 7 passos. O último passo explica notificações. O usuário quer que, após finalizar o tour do cidadão, se o cidadão já tem currículo, o tour **redirecione** para `/sistema/painel/cidadao` e continue o tour de vagas. Hoje isso não acontece — o `onTourFinished` só faz `navigate()` mas não inicia o tour de vagas.

**Evidência (useTour.ts):**
```tsx
// Auto-start só dispara se hasWelcomeFlag() === true
if (!hasWelcomeFlag()) return;
```

Quando o usuário vem de `/cidadao` para `/sistema/painel/cidadao`, a flag `ah_tour_welcome_{userId}` já foi consumida. O tour de vagas nunca dispara.

**Impacto:** O cidadão faz o tour do `/cidadao` e acha que acabou. Nunca descobre o ambiente de vagas.

---

### Falha 6: Seletores CSS frágeis que quebram com mudanças mínimas

**Problema:** Vários tours usam seletores baseados em ícones (`aside button:has(i.ri-bar-chart-line)`) ou atributos genéricos (`a[href="/requerimento"]`). Se o ícone muda, se o href muda, ou se existem múltiplos elementos com o mesmo seletor, o tour quebra silenciosamente (sem fallback).

**Evidência:**
- `vereador-tour.ts`: `aside button:has(i.ri-bar-chart-line)` — 2 passos usam isso
- `assessor-tour.ts`: `aside button:has(i.ri-chat-3-line)` — seletor frágil
- `empresa-tour.ts`: `nav button:has(i.ri-megaphone-line)` — seletor frágil

**Impacto:** Tour quebra sem aviso. O usuário vê o card flutuando sem elemento destacado.

---

### Falha 7: Scroll automático não respeita o mobile bottom nav

**Problema:** O `scrollIntoView({ block: "center" })` funciona no desktop, mas em mobile o conteúdo pode ficar escondido atrás da bottom navigation bar (que tem `fixed bottom-0 z-50`). O elemento é rolado para o centro, mas fica coberto pela nav bar de 56px de altura.

**Impacto:** Em mobile, o elemento destacado fica escondido atrás da nav bar inferior.

---

### Falha 8: Texto dos tours ainda é explicativo demais (não direto)

**Problema:** O usuário pediu texto conciso tipo "Aqui nesse botão tu gera teu requerimento". Alguns textos ainda têm 2-3 frases explicativas.

**Exemplos de texto que precisam de corte:**
- Cidadão: "Precisa de algo da prefeitura? Clica nesse botão e manda teu requerimento. O gabinete recebe na hora e um assessor assume teu caso. Fácil, fácil!" → Deveria ser: "Faz teu requerimento aqui, tchê! Clica e manda."
- Vereador: "Essa barra lateral é o menu principal. Daqui tu navega entre Visão Geral, Demandas, Eficiência dos assessores, Métricas, Vagas, Usuários, Conversas e Agenda. Tudo que o mandato precisa." → Deveria ser: "Teu centro de comando, tchê! Navega por tudo aqui."

---

### Falha 9: Fundo do overlay desfoca o elemento destacado junto

**Problema:** O overlay usa `backdropFilter: "blur(3px)"` em toda a tela. O spotlight é apenas um "buraco" visual via box-shadow. O elemento dentro do buraco ainda está sujeito ao blur do overlay (que é um div separado, mas a ordem de z-index pode causar problemas).

**Impacto:** O elemento que deveria ser destacado fica embaçado, especialmente se estiver sobre uma imagem de fundo.

---

### Falha 10: `data-tour` attributes faltantes em elementos críticos

**Problema:** Os `data-tour` attributes foram adicionados em alguns lugares, mas não em todos os elementos que o tour tenta destacar. Isso causa falha silenciosa quando o `querySelector` não encontra o elemento.

**Elementos sem `data-tour` que o tour tenta acessar:**
- PainelSidebar: itens individuais do menu (Demandas, Chat, Vagas) não têm `data-tour`
- Vereador: `aside button:has(...)` não usa `data-tour` — usa seletor de ícone
- Assessor: `aside button:has(...)` mesma fragilidade
- Empresa: `nav button:has(...)` mesma fragilidade

---

## 3. Especificação de Layout — Tour por Usuário

### 3.1 Cidadão (`/cidadao`)

**Layout Desktop:**
- Passo 1: Botão "Novo Requerimento" (header, link dourado) → spotlight circular, card à direita
- Passo 2: Botão "Sugerir Projeto" (header, link branco) → spotlight circular, card abaixo
- Passo 3: Botão "Vagas de Emprego" (header, link azul) → spotlight circular, card abaixo
- Passo 4: Tab "Demandas" → spotlight no botão, card abaixo
- Passo 5: Tab "Mensagens" → spotlight no botão, card abaixo
- Passo 6: Tab "Vagas" → spotlight no botão, card abaixo
- Passo 7: Tab "Perfil" → spotlight no botão, card abaixo
- Passo 8: Lista de demandas → spotlight no primeiro card, card à direita
- Passo 9: Notificações (sininho) → spotlight circular, card à esquerda

**Layout Mobile:**
- Passo 1-3: Botões do header → spotlight circular, card fixo na parte inferior (altura: 200px, largura: calc(100vw - 32px))
- Passo 4-7: Bottom nav tabs → spotlight circular em cada ícone, card na parte inferior
- Passo 8: Lista de demandas → scroll automático + card inferior
- Passo 9: Notificações → card inferior

**Transição:** Após passo 9, se cidadão tem `curriculo_pdf`, redireciona para `/sistema/painel/cidadao` e dispara o tour de vagas.

**Texto (gaúcho, conciso):**
1. "Faz teu requerimento aqui, tchê! Clica e manda."
2. "Tem uma baita ideia? Sugere aqui."
3. "Procurando trampo? As vagas tão aqui, bah!"
4. "Tuas demandas — acompanha tudo."
5. "Chat com o gabinete — manda mensagem."
6. "Vagas de emprego em Pelotas."
7. "Teu perfil — mantém atualizado."
8. "Clique numa demanda pra ver detalhes."
9. "Fica ligado no sininho — notificações chegam aqui."

---

### 3.2 Cidadão — Vagas (`/sistema/painel/cidadao`)

**Layout Desktop:**
- Passo 1: Campo de busca → spotlight retangular, card abaixo
- Passo 2: Botões de área (Administrativo, Tecnologia, etc.) → spotlight na primeira linha, card abaixo
- Passo 3: Botões de tipo (CLT, PJ, etc.) → spotlight na primeira linha, card abaixo
- Passo 4: Primeiro card de vaga → spotlight retangular, card à direita
- Passo 5: Tab "Feed" → spotlight no botão, card abaixo
- Passo 6: Tab "Candidaturas" → spotlight no botão, card abaixo
- Passo 7: Tab "Prestadores" → spotlight no botão, card abaixo
- Passo 8: Sidebar do perfil (esquerda) → spotlight na sidebar, card à direita
- Passo 9: Notificações → spotlight circular, card à esquerda

**Layout Mobile:**
- Passo 1-3: Busca e filtros → card inferior fixo
- Passo 4: Primeiro card de vaga → scroll automático, card inferior
- Passo 5-7: Tabs mobile (topo) → card inferior
- Passo 8: Avatar do perfil → card inferior
- Passo 9: Notificações → card inferior

**Texto (gaúcho, conciso):**
1. "Busca a vaga ideal — digita aqui."
2. "Filtra por área — só o que te interessa."
3. "Escolhe o tipo de contrato — CLT, PJ, estagio..."
4. "As vagas aparecem aqui — clica pra se candidatar."
5. "Feed de vagas — as oportunidades."
6. "Tuas candidaturas — vê o status."
7. "Prestadores da região — serviços e freelas."
8. "Teu perfil profissional — mantém atualizado."
9. "Fica esperto nas notificações!"

---

### 3.3 Vereador (`/vereador`)

**Layout Desktop:**
- Passo 1: Sidebar (PainelSidebar) → spotlight na sidebar, card à direita
- Passo 2: Item "Visão Geral" na sidebar → spotlight no botão, card à direita
- Passo 3: Item "Demandas" na sidebar → spotlight no botão, card à direita
- Passo 4: Item "Eficiência" na sidebar → spotlight no botão, card à direita
- Passo 5: Item "Métricas" na sidebar → spotlight no botão, card à direita
- Passo 6: Item "Vagas" na sidebar → spotlight no botão, card à direita
- Passo 7: Item "Usuários" na sidebar → spotlight no botão, card à direita
- Passo 8: Item "Conversas" na sidebar → spotlight no botão, card à direita
- Passo 9: Item "Agenda" na sidebar → spotlight no botão, card à direita
- Passo 10: Stats cards (Em Aberto, Em Andamento, etc.) → spotlight no primeiro card, card abaixo
- Passo 11: Notificações → spotlight circular, card à esquerda

**Layout Mobile:**
- Passo 1-9: Bottom nav (ícones) → spotlight circular em cada ícone, card inferior
- Passo 10: Stats cards → card inferior
- Passo 11: Notificações → card inferior

**Texto (gaúcho, conciso):**
1. "Teu centro de comando, tchê!"
2. "Visão geral — números do mandato."
3. "Demandas — tudo que o povo pediu."
4. "Eficiência — como os assessores tão indo."
5. "Métricas — dados pra decisão."
6. "Vagas — emprego pro povo."
7. "Usuários — quem tá na plataforma."
8. "Conversas — acompanha os chats."
9. "Agenda — teus compromissos."
10. "Resumo em tempo real — números do mandato."
11. "Notificações — fica ligado!"

---

### 3.4 Assessor (`/assessor/painel`)

**Layout Desktop:**
- Passo 1: Sidebar (PainelSidebar) → spotlight na sidebar, card à direita
- Passo 2: Item "Demandas (Kanban)" na sidebar → spotlight no botão, card à direita
- Passo 3: Item "Mensagens" na sidebar → spotlight no botão, card à direita
- Passo 4: Item "Usuários" na sidebar → spotlight no botão, card à direita
- Passo 5: Item "Vagas" na sidebar → spotlight no botão, card à direita
- Passo 6: Item "Agenda" na sidebar → spotlight no botão, card à direita
- Passo 7: Kanban board (coluna "Em Aberto") → spotlight na coluna, card à direita
- Passo 8: Campo de busca do Kanban → spotlight retangular, card abaixo
- Passo 9: Notificações → spotlight circular, card à esquerda

**Layout Mobile:**
- Passo 1-6: Bottom nav (ícones) → spotlight circular em cada ícone, card inferior
- Passo 7: Kanban coluna → card inferior
- Passo 8: Busca → card inferior
- Passo 9: Notificações → card inferior

**Texto (gaúcho, conciso):**
1. "Teu escritório digital, tchê!"
2. "Kanban — teu ganha-pão!"
3. "Mensagens — atende o povo."
4. "Usuários — conhece a comunidade."
5. "Vagas — acompanha as oportunidades."
6. "Agenda — teus compromissos."
7. "Demandas em aberto — assume e responde!"
8. "Busca rápida — acha qualquer demanda."
9. "Notificações — não perde nada!"

---

### 3.5 Empresa (`/sistema/painel/empresa`)

**Layout Desktop:**
- Passo 1: Tab "Minhas Vagas" → spotlight no botão, card abaixo
- Passo 2: Tab "Criar Anúncio" → spotlight no botão, card abaixo
- Passo 3: Tab "Banco de Currículos" → spotlight no botão, card abaixo
- Passo 4: Tab "Mensagens" → spotlight no botão, card abaixo
- Passo 5: Primeiro card de vaga (lista) → spotlight retangular, card à direita
- Passo 6: Botão "Criar novo anúncio" → spotlight circular, card abaixo
- Passo 7: Notificações → spotlight circular, card à esquerda

**Layout Mobile:**
- Passo 1-4: Tab bar (topo) → card inferior
- Passo 5: Card de vaga → card inferior
- Passo 6: Botão "Criar novo anúncio" → card inferior
- Passo 7: Notificações → card inferior

**Texto (gaúcho, conciso):**
1. "Tuas vagas publicadas — gerencia tudo."
2. "Publica uma vaga nova — é gratuito!"
3. "Banco de currículos — candidatos e profissionais."
4. "Fala com o gabinete — canal direto."
5. "Vaga ativa — edita, pausa ou encerra."
6. "Cria novo anúncio — preenche e publica."
7. "Notificações — candidaturas e mensagens."

---

## 4. Especificação de Layout Responsivo

### 4.1 Mobile (< 768px)

**Overlay:**
- Cor: `rgba(13, 22, 41, 0.92)` — mais escuro que o atual para melhor contraste
- Blur: `backdrop-filter: blur(4px)` no overlay
- O elemento destacado tem `z-index: 10000` (acima do overlay) e **não recebe blur**

**Spotlight:**
- Forma: `border-radius: 12px` (não 16px) para botões pequenos
- Borda: `3px solid #E8A020` com glow animado
- Padding: `8px` ao redor do elemento
- O elemento dentro do spotlight tem `pointer-events: auto` (clicável)

**Card do tour:**
- Posição: `fixed`, `bottom: 80px` (acima da bottom nav)
- Largura: `calc(100vw - 32px)`
- Max-height: `280px` com scroll interno se necessário
- Margem: `16px` dos lados
- Botões: `flex-wrap: wrap` para evitar overflow
- Fonte: `text-sm` (14px) para caber em telas pequenas
- Padding interno: `16px` (menos que o desktop)

**Seta indicadora:**
- Posição: Dinâmica — aponta para o elemento
- Se card está ABAIXO do elemento: seta aponta para CIMA (border-bottom)
- Se card está ACIMA do elemento: seta aponta para BAIXO (border-top)
- Se card está À DIREITA: seta aponta para ESQUERDA (border-right)
- Se card está À ESQUERDA: seta aponta para DIREITA (border-left)

**Bottom nav:**
- O tour deve considerar a altura da bottom nav (`56px + padding`) ao calcular posição
- `scrollIntoView` deve usar `block: "start"` com offset de `80px` para não esconder o elemento atrás da nav

### 4.2 Tablet (768px – 1024px)

**Overlay:**
- Mesma especificação do mobile

**Card do tour:**
- Posição: contextual (não fixo na parte inferior)
- Largura: `360px` máximo
- Posição relativa ao elemento (top, bottom, left, right)
- Se não couber na posição solicitada, fallback para o lado oposto

**Spotlight:**
- Mesma especificação do mobile

### 4.3 Desktop (> 1024px)

**Overlay:**
- Cor: `rgba(13, 22, 41, 0.88)`
- Blur: `backdrop-filter: blur(2px)` — mais sutil

**Spotlight:**
- Padding: `10px` ao redor do elemento
- Borda dourada com `box-shadow: 0 0 20px rgba(232, 160, 32, 0.35)`
- Elemento clicável (z-index acima do overlay)

**Card do tour:**
- Posição: contextual baseada em `position` do passo
- Largura: `380px`
- Máximo de 4 linhas de texto — se exceder, scroll interno
- Botões: inline (sem wrap)
- Seta: posicionada dinamicamente conforme o lado do card

---

## 5. Alterações Necessárias no Código

### 5.1 `TourGuide.tsx` (Componente Visual)

**Mudança 1: Estrutura de overlay corrigida**
```
Atual: Um overlay + um spotlight div com box-shadow
Novo: Overlay + spotlight div + o elemento real é clonado dentro do spotlight
```

O elemento real do DOM deve ser clonado (via `element.cloneNode(true)`) e posicionado dentro do spotlight div com `position: absolute`. Isso garante que o elemento visível ao usuário seja clicável e interativo.

**Mudança 2: Z-index hierárquico**
```
Overlay: z-index: 9998
Spotlight div: z-index: 9999
Elemento clonado: z-index: 10000
Card do tour: z-index: 10001
```

**Mudança 3: Seta dinâmica**
```
Nova lógica: calcular a posição do card e criar a seta apontando para o elemento
- Se card.top > element.bottom: seta aponta para CIMA (border-bottom)
- Se card.bottom < element.top: seta aponta para BAIXO (border-top)
- Se card.left > element.right: seta aponta para ESQUERDA (border-right)
- Se card.right < element.left: seta aponta para DIREITA (border-left)
```

**Mudança 4: Mobile card fixo**
```
Atual: bottom: 100px, left: 16px, right: 16px
Novo: bottom: 80px, left: 16px, right: 16px, max-height: 280px, overflow-y: auto
Adicionar: flex-wrap nos botões
Adicionar: min-height: auto (se adapta ao conteúdo)
```

**Mudança 5: Scroll com offset para mobile**
```
Atual: targetEl.scrollIntoView({ behavior: "smooth", block: "center" })
Novo: scrollIntoView com offset considerando a altura da nav bar fixa
```

**Mudança 6: ResizeObserver mais robusto**
```
Atual: observa o elemento alvo
Novo: observa o elemento alvo + body (para detectar mudanças de layout)
```

---

### 5.2 `useTour.ts` (Hook de Estado)

**Mudança 1: Flag de transição entre ambientes**
```
Nova: adicionar `sessionStorage.setItem(`ah_tour_transition_${userId}`, "cidadao-vagas")`
Quando o cidadão finaliza o tour do /cidadao, seta essa flag
No /sistema/painel/cidadao, o useTour verifica essa flag e dispara o tour de vagas
```

**Mudança 2: Diferenciar auto-start por contexto**
```
Atual: autoStart dispara se hasWelcomeFlag() === true
Novo: autoStart dispara se:
  - hasWelcomeFlag() === true (primeiro acesso) OU
  - hasTransitionFlag() === true (veio de outro tour)
```

**Mudança 3: Consumo de flags separado**
```
Atual: consumeWelcomeFlag() remove a flag
Novo: consumeWelcomeFlag() e consumeTransitionFlag() são métodos separados
```

---

### 5.3 `PainelSidebar.tsx` (Sidebar Compartilhada)

**Mudança 1: Adicionar `data-tour` em cada item de nav**
```
<button data-tour="vereador-nav-overview" ...>Visão Geral</button>
<button data-tour="vereador-nav-demands" ...>Demandas</button>
<button data-tour="assessor-nav-kanban" ...>Demandas</button>
<button data-tour="assessor-nav-chat" ...>Mensagens</button>
```

**Mudança 2: Mobile bottom nav também precisa de `data-tour`**
```
<button data-tour="vereador-mobile-nav-overview" ...>...
```

**Mudança 3: Mobile drawer não precisa de `data-tour` (não é usado no tour)**

---

### 5.4 Arquivos de Tour (mocks)

**Mudança 1: Seletores específicos (não genéricos)**
```
Antes: target: "[data-tour=\"cidadao-tabs\"]"
Novo: target: "[data-tour=\"cidadao-tab-demandas\"]"

Antes: target: "aside button:has(i.ri-bar-chart-line)"
Novo: target: "[data-tour=\"vereador-nav-eficiencia\"]"
```

**Mudança 2: Texto conciso (gaúcho)**
```
Antes: "Precisa de algo da prefeitura? Clica nesse botão e manda teu requerimento. O gabinete recebe na hora e um assessor assume teu caso. Fácil, fácil!"
Novo: "Faz teu requerimento aqui, tchê! Clica e manda."
```

**Mudança 3: Menos passos (não explicar item por item)**
```
Remover passos que explicam cada campo de formulário
Manter apenas: "Aqui tu cria tua vaga — preenche e publica"
```

---

### 5.5 Páginas Integradas

**Mudança 1: Cidadão (`/cidadao/page.tsx`)**
```
Adicionar data-tour em cada botão do header:
<Link data-tour="cidadao-requerimento" ...>Novo Requerimento</Link>
<Link data-tour="cidadao-sugestao" ...>Sugerir Projeto</Link>
<Link data-tour="cidadao-vagas" ...>Vagas de Emprego</Link>

Adicionar data-tour em cada tab:
<div data-tour="cidadao-tab-demandas">...</div>
<div data-tour="cidadao-tab-mensagens">...</div>
<div data-tour="cidadao-tab-vagas">...</div>
<div data-tour="cidadao-tab-perfil">...</div>

Adicionar data-tour na lista de demandas:
<div data-tour="cidadao-demandas-lista">...</div>
```

**Mudança 2: Cidadão Vagas (`/sistema/painel/cidadao/page.tsx`)**
```
Adicionar data-tour em:
<input data-tour="vagas-search" ...>
<div data-tour="vagas-areas">...</div>
<div data-tour="vagas-tipos">...</div>
<div data-tour="vagas-feed">...</div>
<button data-tour="vagas-tab-feed">...</button>
<button data-tour="vagas-tab-candidaturas">...</button>
<button data-tour="vagas-tab-prestadores">...</button>
<aside data-tour="vagas-perfil">...</aside>
```

**Mudança 3: Vereador (`/vereador/page.tsx`)**
```
Remover data-tour="vereador-sidebar" genérico
Adicionar data-tour em cada nav item via PainelSidebar
Adicionar data-tour="vereador-stats" nos cards de stats
```

**Mudança 4: Assessor (`/assessor/painel/page.tsx`)**
```
Remover data-tour="assessor-sidebar" genérico
Adicionar data-tour em cada nav item via PainelSidebar
Adicionar data-tour="assessor-kanban" na coluna do Kanban
Adicionar data-tour="assessor-search" no campo de busca
```

**Mudança 5: Empresa (`/sistema/painel/empresa/page.tsx`)**
```
Adicionar data-tour em cada tab:
<button data-tour="empresa-tab-vagas">...</button>
<button data-tour="empresa-tab-criar">...</button>
<button data-tour="empresa-tab-curriculos">...</button>
<button data-tour="empresa-tab-mensagens">...</button>

Adicionar data-tour="empresa-vagas-lista" no container
Adicionar data-tour="empresa-criar-btn" no botão "Criar novo anúncio"
```

---

## 6. Checklist de Implementação

### Prioridade 1: Crítico
- [ ] Refazer `TourGuide.tsx` com z-index correto e elemento clonado
- [ ] Refazer `useTour.ts` com flag de transição entre ambientes
- [ ] Adicionar `data-tour` em todos os elementos de cada página
- [ ] Corrigir redimensionamento mobile (card fixo, botões wrap, max-height)

### Prioridade 2: Alto
- [ ] Reescrever todos os seletores de tour para usar `data-tour`
- [ ] Reescrever texto dos tours (mais conciso, gaúcho)
- [ ] Implementar seta dinâmica no spotlight
- [ ] Corrigir scroll mobile com offset da nav bar

### Prioridade 3: Médio
- [ ] Ajustar blur do overlay para não afetar o elemento destacado
- [ ] Adicionar `data-tour` no PainelSidebar para cada item
- [ ] Testar transição cidadão → vagas
- [ ] Testar todos os 5 tours em desktop e mobile

### Prioridade 4: Baixo
- [ ] Adicionar animação de entrada mais suave no spotlight
- [ ] Melhorar acessibilidade (aria-labels no tour)
- [ ] Testar em tablet

---

## 7. Resumo de Provas Visuais

### Print 1 (Mobile — card cortado)
- **Prova:** O card está com `right: 16px` mas o conteúdo interno estoura
- **Causa:** Botões em flex sem wrap, texto longo, largura fixa interna
- **Solução:** `flex-wrap: wrap`, `max-width: 100%`, `overflow-wrap: break-word`

### Print 2 (Mobile — card cortado, outro passo)
- **Prova:** Mesmo problema, card em posição aleatória sem relação com o elemento
- **Causa:** Mobile ignora o elemento e usa posição fixa `bottom: 100px`
- **Solução:** Card mobile deve ter `bottom: 80px` (acima da nav) e largura `calc(100vw - 32px)`

### Print 3 (Desktop — barra destacada)
- **Prova:** O spotlight está em uma barra inteira, não em um botão
- **Causa:** Seletor `data-tour="cidadao-tabs"` pega o container
- **Solução:** Usar seletores individuais como `data-tour="cidadao-tab-demandas"`
- **Prova 2:** A seta aponta para baixo mas o card está abaixo do elemento
- **Causa 2:** Seta hardcoded com `border-top` e `bottom: -12px`
- **Solução 2:** Calcular posição dinâmica da seta

---

## 8. Regra de Ouro do Auto-Start (Revisada)

**Situação:** Usuário padrão já logado (não recém-cadastrado, não resetado)
- **Comportamento:** Não recebe tour automático
- **Botão "?":** Sempre visível (quando tour não está ativo)
- **Ao clicar "?":** Inicia o tour do ambiente atual

**Situação:** Usuário recém-cadastrado ou resetado
- **Comportamento:** Recebe tour automático após `complete-profile`
- **Flag:** `sessionStorage.setItem("ah_tour_welcome_{userId}", "1")`
- **Consumo:** `useTour` consome a flag no primeiro auto-start

**Situação:** Cidadão com currículo finalizando tour do `/cidadao`
- **Comportamento:** Redireciona para `/sistema/painel/cidadao`
- **Flag de transição:** `sessionStorage.setItem("ah_tour_transition_{userId}", "cidadao-vagas")`
- **Disparo:** O `useTour` de `/sistema/painel/cidadao` detecta a flag e inicia o tour de vagas

---

*Fim da Auditoria. Nenhuma modificação foi realizada no código durante este processo.*