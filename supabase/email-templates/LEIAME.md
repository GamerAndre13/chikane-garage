# Emails de conta (Supabase) — template + SMTP

Configuração dos emails de autenticação da Supabase (confirmação de conta,
recuperar password, etc.) para saírem com a identidade Chikane Garage,
através do Resend.

**Pré-requisito verificado:** o domínio `chikanegarage.blog` já está
**verified** no Resend (`chikanegarage.blog` → região `eu-west-1`).

---

## 1. Ativar o SMTP do Resend na Supabase (passo recomendado)

Faz com que TODOS os emails de auth (confirmação, reset de password, …)
saiam de `no-reply@chikanegarage.blog` via Resend em vez de
`no-reply@supabase.co`.

1. Resend Dashboard → **API Keys** → copiar a chave
   (a mesma que está no `.env.local` em `RESEND_API_KEY`).
2. Supabase Dashboard → projeto → **Authentication** → **Notifications**
   → **Email** → **SMTP Settings**:

   | Campo | Valor |
   |---|---|
   | Enable SMTP | ✅ |
   | Host | `smtp.resend.com` |
   | Port | `587` (STARTTLS) |
   | Username | `resend` |
   | Password | `<RESEND_API_KEY>` |
   | Sender email | `no-reply@chikanegarage.blog` |
   | Sender name | `Chikane Garage` |

3. **Save**.

Referência oficial: <https://resend.com/docs/send-with-supabase-smtp>
(usa **587** — é o valor da doc da Supabase; 465 também aceita, mas
**nunca uma porta inválida**: a causa original do bug de confirmação foi a
porta estar `461` — typo —, que fazia o signup pendurar e dar 504.)

**Estado:** SMTP verificado fim-a-fim a 2026-10-07 (via Management API):
signup devolve 200 e o email de confirmação chega ao Resend com o template
personalizado.

## 2. Template da confirmação de conta

1. Supabase Dashboard → **Authentication** → **Email Templates**
   (ou **Emails** → secção *Templates*).
2. Selecionar **Confirm signup**.
3. Substituir todo o conteúdo pelo de [`confirm-signup.html`](./confirm-signup.html).
4. **Save**.

Variáveis usadas (a Supabase substitui-as ao enviar):

- `{{ .ConfirmationURL }}` — link de confirmação
- `{{ .Email }}` — email do utilizador

## 3. Teste

1. Criar uma conta nova em <https://chikanegarage.blog/conta>.
2. Deve chegar o email de confirmação — assunto default da Supabase
   (*Confirm your email address*; não é editável) com o corpo do template
   personalizado (título «Confirma a tua conta»).
3. Clicar no botão → conta activa e sessão iniciada.

---

## Newsletter (rota `/api/newsletter/subscribe`)

A newsletter NÃO usa o SMTP da Supabase — envia diretamente pela API do
Resend a partir do worker. Por isso precisa da chave também como **secret
do Worker** em produção (sem ela, o envio é saltado e ficaria registado
nos logs `RESEND_API_KEY em falta no ambiente`):

```bash
npx wrangler login
npx wrangler secret put RESEND_API_KEY --name chikane-garage1   # valor = o da .env.local
```

**Estado:** `RESEND_API_KEY` já está no worker `chikane-garage1` (desde 2026-10-07) —
newsletter enviada e verificada fim-a-fim.

Ou pelo dashboard Cloudflare: **Workers & Pages → chikane-garage1 →
Settings → Variables and Secrets → Add → Secret** (`RESEND_API_KEY`).
