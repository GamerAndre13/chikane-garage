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
