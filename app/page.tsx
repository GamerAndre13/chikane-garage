import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import NewsletterForm from "@/components/newsletter-form";

export const metadata = {
  title: "Chikane Garage — Performance Diesel BMW, Selecionadas a Dedo",
  description: "Viaturas diesel BMW de performance, inspecionadas, documentadas e entregues com garantia Chikane.",
};

const FALLBACK = {
  "hero.tagline": "Seleção Rigorosa · Garantia Chikane",
  "hero.slogan": "Precision.\nImported.\nPassion Delivered.",
  "hero.intro": "Viaturas diesel BMW de performance, selecionadas a dedo na Europa e entregues em Portugal com garantia completa.",
  "garage.title": "A Garagem",
  "garage.text": "Cada viatura na Chikane Garage passou por um processo de seleção rigoroso. Compramos com cuidado, inspecionamos com pormenor, documentamos com transparência e entregamos com garantia.",
  "shop.title": "Equipe o Seu BMW",
  "shop.text": "Peças, acessórios e produtos que acreditamos para o teu BMW.",
  "newsletter.title": "As viaturas saem antes de chegarem ao site",
  "newsletter.text": "Alguns clientes são informados antes de as viaturas serem anunciadas.",
};

const PROCESS_STEPS = [
  { num: "01", title: "Seleção", text: "Viaturas escolhidas a dedo, de fornecedores de confiança na Europa." },
  { num: "02", title: "Inspecção", text: "Revisão completa com 140 pontos de verificação. Documentamos tudo." },
  { num: "03", title: "Transparência", text: "Quilómetros verificados, histórico real, sem surpresas." },
  { num: "04", title: "Entrega", text: "Com garantia Chikane e documentação completa." },
];

type Vehicle = {
  id: string;
  slug: string;
  brand?: string | null;
  model?: string | null;
  trim?: string | null;
  registration_year?: number | null;
  mileage_km?: number | null;
  power_hp?: number | null;
  fuel_type?: string | null;
  transmission?: string | null;
  price?: number | null;
  status?: string | null;
  cover_image_url?: string | null;
  description?: string | null;
};

type Product = {
  id: string;
  name?: string | null;
  price?: number | null;
  image_url?: string | null;
};

type SiteContent = { section_key: string; body: string | null };

