import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { VehicleCardGallery } from "@/components/ui/vehicle-card-gallery";
import { FavoriteButton } from "@/components/ui/favorite-button";
import NewsletterForm from "@/components/newsletter-form";
import { expireReservations } from "@/lib/expire-reservations";
import { Reveal } from "@/components/ui/reveal";
import type { SiteSettings } from "@/lib/site-settings";

export const metadata = {
  title: "Chikane Garage — Catálogo de Viaturas",
  description: "Consulta as viaturas disponíveis na Chikane Garage e pede informação sobre cada unidade.",
};

const FALLBACK = {
  "hero.tagline": "Seleção rigorosa · Garantia garantida",
  "hero.slogan": "Precision.\nPerfected.\nPassion.",
  "hero.intro": "Uma garagem privada de performance. Cada unidade escolhida à mão, inspecionada ao detalhe e entregue com garantia Chikane — para quem vive a estrada com paixão.",
  "garage.title": "A Garagem",
  "garage.text": "Compramos cada viatura como se fosse para a nossa própria coleção: histórico verificado, mecânica e estética inspecionadas ao detalhe, sempre com a garantia Chikane. Fala connosco para confirmar a disponibilidade e as condições.",
  "newsletter.title": "As viaturas saem antes de chegarem ao site",
  "newsletter.text": "Alguns clientes são informados antes de as viaturas serem anunciadas.",
};

