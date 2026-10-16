# Design System

> Dono: agente `designer` · Atualizado: 2026-10-15 · Base: `docs/prd.md`, `docs/arquitetura.md`
> Estilo: painel de dados limpo, desktop primeiro, mas funcional no celular (a partir de 360px).

## 1. Cores

| Token | Nome | Função | Hex |
|---|---|---|---|
| `primaria` | Violeta | Botão principal, links, item ativo do menu, foco | `#6C5CE7` |
| `primaria-escura` | Violeta escuro | Hover do botão principal | `#5A4BD1` |
| `apoio` | Verde | Métrica boa, nota ≥ 80, "sugestão nova", sucesso | `#00B894` |
| `aviso` | Amarelo | Nota 50–79, alerta de atenção | `#FDCB6E` |
| `erro` | Vermelho | Desperdício, nota < 50, limite estourado, Cancelar | `#E84362` |
| `fundo` | Cinza claro | Fundo da página | `#F5F6FA` |
| `superficie` | Branco | Cards, tabelas, modais | `#FFFFFF` |
| `texto` | Grafite | Texto principal | `#2D3436` |
| `texto-suave` | Cinza | Rótulos, legendas, texto secundário | `#636E72` |
| `borda` | Cinza borda | Bordas e divisórias | `#DFE6E9` |

Regras de uso:
- O amarelo `aviso` **nunca** é usado como cor de texto sobre branco (contraste baixo). Use-o como fundo de selo, com texto `texto`.
- Cor nunca é o único sinal: toda nota ou status também tem ícone ou rótulo ("Ruim", "Boa").
- Texto sobre `primaria`, `erro` e `apoio` é sempre branco e em negrito (peso 700+) para manter o contraste.

## 2. Fonte

- Família: **Inter** (Google Fonts), com fallback `system-ui, sans-serif`.
- Títulos: peso **800**. Texto: peso **500**. Números de métricas: peso 700 com `font-variant-numeric: tabular-nums`, para os dígitos ficarem alinhados nas tabelas.

| Uso | Tamanho / altura de linha |
|---|---|
| H1 (título da página) | 28px / 36px |
| H2 (título de card) | 20px / 28px |
| Métrica grande (KPI) | 32px / 40px |
| Texto | 15px / 22px |
| Rótulo / legenda | 13px / 18px |

## 3. Componentes

Todos os componentes ficam em `src/componentes/` e são reutilizados. Área de toque mínima de 44×44px e foco visível com contorno de 2px em `primaria`.

### Botões
| Componente | Uso | Normal | Hover | Desabilitado | Erro/Carregando |
|---|---|---|---|---|---|
| `BotaoConfirmar` (primário) | Gerar sugestões, Conectar, Salvar | fundo `primaria`, texto branco | fundo `primaria-escura` | opacidade 40%, cursor bloqueado | carregando: spinner + "Gerando…"; erro: contorno `erro` + mensagem abaixo |
| `BotaoVoltar` (neutro) | Voltar, Copiar, Exportar CSV | fundo `superficie`, borda `borda`, texto `texto` | fundo `fundo` | opacidade 40% | — |
| `BotaoCancelar` (erro) | Desconectar conta, Cancelar | fundo `superficie`, borda e texto `erro` | fundo `erro`, texto branco | opacidade 40% | — |

### `CardMetrica` (KPI)
Rótulo, valor grande e variação opcional.
- normal: card `superficie`, borda `borda`
- hover: sombra leve
- desabilitado/sem dados: valor "—" em `texto-suave`
- erro: valor "!" em `erro` + "Não foi possível carregar"

### `SeloNota` (0–100)
Círculo com o número e um rótulo ao lado.
- ≥ 80: fundo `apoio`, rótulo "Boa"
- 50–79: fundo `aviso`, texto `texto`, rótulo "Média"
- < 50: fundo `erro`, rótulo "Ruim"
- desabilitado (sem dados): fundo `borda`, rótulo "Sem dados"

### `TabelaDados`
Cabeçalho fixo, ordenação por coluna e números alinhados à direita.
- normal: linhas alternadas `superficie`/`fundo`
- hover da linha: fundo `#EDEBFC` (primária a 12%)
- vazio: mensagem centralizada "Nada encontrado neste período"
- erro: faixa `erro` no topo com botão "Tentar de novo"
- linha de desperdício: borda esquerda de 4px em `erro`
- no celular: a tabela rola na horizontal dentro do card (a página nunca)

### `ItemDiagnostico`
Ícone, problema e "como corrigir".
- erro: ícone ✕ em `erro`
- aviso: ícone ! com fundo `aviso`
- ok: ícone ✓ em `apoio`

### `ItemSugestao` (texto gerado pela IA)
Texto, contador de caracteres (`27/30`) e botão de copiar.
- normal: contador em `texto-suave`
- hover: mostra o botão Copiar
- copiado: o botão vira "Copiado ✓" em `apoio` por 2s
- erro (limite estourado; nunca deve aparecer, mas existe como guarda): contador em `erro`

### `CampoTexto` / `SeletorPeriodo` / `SeletorConta`
- normal: borda `borda`
- hover: borda `texto-suave`
- foco: borda `primaria` de 2px
- desabilitado: fundo `fundo`, texto `texto-suave`
- erro: borda `erro` + mensagem em `erro` abaixo

### `AvisoRevisao`
Faixa fixa acima das sugestões da IA com fundo `aviso` e o texto: "Revise antes de publicar. A IA pode errar."

### Layout
- Menu lateral (desktop) ou inferior (celular) com 3 itens: **Painel**, **Anúncios**, **Palavras-chave**.
- Topo: `SeletorConta` + `SeletorPeriodo`.
- Espaçamento em múltiplos de 4px. Cards com raio de 12px. Margem lateral de 16px no celular.