export default async function HomePage() {
  const supabase = await createClient();

  const [vehiclesRes, productsRes, contentRes] = await Promise.all([
    supabase
      .from("vehicles")
      .select("*")
      .eq("status", "available")
      .order("created_at", { ascending: false })
      .limit(4),
    supabase
      .from("shop_products")
      .select("*")
      .eq("active", true)
      .order("created_at", { ascending: false })
      .limit(4),
    supabase.from("site_content").select("section_key, body"),
  ]);

  const vehicles = (vehiclesRes.data || []) as Vehicle[];
  const products = (productsRes.data || []) as Product[];

  const contentMap: Record<string, string> = {};
  for (const row of (contentRes.data || []) as SiteContent[]) {
    if (row.body) contentMap[row.section_key] = row.body;
  }
  const t = (key: string) => contentMap[key] || FALLBACK[key as keyof typeof FALLBACK] || "";

  return (
    <div style={{ backgroundColor: "#0a0a0a" }}>
      {/* ─── HERO ─── */}
      <section className="relative flex min-h-[85vh] items-center justify-center overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1555215695-3004980ad54e?w=1920&q=80')" }}
        />
        <div className="absolute inset-0 bg-black/60" />

        <div className="relative z-10 mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <p className="font-display text-xs uppercase tracking-[0.4em] text-copper">
            {t("hero.tagline")}
          </p>
          <h1 className="mt-6 font-display text-5xl font-bold uppercase leading-[1.1] tracking-wide text-white sm:text-6xl lg:text-8xl">
            {t("hero.slogan").split("\n").map((line, i) => (
              <span key={i} className="block">{line}</span>
            ))}
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-gray-300 sm:text-lg">
            {t("hero.intro")}
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href="/catalogo" className="inline-flex items-center justify-center bg-copper px-10 py-4 font-display text-sm font-semibold uppercase tracking-widest text-white transition-hover hover:bg-copper-light">
              Ver Catálogo
            </Link>
            <Link href="/sobre" className="inline-flex items-center justify-center border border-white/30 px-10 py-4 font-display text-sm font-semibold uppercase tracking-widest text-white transition-colors hover:border-white hover:bg-white/10">
              A Nossa História
            </Link>
          </div>
          <div className="mx-auto mt-20 grid max-w-md grid-cols-3 gap-8 border-t border-white/20 pt-10">
            {[
              { value: "100%", label: "Verificadas" },
              { value: "6 Mo.", label: "Garantia" },
              { value: "0 €", label: "Comissões" },
            ].map((s) => (
              <div key={s.label}>
                <p className="font-display text-2xl font-bold text-copper">{s.value}</p>
                <p className="mt-1 text-xs uppercase tracking-widest text-gray-400">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── DESTAQUE ─── */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between">
          <div>
            <p className="font-display text-xs uppercase tracking-[0.3em] text-copper">Em destaque esta semana</p>
            <h2 className="mt-3 font-display text-3xl font-bold uppercase tracking-wide text-foreground sm:text-4xl">Actualmente na Garagem</h2>
          </div>
          <Link href="/catalogo" className="hidden font-display text-xs font-semibold uppercase tracking-widest text-copper hover:text-copper-light transition-colors sm:inline">
            Ver tudo →
          </Link>
        </div>

        {vehicles.length === 0 ? (
          <div className="mt-12 rounded border border-border p-12 text-center" style={{ backgroundColor: "#141414" }}>
            <p className="text-sm text-muted">Nenhuma viatura disponível de momento.</p>
          </div>
        ) : (
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {vehicles.map((v) => (
              <Link key={v.id} href={`/catalogo/${v.slug}`} className="group block overflow-hidden rounded border border-border transition-shadow hover:shadow-lg hover:shadow-copper/5" style={{ backgroundColor: "#141414" }}>
                <div className="relative aspect-[4/3] overflow-hidden" style={{ backgroundColor: "#1c1c1c" }}>
                  {v.cover_image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={v.cover_image_url} alt={`${v.brand ?? ""} ${v.model ?? ""}`} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center">
                      <span className="text-4xl">🚗</span>
                      <span className="mt-2 font-display text-xs uppercase tracking-[0.3em] text-copper">Chikane Garage</span>
                    </div>
                  )}
                  <span className="absolute left-3 top-3 z-10 bg-copper px-2.5 py-1 font-display text-[10px] font-semibold uppercase tracking-widest text-white">SPOTLIGHT</span>
                </div>
                <div className="p-4">
                  <p className="text-xs text-muted">{v.brand} · {v.registration_year}</p>
                  <h3 className="mt-1 font-display text-lg font-bold uppercase tracking-wide text-foreground">{v.model}</h3>
                  {v.trim && <p className="mt-0.5 text-xs font-medium uppercase tracking-wider text-muted">{v.trim}</p>}
                  <div className="mt-3 space-y-1 border-t border-border pt-3">
                    {v.mileage_km != null && (
                      <div className="flex items-center gap-2 text-xs text-muted">
                        <span className="font-semibold uppercase tracking-wide text-foreground">KM</span>
                        <span>{v.mileage_km.toLocaleString("pt-PT")} km</span>
                      </div>
                    )}
                    {v.power_hp != null && (
                      <div className="flex items-center gap-2 text-xs text-muted">
                        <span className="font-semibold uppercase tracking-wide text-foreground">Potência</span>
                        <span>{v.power_hp} cv</span>
                      </div>
                    )}
                    {v.transmission && (
                      <div className="flex items-center gap-2 text-xs text-muted">
                        <span className="font-semibold uppercase tracking-wide text-foreground">Caixa</span>
                        <span>{v.transmission === "automatic" ? "Automática" : "Manual"}</span>
                      </div>
                    )}
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
                    <span className="font-display text-lg font-bold text-foreground">
                      {v.price != null ? `${v.price.toLocaleString("pt-PT")} €` : "Sob consulta"}
                    </span>
                    <span className="font-display text-xs font-semibold uppercase tracking-widest text-copper">Ver Viatura</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* ─── A GARAGEM ─── */}
      <section style={{ backgroundColor: "#141414" }}>
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="grid items-center gap-16 lg:grid-cols-2">
            <div>
              <p className="font-display text-xs uppercase tracking-[0.3em] text-copper">{t("garage.title")}</p>
              <h2 className="mt-3 font-display text-3xl font-bold uppercase tracking-wide text-foreground sm:text-4xl">
                Compramos como se fosse<br />para nós. Porque já foi.
              </h2>
              <div className="mt-4 h-0.5 w-12 bg-copper" />
              <p className="mt-6 max-w-lg text-sm leading-relaxed text-silver">{t("garage.text")}</p>
              <Link href="/sobre" className="mt-8 inline-block border border-copper px-8 py-3 font-display text-xs font-semibold uppercase tracking-widest text-copper transition-colors hover:bg-copper hover:text-white">
                Ler a História Completa →
              </Link>
            </div>
            <div className="relative overflow-hidden rounded">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=800&q=80" alt="BMW Performance" className="h-80 w-full object-cover" />
            </div>
          </div>
        </div>
      </section>

      {/* ─── PROCESSO ─── */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <p className="font-display text-xs uppercase tracking-[0.3em] text-copper">O Nosso Processo</p>
        <h2 className="mt-3 font-display text-3xl font-bold uppercase tracking-wide text-foreground sm:text-4xl">De Seleção a Entrega</h2>
        <div className="relative mt-14">
          <div className="absolute left-0 top-6 hidden h-px w-full bg-border lg:block" />
          <div className="grid gap-8 lg:grid-cols-4">
            {PROCESS_STEPS.map((s) => (
              <div key={s.num} className="relative">
                <div className="relative z-10 mb-6 flex h-12 w-12 items-center justify-center rounded-full border-2 border-copper font-display text-sm font-bold text-copper lg:h-10 lg:w-10 lg:text-xs" style={{ backgroundColor: "#0a0a0a" }}>
                  {s.num}
                </div>
                <h3 className="font-display text-lg font-bold uppercase tracking-wide text-foreground">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── LOJA ─── */}
      <section style={{ backgroundColor: "#141414" }}>
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between">
            <div>
              <p className="font-display text-xs uppercase tracking-[0.3em] text-copper">{t("shop.title")}</p>
              <h2 className="mt-3 font-display text-3xl font-bold uppercase tracking-wide text-foreground sm:text-4xl">Peças &amp; Acessórios</h2>
            </div>
            <Link href="/loja" className="hidden font-display text-xs font-semibold uppercase tracking-widest text-copper hover:text-copper-light transition-colors sm:inline">
              Entrar na loja →
            </Link>
          </div>
          <p className="mt-4 max-w-lg text-sm leading-relaxed text-muted">{t("shop.text")}</p>
          {products.length === 0 ? (
            <div className="mt-12 rounded border border-border p-12 text-center" style={{ backgroundColor: "#0a0a0a" }}>
              <p className="text-sm text-muted">A preparar a loja. Fica atento.</p>
            </div>
          ) : (
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {products.map((p) => (
                <div key={p.id} className="group overflow-hidden rounded border border-border transition-shadow hover:shadow-lg hover:shadow-copper/5" style={{ backgroundColor: "#0a0a0a" }}>
                  <div className="relative aspect-square overflow-hidden" style={{ backgroundColor: "#1c1c1c" }}>
                    {p.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.image_url} alt={p.name ?? ""} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center"><span className="text-4xl">📦</span></div>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="font-display text-sm font-semibold uppercase tracking-wide text-foreground">{p.name || "Produto"}</h3>
                    <p className="mt-2 font-display text-base font-bold text-copper">
                      {p.price != null ? `${p.price.toLocaleString("pt-PT")} €` : "Sob consulta"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ─── NEWSLETTER ─── */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded border border-border p-12 sm:p-16" style={{ backgroundColor: "#141414" }}>
          <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-copper/10" />
          <div className="relative z-10 max-w-lg">
            <p className="font-display text-xs uppercase tracking-[0.3em] text-copper">Newsletter</p>
            <h2 className="mt-4 font-display text-2xl font-bold uppercase tracking-wide text-foreground sm:text-3xl">{t("newsletter.title")}</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted">{t("newsletter.text")}</p>
            <NewsletterForm />
            <p className="mt-4 text-xs text-muted">Sem spam. Apenas novidades que interessam.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
