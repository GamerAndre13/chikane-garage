import { expect, test } from "@playwright/test";

test("percurso público: início, catálogo e contacto", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

  await page.getByRole("link", { name: "Catálogo", exact: true }).first().click();
  await expect(page).toHaveURL(/\/catalogo$/);
  await expect(page.getByRole("heading", { level: 1, name: "Catálogo" })).toBeVisible();

  await page.goto("/contacto");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByLabel("Nome *")).toBeVisible();
  await expect(page.getByLabel("Email *")).toBeVisible();
  await expect(page.getByLabel("Telefone *")).toBeVisible();

  await page.getByLabel("Nome *").fill("Cliente de teste");
  await page.getByLabel("Email *").fill("qa@example.invalid");
  await page.getByLabel("Telefone *").fill("910000000");
  await page.getByLabel("Mensagem *").fill("Teste automatizado sem envio.");
  await expect(page.getByRole("button", { name: "Enviar Mensagem" })).toBeEnabled();
});

test("páginas públicas institucionais e de descoberta abrem", async ({ page }) => {
  const pages = [
    ["/novos", "Novos"],
    ["/campanhas", "Campanhas"],
    ["/sobre", "Sobre"],
    ["/termos-e-condicoes", "Termos"],
    ["/politica-de-privacidade", "Privacidade"],
  ] as const;

  for (const [path, label] of pages) {
    const response = await page.goto(path);
    expect(response?.ok(), `${label} deve responder com sucesso`).toBeTruthy();
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
  }
});

test("conta apresenta opções de autenticação e rota desconhecida apresenta 404", async ({ page }) => {
  await page.goto("/conta");
  await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
  await expect(page.locator("form").first()).toBeVisible();

  const response = await page.goto("/esta-pagina-nao-existe-qa");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
});
