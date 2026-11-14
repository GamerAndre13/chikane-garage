const stagingUrl = process.env.STAGING_SUPABASE_URL;
const anonKey = process.env.STAGING_SUPABASE_ANON_KEY;
const productionUrl = process.env.PRODUCTION_SUPABASE_URL;
const stagingSiteUrl = process.env.STAGING_BASE_URL;
const productionSiteUrl = process.env.PRODUCTION_BASE_URL;

if (!stagingUrl || !anonKey || !productionUrl || !stagingSiteUrl || !productionSiteUrl) {
  throw new Error("Define os URLs e a chave anon de staging e os URLs correspondentes de produção.");
}

const staging = new URL(stagingUrl);
const production = new URL(productionUrl);
const stagingSite = new URL(stagingSiteUrl);
const productionSite = new URL(productionSiteUrl);
const productionHosts = new Set(["chikanegarage.blog", "www.chikanegarage.blog"]);

if (staging.protocol !== "https:" || staging.origin === production.origin || productionHosts.has(staging.hostname.toLowerCase()) || stagingSite.protocol !== "https:" || stagingSite.origin === productionSite.origin || productionHosts.has(stagingSite.hostname.toLowerCase())) {
  throw new Error("Os endereços de staging têm de ser HTTPS, separados dos endereços de produção e não podem usar o domínio público.");
}

const privateTables = [
  "profiles",
  "favorites",
  "newsletter_subscribers",
  "contact_requests",
  "test_drives",
  "reservations",
];

const apiHeaders = { apikey: anonKey };
if (!anonKey.startsWith("sb_publishable_")) {
  apiHeaders.authorization = `Bearer ${anonKey}`;
}

const publicCheck = await fetch(`${staging.origin}/rest/v1/site_content?select=section_key&limit=1`, {
  headers: apiHeaders,
});

if (!publicCheck.ok) {
  throw new Error(`A chave pública não conseguiu aceder à API de staging (HTTP ${publicCheck.status}). Confirma o URL, a chave e o schema.`);
}

const publicRows = await publicCheck.json();
if (!Array.isArray(publicRows)) {
  throw new Error("A API de staging não devolveu uma lista válida para site_content.");
}

const failures = [];

for (const table of privateTables) {
  const response = await fetch(`${staging.origin}/rest/v1/${table}?select=*&limit=1`, {
    headers: apiHeaders,
  });

  if (response.status === 401 || response.status === 403) continue;

  if (!response.ok) {
    failures.push(`${table}: resposta inesperada ${response.status}`);
    continue;
  }

  const rows = await response.json();
  if (!Array.isArray(rows) || rows.length !== 0) {
    failures.push(`${table}: a chave anon conseguiu ler registos privados`);
  }
}

if (failures.length) {
  throw new Error(`Falha nas verificações RLS de leitura anónima:\n- ${failures.join("\n- ")}`);
}

console.log(`RLS verificada em ${privateTables.length} tabelas privadas com a chave anon; nenhuma escrita foi efetuada.`);
