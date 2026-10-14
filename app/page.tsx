import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { FavoriteButton } from "@/components/ui/favorite-button";
import NewsletterForm from "@/components/newsletter-form";
import { expireReservations } from "@/lib/expire-reservations";
import { archiveSoldVehicles } from "@/lib/archive-sold-vehicles";
import { Reveal } from "@/components/ui/reveal";
import { isVehiclePubliclyVisible } from "@/lib/vehicle-visibility";
import { instagramUrl, facebookUrl, youtubeUrl, tiktokUrl } from "@/lib/social-links";
import type { SiteSettings } from "@/lib/site-settings";

export const metadata = {
  title: "Chikane Garage — Catálogo de Viaturas",
  description: "Consulta as viaturas disponíveis na Chikane Garage e pede informação sobre cada unidade.",
};

const FALLBACK = {
  "hero.tagline": "Seleção rigorosa · Garantia garantida",
  "hero.slogan": "Precision.\nPerfected.\nPassion.",
  "hero.intro": "Uma garagem privada de performance. Cada unidade escolhida à mão, inspecionada ao detalhe e entregue com garantia Chikane para quem vive a estrada com paixão.",
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
  sold_at?: string | null;
  updated_at?: string | null;
  created_at?: string | null;
};

type SiteContent = { section_key: string; body: string | null };

const TRANSMISSION_LABEL: Record<string, string> = { automatic: "Automática", manual: "Manual" };
const FUEL_LABEL: Record<string, string> = {
  diesel: "Diesel",
  gasoline: "Gasolina",
  hybrid: "Híbrido",
  electric: "Elétrico",
};
const transmissionLabel = (value?: string | null) =>
  value ? TRANSMISSION_LABEL[value.toLowerCase()] ?? value : "—";
const fuelLabel = (value?: string | null) => (value ? FUEL_LABEL[value.toLowerCase()] ?? value : "—");
const priceLabel = (value?: number | null) =>
  value != null ? `${value.toLocaleString("pt-PT")} €` : "Sob consulta";
const mileageLabel = (value?: number | null) =>
  value != null ? `${value.toLocaleString("pt-PT")} km` : "—";

