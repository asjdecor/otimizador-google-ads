import { readFileSync } from "node:fs";
import { expect, test, type Locator, type Page } from "@playwright/test";
import { SENHA_DO_TESTE_E2E } from "../../playwright.config";

/** Em modo dev a 1ª compilação é lenta: só interage depois que o React assumiu a página. */
async function esperarPaginaPronta(page: Page) {
  await page.waitForLoadState("networkidle");
}

/** Clica num link e espera a nova página (a 1ª compilação de cada rota em modo dev pode passar de 20 s). */
async function navegarPeloLink(page: Page, link: Locator, destino: RegExp) {
  await link.click();
  await page.waitForURL(destino, { timeout: 90_000 });
  await esperarPaginaPronta(page);
}

async function entrar(page: Page) {
  await page.goto("/painel");
  await expect(page).toHaveURL(/\/login/);
  await esperarPaginaPronta(page);
  await page.locator("#senha").fill(SENHA_DO_TESTE_E2E);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByRole("heading", { name: "Painel" })).toBeVisible();
}

test("login: sem sessão vai para o login, senha errada é recusada", async ({ page, request }) => {
  await page.goto("/anuncios");
  await expect(page).toHaveURL(/\/login\?volta=%2Fanuncios/);
  await esperarPaginaPronta(page);
  await page.locator("#senha").fill("senha errada");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByText("Senha incorreta.")).toBeVisible();

  const api = await request.post("/api/sugestoes", { data: {} });
  expect(api.status()).toBe(401);
});

test("fluxo principal: conectar → painel → anúncio → sugestões → palavras-chave → pesquisa de mercado → desconectar", async ({ page }) => {
  await entrar(page);

  // Conectar (OAuth de demonstração volta direto para o app)
  await navegarPeloLink(page, page.getByRole("link", { name: "Conectar agora" }), /\/conectar$/);
  await page.getByRole("link", { name: "Conectar com Google" }).click();
  await expect(page.getByText("Conta Google conectada.")).toBeVisible();
  await expect(page.getByRole("cell", { name: "Loja Demo - Sofás" })).toBeVisible();
  await expect(page.getByRole("cell", { name: "Gerente (MCC)" })).toBeVisible();
  await expect(page.locator("#seletor-conta")).not.toHaveValue("9000000000");

  // Painel: métricas e desperdício
  await navegarPeloLink(page, page.getByRole("link", { name: "Painel" }), /:3999\/$/);
  await expect(page.getByText(/R\$\s2\.850,00/).first()).toBeVisible();
  const desperdicio = page.getByRole("table", { name: "Palavras-chave que desperdiçam verba" });
  await expect(desperdicio.getByRole("cell", { name: "sofá barato" })).toBeVisible();
  await expect(desperdicio.getByRole("cell", { name: "sofá retrátil", exact: true })).toHaveCount(0);

  // Anúncio com CTR baixo → diagnóstico
  await navegarPeloLink(
    page,
    page.getByRole("table", { name: "Anúncios com CTR baixo" }).getByRole("link", { name: "Móveis Para Sua Casa" }),
    /\/anuncios\/10~102$/,
  );
  await expect(page.getByRole("heading", { name: "Diagnóstico" })).toBeVisible();
  await expect(page.getByLabel(/Nota \d+ de 100/)).toBeVisible();
  await expect(page.getByText("Nenhuma palavra-chave do grupo aparece nos títulos.")).toBeVisible();
  await esperarPaginaPronta(page);

  // Sugestões com IA: todas dentro do limite
  await page.locator("#contexto-ia").fill("frete grátis em SP");
  await page.getByRole("button", { name: "Gerar sugestões" }).click();
  await expect(page.getByRole("heading", { name: /Títulos sugeridos/ })).toBeVisible();
  const contadores = await page.getByTitle("Caracteres").allTextContents();
  expect(contadores.length).toBeGreaterThanOrEqual(14);
  for (const contador of contadores) {
    const [usados, limite] = contador.split("/").map(Number);
    expect(usados).toBeLessThanOrEqual(limite ?? 0);
  }
  await expect(page.getByText("contexto: “frete grátis em SP”")).toBeVisible();

  // Palavras-chave: regra, IA e exportação
  await navegarPeloLink(page, page.getByRole("link", { name: "Palavras-chave" }), /\/palavras-chave$/);
  await expect(page.getByRole("table", { name: "Negativas sugeridas por regra" }).getByRole("cell", { name: "conserto de sofá" })).toBeVisible();
  await expect(page.getByRole("table", { name: "Palavras novas sugeridas por regra" }).getByRole("cell", { name: "sofá retrátil 3 lugares" })).toBeVisible();
  await esperarPaginaPronta(page);
  await page.getByRole("button", { name: "Analisar com IA" }).click();
  await expect(page.getByRole("table", { name: "Palavras novas sugeridas pela IA" }).getByRole("cell", { name: "poltrona reclinável" })).toBeVisible();

  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: /Exportar CSV/ }).first().click(),
  ]);
  const csv = readFileSync(await download.path(), "utf8");
  expect(csv).toContain("Campaign,Ad group,Keyword,Criterion Type");
  expect(csv).toContain("conserto de sofá,Negative exact");

  // Pesquisa de mercado: concorrentes (o próprio site é descartado), palavras recomendadas e CSV
  await navegarPeloLink(page, page.getByRole("link", { name: "Pesquisa", exact: true }), /\/pesquisa$/);
  await esperarPaginaPronta(page);
  await page.getByRole("button", { name: "Pesquisar concorrentes" }).click();
  await expect(page.getByRole("heading", { name: "Palavras recomendadas" })).toBeVisible({ timeout: 90_000 });
  await expect(page.getByRole("article")).toHaveCount(2);
  await expect(page.getByRole("heading", { name: "sofaspaulista.example" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "sofas-demo.example" })).toHaveCount(0);
  const [downloadPesquisa] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: /Exportar CSV/ }).first().click(),
  ]);
  expect(downloadPesquisa.suggestedFilename()).toBe("pesquisa-de-mercado.csv");
  const csvPesquisa = readFileSync(await downloadPesquisa.path(), "utf8");
  expect(csvPesquisa).toContain("sofá cama");

  // Desconectar e sair
  await page.goto("/conectar");
  await esperarPaginaPronta(page);
  page.once("dialog", (dialogo) => void dialogo.accept());
  await page.getByRole("button", { name: "Desconectar" }).click();
  await expect(page.getByText("Nenhuma conta conectada")).toBeVisible();
  await page.getByRole("button", { name: "Sair" }).click();
  await expect(page).toHaveURL(/\/login/);
});
