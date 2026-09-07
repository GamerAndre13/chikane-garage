---
name: shadcn-mcp
description: Como usar o MCP server shadcn/ui para buscar e aplicar componentes
---

# shadcn/ui MCP Server - Guia de Uso

## O que é
Um MCP (Model Context Protocol) server que conecta diretamente ao repositório `shadcn-ui/ui` no GitHub e traz componentes reais, atualizados, prontos para usar.

## Já configurado!
O servidor está adicionado globalmente em `~/.claude.json`:
```json
"mcpServers": {
  "shadcn": {
    "type": "stdio",
    "command": "npx",
    "args": ["-y", "@jpisnice/shadcn-ui-mcp-server"]
  }
}
```

## Ferramentas Disponíveis

| Ferramenta | Para que serve |
|------------|----------------|
| `list_components` | Lista todos os 61 componentes disponíveis |
| `get_component` | Código completo de um componente (ex: `button`, `sidebar`) |
| `get_component_demo` | Exemplos de uso do componente |
| `get_component_metadata` | Dependências, ficheiros, etc. |
| `get_block` | Blocos compostos (dashboard-01, login-02, sidebar-01, etc.) |
| `list_blocks` | Lista blocos por categoria |
| `apply_theme` | Aplica temas TweakCN |
| `list_themes` | Lista temas disponíveis |

## Componentes Essenciais para Chikane Garage

### Admin Layout
- **`sidebar`** - Navigation sidebar collapsible
- **`sheet`** - Mobile drawer para sidebar
- **`dropdown-menu`** - User menu, actions
- **`avatar`** - User avatar no header
- **`breadcrumb`** - Navegação admin

### Data Display
- **`data-table`** / **`table`** - Tabelas com sort, filter, pagination
- **`card`** - Vehicle cards no catálogo
- **`badge`** - Status (disponível, vendido, reservado)
- **`avatar`** - Imagens veículos (ou usar `image` customizado)
- **`tabs`** - Abas: Detalhes / Equipamento / Histórico

### Forms (Admin + Perfil)
- **`form`** - React Hook Form + Zod wrapper
- **`input`**, **`textarea`**, **`select`**, **`checkbox`**, **`radio-group`**
- **`input-otp`** - Código verificação (se precisar)
- **`date-picker`** / **`calendar`** - Data test drive
- **`file-upload`** - Upload imagens (pode precisar custom)

### Feedback & Overlays
- **`dialog`** - Modais confirmação (eliminar, publicar)
- **`alert-dialog`** - Confirmações destrutivas
- **`sheet`** - Side panel (filtros mobile, detalhes)
- **`popover`**, **`tooltip`** - Info contextual
- **`toast`** / **`sonner`** - Notifications
- **`skeleton`** - Loading states

### Navigation
- **`navigation-menu`** - Header navigation desktop
- **`pagination`** - Catálogo paginação
- **`tabs`** - Abas perfil (Dados / Password / Veículos guardados)

## Como Pedir para Usar

> **"Vai buscar o componente `sidebar` do shadcn e cria o admin layout"**
> **"Quero o `data-table` para listar veículos no admin com busca e paginação"**
> **"Mostra-me o `dialog` para confirmar eliminação de utilizador"**
> **"Lista os blocos `dashboard` disponíveis"**
> **"Aplica um tema `dark` / `copper` via TweakCN"**

## Exemplo Prático: Sidebar Admin

```tsx
// O que o MCP traz (sidebar.tsx)
import { Sidebar, SidebarContent, SidebarGroup, SidebarMenu, SidebarMenuItem } from "@/components/ui/sidebar"

// Uso no app/admin/layout.tsx
<Sidebar>
  <SidebarContent>
    <SidebarGroup>
      <SidebarMenu>
        <SidebarMenuItem>Dashboard</SidebarMenuItem>
        <SidebarMenuItem>Veículos</SidebarMenuItem>
        <SidebarMenuItem>Leads</SidebarMenuItem>
      </SidebarMenu>
    </SidebarGroup>
  </SidebarContent>
</Sidebar>
```

## Dicas Importantes

1. **Componentes vêm com dependências** - o MCP diz que pacotes instalar (`@radix-ui/...`, `class-variance-authority`, `lucide-react`, etc.)

2. **Tailwind v4** - os componentes usam classes Tailwind, compatíveis com o teu `@theme` inline

3. **Customização** - depois de trazer o componente, podes adaptar:
   - Cores: troca `bg-muted` por `bg-surface`, `text-muted-foreground` por `text-silver`
   - Accent: usa `copper` em vez de `primary`
   - Fontes: `font-display` para headings

4. **Blocos (blocks)** - para páginas inteiras:
   - `dashboard-01`, `dashboard-02` - Admin dashboards
   - `login-01`, `login-02` - Páginas auth
   - `sidebar-01`, `sidebar-02` - Sidebar layouts completos

## Instalação Dependências Comuns

```bash
# Base (já deves ter a maioria)
npm i @radix-ui/react-slot @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-avatar @radix-ui/react-tabs @radix-ui/react-select @radix-ui/react-label @radix-ui/react-separator @radix-ui/react-tooltip @radix-ui/react-popover @radix-ui/react-sheet @radix-ui/react-navigation-menu @radix-ui/react-accordion @radix-ui/react-collapsible @radix-ui/react-breadcrumb @radix-ui/react-pagination @radix-ui/react-progress @radix-ui/react-switch @radix-ui/react-toggle @radix-ui/react-toggle-group @radix-ui/react-radio-group @radix-ui/react-checkbox @radix-ui/react-accordion class-variance-authority clsx tailwind-merge lucide-react

# Para data-table
npm i @tanstack/react-table @radix-ui/react-column-resize

# Para forms
npm i react-hook-form @hookform/resolvers zod

# Para charts (se precisar)
npm i recharts @radix-ui/react-chart
```

## Rate Limits
- Sem GitHub token: 60 req/hora
- Com token: `npx @jpisnice/shadcn-ui-mcp-server --github-api-key ghp_xxx`
- Adiciona `GITHUB_PERSONAL_ACCESS_TOKEN` no env se precisares mais