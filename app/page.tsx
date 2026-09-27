import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { VehicleCardGallery } from "@/components/ui/vehicle-card-gallery";
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
  vehicle_images?: { url?: string | null; position?: number | null; alt_text?: string | null }[] | null;
  description?: string | null;
};

type SiteContent = { section_key: string; body: string | null };

export default async function HomePage() {
  const supabase = await createClient();

  const [vehiclesRes, contentRes] = await Promise.all([
    supabase
      .from("vehicles")
      .select("*, vehicle_images(url, position, alt_text)")
      .eq("status", "available")
      .order("created_at", { ascending: false })
      .limit(4),
    supabase.from("site_content").select("section_key, body"),
  ]);

  const vehicles = (vehiclesRes.data || []) as Vehicle[];

  const contentMap: Record<string, string> = {};
  for (const row of (contentRes.data || []) as SiteContent[]) {
    if (row.body) contentMap[row.section_key] = row.body;
  }
  const t = (key: string) => contentMap[key] || FALLBACK[key as keyof typeof FALLBACK] || "";

  return (
    <div style={{ backgroundColor: "#0a0a0a" }}>
      {/* ─── HERO ─── */}
      <section className="relative flex min-h-[82vh] items-center overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1555215695-3004980ad54e?w=1920&q=80')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/75 to-black/50" />

        <div className="relative z-10 mx-auto w-full max-w-[1440px] px-5 text-left sm:px-8 lg:px-12">
          <p className="font-display text-[11px] uppercase tracking-[0.32em] text-copper">
            {t("hero.tagline")}
          </p>
          <h1 className="mt-7 max-w-5xl font-display text-6xl font-bold uppercase leading-[0.94] tracking-tight text-white sm:text-7xl lg:text-[7.5rem]">
            {t("hero.slogan").split("\n").map((line, i) => (
              <span key={i} className="block">{line}</span>
            ))}
          </h1>
          <p className="mt-6 max-w-xl text-sm leading-relaxed text-gray-300 sm:text-base">
            {t("hero.intro")}
          </p>
          <div className="mt-9 flex flex-col items-start gap-3 sm:flex-row">
            <Link href="/catalogo" className="inline-flex items-center justify-center bg-copper px-10 py-4 font-display text-sm font-semibold uppercase tracking-widest text-white transition-hover hover:bg-copper-light">
              Ver Catálogo
            </Link>
            <Link href="/sobre" className="inline-flex items-center justify-center border border-white/30 px-10 py-4 font-display text-sm font-semibold uppercase tracking-widest text-white transition-colors hover:border-white hover:bg-white/10">
              A Nossa História
            </Link>
          </div>
        </div>
      </section>

      {/* ─── DESTAQUE ─── */}
      <section className="mx-auto max-w-[1440px] px-5 py-20 sm:px-8 lg:px-12">
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
            {vehicles.map((v) => {
              const photos = [...(v.cover_image_url ? [{ url: v.cover_image_url }] : []), ...((v.vehicle_images || []).filter((image) => image.url).sort((a, b) => (a.position ?? 0) - (b.position ?? 0)).map((image) => ({ url: image.url!, alt: image.alt_text || "" })))].filter((photo, index, all) => all.findIndex((candidate) => candidate.url === photo.url) === index).slice(0, 4);
              return (
              <article key={v.id} className="group overflow-hidden rounded border border-border transition-shadow hover:shadow-lg hover:shadow-copper/5" style={{ backgroundColor: "#141414" }}>
                <VehicleCardGallery photos={photos} href={`/catalogo/${v.slug}`} title={`${v.brand ?? ""} ${v.model ?? ""}`}>
                  <span className="pointer-events-none absolute left-3 top-3 z-10 bg-copper px-2.5 py-1 font-display text-[10px] font-semibold uppercase tracking-widest text-white">SPOTLIGHT</span>
                </VehicleCardGallery>
                <Link href={`/catalogo/${v.slug}`} className="block p-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-copper">
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
                </Link>
              </article>
            )})}
          </div>
        )}
      </section>

      {/* ─── A GARAGEM ─── */}
      <section style={{ backgroundColor: "#10100f" }}>
        <div className="mx-auto max-w-[1440px] px-5 py-20 sm:px-8 lg:px-12">
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