export default async function HomePage() {
  const supabase = await createClient();

  // Reservas vencidas (máx. 7 dias) voltam a "available" e as vendas com mais
  // de 7 dias são arquivadas antes da leitura.
  await expireReservations();
  await archiveSoldVehicles();
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
    supabase.from("site_settings").select("photo_home_hero, photo_home_history, phone, email, address, location, location_url, social_instagram, social_facebook, social_youtube, social_tiktok").limit(1).maybeSingle(),
  ]);

  const vehicles = (vehiclesRes.data || []) as Vehicle[];
  // A viatura marcada como destaque da semana (fallback: a mais recente).
  // Respeita a regra dos 7 dias: uma viatura vendida deixa de ser destaque
  // quando já não está publicamente visível.
  const spotlightRow = (spotlightRes.data?.[0] as Vehicle | undefined) ?? null;
  const spotlight = spotlightRow && isVehiclePubliclyVisible(spotlightRow) ? spotlightRow : vehicles[0] || null;
  // A viatura do spotlight não pode repetir-se no "Em destaque": busca uma
  // a mais (limit 4) e remove-a da grelha (fica 3 cartões).
  const gridVehicles = vehicles.filter((v) => v.id !== spotlight?.id).slice(0, 3);
  const photos = settingsRes.data as Pick<SiteSettings, "photo_home_hero" | "photo_home_history"> | null;
  const contact = settingsRes.data as Pick<
    SiteSettings,
    "phone" | "email" | "address" | "location" | "location_url" | "social_instagram" | "social_facebook" | "social_youtube" | "social_tiktok"
  > | null;

  // ─── Dados estruturados (SEO) ───────────────────────────────
  // Ajuda o Google a associar "chikane garage" a um concessionário real
  // (nome, contactos, redes sociais e catálogo).
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "AutoDealer",
    name: "Chikane Garage",
    url: process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || undefined,
    image: process.env.NEXT_PUBLIC_SITE_URL
      ? `${process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "")}/opengraph-image`
      : undefined,
    description: "Garagem privada de viaturas de performance — catálogo selecionado, garantia e acompanhamento personalizado.",
    telephone: contact?.phone || undefined,
    email: contact?.email || undefined,
    address: contact?.address
      ? { "@type": "PostalAddress", streetAddress: contact.address, addressCountry: "PT" }
      : undefined,
    sameAs: [
      contact?.social_instagram ? instagramUrl(contact.social_instagram) : null,
      contact?.social_facebook ? facebookUrl(contact.social_facebook) : null,
      contact?.social_youtube ? youtubeUrl(contact.social_youtube) : null,
      contact?.social_tiktok ? tiktokUrl(contact.social_tiktok) : null,
    ].filter(Boolean),
  };

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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
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

      {/* ─── EM DESTAQUE / SPOTLIGHT ─── */}
      {spotlight && (
        <section className="relative overflow-hidden border-t border-border px-6 py-28">
          <div className="grid-lines pointer-events-none absolute inset-0 opacity-30" aria-hidden="true" />
          <div className="relative mx-auto max-w-[1400px]">
            <Reveal className="flex items-end justify-between gap-6">
              <div>
                <p className="kicker">Currently in the garage</p>
                <h2 className="mt-4 font-display text-[clamp(2rem,5vw,3.8rem)] font-bold uppercase leading-[0.9] tracking-tight text-foreground">
                  Em destaque<br />esta semana
                </h2>
              </div>
              <Link href="/catalogo" className="nav-link hidden transition-colors hover:text-copper sm:block">
                Ver tudo
              </Link>
            </Reveal>

            {/* Destaque da semana (spotlight) */}
            <Reveal className="mt-16 grid gap-0 lg:grid-cols-[1.5fr_1fr]">
              <Link href={`/catalogo/${spotlight.slug}`} className="group relative block aspect-[16/10] overflow-hidden">
                {spotlight.cover_image_url ? (
                  <Image
                    src={spotlight.cover_image_url}
                    alt={`${spotlight.brand ?? ""} ${spotlight.model ?? ""}`}
                    fill
                    sizes="(max-width: 1024px) 100vw, 60vw"
                    className="object-cover transition-transform duration-[900ms] group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-surface-mid">
                    <p className="text-center font-display text-2xl font-bold uppercase tracking-wide text-muted">
                      {spotlight.brand} {spotlight.model}
                    </p>
                  </div>
                )}
                <span className="absolute left-0 top-6 bg-copper px-4 py-1.5 font-display text-[0.62rem] tracking-[0.3em] text-black">
                  SPOTLIGHT
                </span>
              </Link>

              <div className="clip-chicane relative z-10 -mt-10 border border-copper/40 bg-surface p-10 lg:-ml-16 lg:mt-16">
                <p className="kicker">
                  {spotlight.brand} · {spotlight.registration_year ?? "—"}
                </p>
                <h3 className="mt-3 font-display text-4xl uppercase leading-none text-foreground">
                  {spotlight.model}
                </h3>
                {spotlight.trim && (
                  <p className="mt-2 font-display text-sm uppercase tracking-[0.16em] text-muted">
                    {spotlight.trim}
                  </p>
                )}
                <p className="mt-6 text-sm leading-relaxed text-muted">
                  {spotlight.description || "Viatura selecionada e inspecionada ao detalhe pela Chikane Garage."}
                </p>
                <dl className="mt-8 grid grid-cols-3 gap-4 border-t border-border pt-6">
                  <div>
                    <dt className="font-display text-[0.6rem] tracking-[0.22em] text-muted">KM</dt>
                    <dd className="mt-1 font-display text-silver">{mileageLabel(spotlight.mileage_km)}</dd>
                  </div>
                  <div>
                    <dt className="font-display text-[0.6rem] tracking-[0.22em] text-muted">POTÊNCIA</dt>
                    <dd className="mt-1 font-display text-silver">{spotlight.power_hp ?? "—"} cv</dd>
                  </div>
                  <div>
                    <dt className="font-display text-[0.6rem] tracking-[0.22em] text-muted">CAIXA</dt>
                    <dd className="mt-1 font-display text-silver">{transmissionLabel(spotlight.transmission)}</dd>
                  </div>
                </dl>
                <p className="mt-8 font-display text-3xl text-copper">{priceLabel(spotlight.price)}</p>
                <Link
                  href={`/catalogo/${spotlight.slug}`}
                  className="mt-8 inline-flex border border-copper px-8 py-3.5 font-display text-[0.68rem] tracking-[0.28em] text-copper transition-all duration-300 hover:bg-copper hover:text-black"
                >
                  VER VIATURA
                </Link>
              </div>
            </Reveal>

            {/* Restantes viaturas em destaque */}
            {gridVehicles.length > 0 && (
              <div className="mt-24 grid gap-10 md:grid-cols-3">
                {gridVehicles.map((v, i) => {
                  const cardPhotos = [
                    ...(v.cover_image_url ? [{ url: v.cover_image_url, alt: `${v.brand ?? ""} ${v.model ?? ""}` }] : []),
                    ...((v.vehicle_images || [])
                      .filter((image) => image.url)
                      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
                      .map((image) => ({ url: image.url!, alt: image.alt_text || "" }))),
                  ].filter((photo, index, all) => all.findIndex((candidate) => candidate.url === photo.url) === index).slice(0, 2);
                  return (
                    <Reveal key={v.id} delay={Math.min(i * 90, 360)}>
                      <Link
                        href={`/catalogo/${v.slug}`}
                        className="group relative block border border-border bg-surface transition-all duration-500 hover:border-copper/70 hover:shadow-[0_0_40px_-16px_var(--glow)]"
                      >
                        <div className="relative aspect-[16/10] overflow-hidden">
                          {cardPhotos[0] ? (
                            <Image
                              src={cardPhotos[0].url}
                              alt={cardPhotos[0].alt}
                              fill
                              sizes="(max-width: 768px) 100vw, 33vw"
                              className="object-cover transition-all duration-700 group-hover:scale-[1.06] group-hover:opacity-0"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center bg-surface-mid">
                              <p className="px-6 text-center font-display text-lg font-bold uppercase tracking-wide text-muted">
                                {v.brand} {v.model}
                              </p>
                            </div>
                          )}
                          {cardPhotos[1] && (
                            <Image
                              src={cardPhotos[1].url}
                              alt=""
                              aria-hidden
                              fill
                              sizes="(max-width: 768px) 100vw, 33vw"
                              className="scale-[1.06] object-cover opacity-0 transition-all duration-700 group-hover:opacity-100"
                            />
                          )}
                          {v.status === "reserved" && (
                            <span className="absolute left-0 top-4 bg-red px-3 py-1 font-display text-[0.62rem] tracking-[0.28em] text-white">
                              RESERVADO
                            </span>
                          )}
                          <div className="absolute right-3 top-3 z-20">
                            <FavoriteButton vehicleId={v.id} />
                          </div>
                        </div>
                        <div className="clip-notch relative bg-surface p-6">
                          <p className="kicker">{v.brand || "BMW"}</p>
                          <h3 className="mt-2 font-display text-2xl uppercase leading-none text-foreground">
                            {v.model}
                            {v.trim && <span className="text-muted"> {v.trim}</span>}
                          </h3>
                          <dl className="mt-5 grid grid-cols-4 gap-3 border-t border-border pt-4 text-[0.7rem] tracking-widest text-muted">
                            <div>
                              <dt className="sr-only">Ano</dt>
                              <dd className="font-display text-silver">{v.registration_year ?? "—"}</dd>
                            </div>
                            <div>
                              <dt className="sr-only">Quilometragem</dt>
                              <dd className="font-display text-silver">{mileageLabel(v.mileage_km)}</dd>
                            </div>
                            <div>
                              <dt className="sr-only">Potência</dt>
                              <dd className="font-display text-silver">{v.power_hp ?? "—"} cv</dd>
                            </div>
                            <div>
                              <dt className="sr-only">Combustível</dt>
                              <dd className="font-display text-silver">{fuelLabel(v.fuel_type)}</dd>
                            </div>
                          </dl>
                          <p className="mt-5 font-display text-xl text-copper transition-colors duration-300 group-hover:text-copper-light">
                            {priceLabel(v.price)}
                          </p>
                        </div>
                      </Link>
                    </Reveal>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      )}

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