const PROCESS_STEPS = [
  { num: "01", title: "Selecção", text: "Critérios rigorosos de escolha: histórico, estado e equipamento." },
  { num: "02", title: "Informação", text: "Consulta os dados disponíveis na ficha de cada viatura." },
  { num: "03", title: "Contacto", text: "Esclarece dúvidas e confirma disponibilidade diretamente com a equipa." },
  { num: "04", title: "Condições", text: "Confirma por escrito as condições da viatura antes de avançar." },
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

  // Reservas vencidas (máx. 7 dias) voltam a "available" antes da leitura.
  await expireReservations();
  const [vehiclesRes, spotlightRes, contentRes, settingsRes] = await Promise.all([
    supabase
      .from("vehicles")
      .select("*, vehicle_images(url, position, alt_text)")
      .eq("status", "available")
      .order("created_at", { ascending: false })
      .limit(4),
    supabase
      .from("vehicles")
      .select("*, vehicle_images(url, position, alt_text)")
      .eq("spotlight", true)
      .limit(1),
    supabase.from("site_content").select("section_key, body"),
    supabase.from("site_settings").select("photo_home_hero, photo_home_history").limit(1).maybeSingle(),
  ]);

  const vehicles = (vehiclesRes.data || []) as Vehicle[];
  // A viatura marcada como destaque da semana (fallback: a mais recente)
  const spotlight = ((spotlightRes.data?.[0] as Vehicle | undefined) ?? vehicles[0]) || null;
  // A viatura do spotlight não pode repetir-se no "Em destaque": busca uma
  // a mais (limit 4) e remove-a da grelha (fica 3 cartões).
  const gridVehicles = vehicles.filter((v) => v.id !== spotlight?.id).slice(0, 3);
  const photos = settingsRes.data as Pick<SiteSettings, "photo_home_hero" | "photo_home_history"> | null;

  // Normaliza chaves (aceita "hero.tagline" e "hero_tagline") para o CMS
  // funcionar independentemente da convenção usada na base de dados.
  const normalizeKey = (k: string) => k.replace(/\./g, "");
  const contentMap: Record<string, string> = {};
  for (const row of (contentRes.data || []) as SiteContent[]) {
    if (row.body) {
      contentMap[row.section_key] = row.body;
      contentMap[normalizeKey(row.section_key)] = row.body;
    }
  }
  const t = (key: string) =>
    contentMap[key] ||
    contentMap[normalizeKey(key)] ||
    FALLBACK[key as keyof typeof FALLBACK] ||
    "";

  return (
    <div className="bg-background-alt">
      {/* ─── HERO ─── */}
      <section className="relative flex min-h-svh items-center overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `url('${photos?.photo_home_hero || "https://images.unsplash.com/photo-1555215695-3004980ad54e?w=1920&q=80"}')`,
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/30 to-transparent" />

        <div className="relative z-10 mx-auto w-full max-w-[1440px] px-5 text-left sm:px-8 lg:px-12">
          <p className="font-display text-[11px] uppercase tracking-[0.32em] text-copper">
            {t("hero.tagline")}
          </p>
          <h1 className="mt-7 max-w-5xl font-display text-[clamp(2.75rem,7.5vw,7.5rem)] font-bold uppercase leading-[0.94] tracking-tight text-white text-balance">
            {t("hero.slogan").replace(/\. /g, ".\n").split("\n").map((line, i) => (
              <span key={i} className="block">{line}</span>
            ))}
          </h1>
          <p className="mt-6 max-w-xl text-sm leading-relaxed text-gray-300 sm:text-base">
            {t("hero.intro")}
          </p>
          <div className="mt-9 flex flex-col items-start gap-3 sm:flex-row">
            <Link href="/catalogo" className="inline-flex items-center justify-center bg-copper px-10 py-4 font-display text-sm font-semibold uppercase tracking-widest text-white transition-colors hover:bg-copper-light">
              Ver Catálogo
            </Link>
            <Link href="/sobre" className="inline-flex items-center justify-center border border-white/30 px-10 py-4 font-display text-sm font-semibold uppercase tracking-widest text-white transition-colors hover:border-white hover:bg-white/10">
              A Nossa História
            </Link>
          </div>
        </div>
      </section>

      {/* ─── SPOTLIGHT DA SEMANA ─── */}
      {spotlight && (
        <section className="border-y border-copper/15 bg-surface-oxide">
          <div className="mx-auto grid max-w-[1440px] items-stretch lg:grid-cols-2">
            <Reveal className="relative min-h-[340px] overflow-hidden bg-surface-mid lg:min-h-[560px]">
              {spotlight.cover_image_url ? (
                <Image
                  src={spotlight.cover_image_url}
                  alt={`${spotlight.brand ?? ""} ${spotlight.model ?? ""}`}
                  fill
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-surface-mid via-surface to-surface-oxide px-8">
                  <p className="text-center font-display text-2xl font-bold uppercase tracking-wide text-white/60">
                    {spotlight.brand} {spotlight.model}
                  </p>
                </div>
              )}
              <span className="absolute left-4 top-4 z-10 border border-copper bg-black/75 px-3 py-1.5 font-display text-[10px] font-semibold uppercase tracking-[0.2em] text-copper">
                ★ Spotlight da semana
              </span>
            </Reveal>
            <div className="flex flex-col justify-center bg-surface-mid p-8 sm:p-12 lg:p-16">
              <Reveal delay={120}>
                <p className="font-display text-[10px] uppercase tracking-[0.3em] text-copper">Spotlight da semana</p>
                <h2 className="mt-4 font-display text-4xl font-bold uppercase leading-[0.95] tracking-tight text-white sm:text-6xl">
                  {spotlight.brand} {spotlight.model}
                </h2>
                {spotlight.trim && (
                  <p className="mt-3 font-display text-xs uppercase tracking-[0.18em] text-copper">{spotlight.trim}</p>
                )}
                <p className="mt-5 max-w-lg text-sm leading-relaxed text-white/55">
                  {spotlight.description || "Viatura selecionada e inspecionada ao detalhe pela Chikane Garage."}
                </p>
                <div className="mt-6 grid max-w-md grid-cols-3 gap-3 border-y border-white/10 py-4">
                  <div>
                    <span className="block font-display text-[10px] uppercase tracking-[0.13em] text-white/60">Ano</span>
                    <span className="mt-1 block text-sm text-white">{spotlight.registration_year ?? "—"}</span>
                  </div>
                  <div>
                    <span className="block font-display text-[10px] uppercase tracking-[0.13em] text-white/60">Quilómetros</span>
                    <span className="mt-1 block text-sm text-white">{spotlight.mileage_km?.toLocaleString("pt-PT") ?? "—"} km</span>
                  </div>
                  <div>
                    <span className="block font-display text-[10px] uppercase tracking-[0.13em] text-white/60">Potência</span>
                    <span className="mt-1 block text-sm text-white">{spotlight.power_hp ?? "—"} cv</span>
                  </div>
                </div>
                <div className="mt-7 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
                  <Link
                    href={`/catalogo/${spotlight.slug}`}
                    className="inline-flex items-center justify-center bg-copper px-8 py-3.5 font-display text-xs font-semibold uppercase tracking-widest text-white transition-colors hover:bg-copper-light"
                  >
                    Ver viatura
                  </Link>
                  <span className="font-display text-2xl font-semibold tabular-nums text-white">
                    {spotlight.price != null ? `${spotlight.price.toLocaleString("pt-PT")} €` : "Sob consulta"}
                  </span>
                </div>
              </Reveal>
            </div>
          </div>
        </section>
      )}

      {/* ─── DESTAQUE ─── */}
      <section className="mx-auto max-w-[1440px] px-5 py-20 sm:px-8 sm:py-28 lg:px-12">
        <Reveal className="mb-9 flex items-end justify-between sm:mb-12">
          <div>
            <p className="font-display text-[10px] uppercase tracking-[0.28em] text-copper">Atualmente na garagem</p>
            <h2 className="mt-4 max-w-3xl font-display text-5xl font-bold uppercase leading-[0.95] tracking-tight text-white text-balance sm:text-7xl lg:text-8xl">Em destaque<br className="hidden sm:block"/> esta semana</h2>
          </div>
          <Link href="/catalogo" className="mb-1 hidden border-b border-copper pb-2 font-display text-[10px] font-semibold uppercase tracking-[0.18em] text-white transition-colors hover:text-copper sm:inline">Ver garagem ↗</Link>
        </Reveal>

        {gridVehicles.length === 0 ? (
          <div className="border border-border bg-surface-mid p-12 text-center"><p className="text-sm text-muted">Nenhuma viatura disponível de momento.</p></div>
        ) : <div className="grid items-stretch gap-5 md:grid-cols-2 xl:grid-cols-3">{gridVehicles.map((v, i) => {
          const photos = [...(v.cover_image_url ? [{ url: v.cover_image_url }] : []), ...((v.vehicle_images || []).filter((image) => image.url).sort((a, b) => (a.position ?? 0) - (b.position ?? 0)).map((image) => ({ url: image.url!, alt: image.alt_text || "" })))].filter((photo, index, all) => all.findIndex((candidate) => candidate.url === photo.url) === index).slice(0, 2);
          return <Reveal key={v.id} className="h-full" delay={Math.min(i * 90, 360)}><article className="card-lift group flex h-full flex-col overflow-hidden border border-white/10 bg-surface hover:border-copper/70 hover:shadow-[0_0_28px_rgba(244,119,36,0.14)]">
            <VehicleCardGallery photos={photos} href={`/catalogo/${v.slug}`} title={`${v.brand ?? ""} ${v.model ?? ""}`}><div className="absolute right-3 top-3 z-20"><FavoriteButton vehicleId={v.id}/></div></VehicleCardGallery>
            <Link href={`/catalogo/${v.slug}`} className="flex flex-1 flex-col p-5">
              <p className="font-display text-[10px] uppercase tracking-[0.18em] text-white/60">{v.brand || "BMW"} <span className="text-copper">·</span> {v.registration_year}</p>
              <h3 className="mt-2 min-h-[2.5rem] font-display text-2xl font-semibold uppercase tracking-wide text-white">{v.model}</h3>
              <p className="mt-1 min-h-4 truncate font-display text-[10px] uppercase tracking-[0.15em] text-copper">{v.trim || " "}</p>
              <p className="mt-2 min-h-10 line-clamp-2 text-xs leading-5 text-white/60">{v.description || "Viatura selecionada e inspecionada pela Chikane Garage."}</p>
              <div className="mt-4 grid grid-cols-3 gap-2 border-y border-white/10 py-3">
                <div><span className="block font-display text-[10px] uppercase tracking-[0.13em] text-white/60">Quilómetros</span><span className="mt-1 block text-xs tabular-nums text-white">{v.mileage_km?.toLocaleString("pt-PT") ?? "—"} km</span></div>
                <div><span className="block font-display text-[10px] uppercase tracking-[0.13em] text-white/60">Potência</span><span className="mt-1 block text-xs tabular-nums text-white">{v.power_hp ?? "—"} cv</span></div>
                <div><span className="block font-display text-[10px] uppercase tracking-[0.13em] text-white/60">Caixa</span><span className="mt-1 block text-xs text-white">{v.transmission === "automatic" ? "Automática" : v.transmission ? "Manual" : "—"}</span></div>
              </div>
              <div className="mt-auto flex items-center justify-between pt-4"><span className="font-display text-xl font-semibold tabular-nums text-white">{v.price != null ? `${v.price.toLocaleString("pt-PT")} €` : "Sob consulta"}</span><span className="font-display text-[10px] font-semibold uppercase tracking-[0.15em] text-copper transition-colors group-hover:text-white">Ver viatura ↗</span></div>
            </Link>
          </article></Reveal>;
        })}</div>}
      </section>

      {/* ─── A GARAGEM ─── */}
      <section className="bg-surface-oxide">
        <div className="mx-auto max-w-[1440px] px-5 py-20 sm:px-8 lg:px-12">
          <div className="grid items-center gap-16 lg:grid-cols-2">
            <Reveal className="min-w-0">
              <p className="font-display text-xs uppercase tracking-[0.3em] text-copper">A História</p>
              <h2 className="mt-3 font-display text-3xl font-bold uppercase tracking-wide text-foreground text-balance sm:text-4xl">
                Compramos como se fosse<br />para nós. Porque já foi.
              </h2>
              <div className="mt-4 h-0.5 w-12 bg-copper" />
              <p className="mt-6 max-w-lg text-sm leading-relaxed text-silver">{t("garage.text")}</p>
              <Link href="/sobre" className="mt-8 inline-block border border-copper px-8 py-3 font-display text-xs font-semibold uppercase tracking-widest text-copper transition-colors hover:bg-copper hover:text-white">
                Ler a História Completa →
              </Link>
            </Reveal>
            <Reveal className="min-w-0" delay={140}>
              <div className="relative h-80 w-full overflow-hidden rounded">
                <Image src={photos?.photo_home_history || "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=800&q=80"} alt="BMW Performance" fill sizes="(max-width: 1024px) 100vw, 40vw" className="object-cover" />
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ─── FAIXA RACING (divisor com motivos de velocidade) ─── */}
      <div aria-hidden="true" className="speed-lines h-12 w-full border-y border-copper/15 bg-surface-mid" />

      {/* ─── PROCESSO ─── */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <p className="font-display text-xs uppercase tracking-[0.3em] text-copper">O Nosso Processo</p>
        <h2 className="mt-3 font-display text-3xl font-bold uppercase tracking-wide text-foreground text-balance sm:text-4xl">Da Escolha à Sua Garagem</h2>
        <div className="relative mt-14">
          <div className="absolute left-0 top-6 hidden h-px w-full bg-border lg:block" />
          <div className="grid gap-8 lg:grid-cols-4">
            {PROCESS_STEPS.map((s, i) => (
              <Reveal key={s.num} delay={Math.min(i * 90, 360)}>
                <div className="relative">
                  <div className="relative z-10 mb-6 flex h-12 w-12 items-center justify-center rounded-full border-2 border-copper bg-background-alt font-display text-sm font-bold text-copper lg:h-10 lg:w-10 lg:text-xs">
                    {s.num}
                  </div>
                  <h3 className="font-display text-lg font-bold uppercase tracking-wide text-foreground">{s.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{s.text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ─── NEWSLETTER ─── */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <Reveal>
        <div className="speed-lines relative overflow-hidden rounded border border-border bg-surface-mid p-12 sm:p-16">
          <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-copper/10" />
          <div className="relative z-10 mx-auto max-w-2xl text-center">
            <p className="font-display text-xs uppercase tracking-[0.3em] text-copper">Newsletter</p>
            <h2 className="mt-4 font-display text-2xl font-bold uppercase tracking-wide text-foreground text-balance sm:text-3xl">{t("newsletter.title")}</h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-muted">Recebe primeiro cada unidade que entra na garagem, com fotografias e preço, 48 horas antes de ser publicada.</p>
            <NewsletterForm />
            <p className="mt-4 text-xs text-muted">Sem spam. Apenas novidades que interessam.</p>
          </div>
        </div>
        </Reveal>
      </section>
    </div>
  );
}
