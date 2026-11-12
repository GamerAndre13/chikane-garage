import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Reveal } from "@/components/ui/reveal";

// Página própria de cada campanha: /campanhas/<slug>.
// Hero com a primeira foto, texto longo (com quebras de linha), galeria com
// as restantes fotografias e um cartão com preço, prazo e chamada à ação.

type VehicleRelation = {
  slug?: string | null;
  brand?: string | null;
  model?: string | null;
  trim?: string | null;
  registration_year?: number | null;
  price?: number | null;
  cover_image_url?: string | null;
  status?: string | null;
};

type Campaign = {
  id: string;
  slug: string;
  title: string;
  subtitle?: string | null;
  description?: string | null;
  badge?: string | null;
  image_url?: string | null;
  price_from?: number | null;
  vehicle_id?: string | null;
  cta_label?: string | null;
  cta_url?: string | null;
  starts_at?: string | null;
  ends_at?: string | null;
  vehicles?: VehicleRelation | VehicleRelation[] | null;
};

const dateFormat = new Intl.DateTimeFormat("pt-PT", {
  timeZone: "Europe/Lisbon",
  day: "2-digit",
  month: "long",
  year: "numeric",
});

// Janela da campanha em texto: "De 1 de dezembro a 31 de dezembro de 2026".
function campaignWindow(startsAt?: string | null, endsAt?: string | null): string | null {
  const start = startsAt ? dateFormat.format(new Date(startsAt)) : null;
  const end = endsAt ? dateFormat.format(new Date(endsAt)) : null;
  if (start && end) return `De ${start} a ${end}`;
  if (start) return `A partir de ${start}`;
  if (end) return `Até ${end}`;
  return null;
}

function relatedVehicle(campaign: Campaign): VehicleRelation | null {
  const related = campaign.vehicles;
  return Array.isArray(related) ? related[0] ?? null : related ?? null;
}

async function loadCampaign(slug: string) {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("campaigns")
      .select(
        "id, slug, title, subtitle, description, badge, image_url, price_from, vehicle_id, cta_label, cta_url, starts_at, ends_at, vehicles(slug, brand, model, trim, registration_year, price, cover_image_url, status)"
      )
      .eq("slug", slug)
      .maybeSingle();
    const campaign = data as Campaign | null;
    if (!campaign) return { campaign: null, images: [] as string[] };

    // Fotos adicionais da campanha; sem a migração 029 fica só a capa.
    const { data: imageRows } = await supabase
      .from("campaign_images")
      .select("url, position")
      .eq("campaign_id", campaign.id)
      .order("position", { ascending: true });
    const images = ((imageRows || []) as { url?: string | null }[])
      .map((image) => image.url)
      .filter((url): url is string => Boolean(url));

    return { campaign, images };
  } catch {
    return { campaign: null, images: [] as string[] };
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const { campaign } = await loadCampaign(slug);
  if (!campaign) return { title: "Campanha" };
  return {
    title: campaign.title,
    description: campaign.description?.slice(0, 160) || campaign.subtitle || undefined,
  };
}

export default async function CampaignPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { campaign, images } = await loadCampaign(slug);
  if (!campaign) notFound();

  // A capa é a imagem própria da campanha; as restantes vão para a galeria.
  const cover = campaign.image_url || null;
  const hero = cover || images[0] || null;
  const gallery = images.filter((url) => url !== cover);
  const vehicle = relatedVehicle(campaign);
  const dateWindow = campaignWindow(campaign.starts_at, campaign.ends_at);
  const ctaHref = campaign.cta_url?.trim() || (vehicle?.slug ? `/catalogo/${vehicle.slug}` : "/contacto");
  const vehicleName = vehicle ? [vehicle.brand, vehicle.model].filter(Boolean).join(" ") : null;

  return (
    <div className="bg-background">
      {/* Hero */}
      <section className="relative flex min-h-[56vh] items-end overflow-hidden border-b border-border sm:min-h-[64vh]">
        {hero ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element -- imagem vem do R2 (domínio configurável) */}
            <img src={hero} alt={campaign.title} className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-black/25" />
          </>
        ) : (
          <>
            <div className="absolute inset-0 grid-lines opacity-40" aria-hidden="true" />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/85 to-background" />
          </>
        )}
        <div className="relative z-10 mx-auto w-full max-w-[1440px] px-5 pb-14 pt-28 sm:px-8 sm:pb-16 lg:px-12">
          <Link
            href="/campanhas"
            className="inline-flex items-center gap-2 font-display text-[10px] uppercase tracking-[0.24em] text-silver transition-colors hover:text-copper"
          >
            <span aria-hidden="true">←</span> Campanhas
          </Link>
          {campaign.badge && (
            <span className="mt-6 inline-block bg-copper px-3 py-1 font-display text-[0.62rem] tracking-[0.26em] text-black">
              {campaign.badge}
            </span>
          )}
          <h1 className="mt-4 max-w-4xl font-display text-4xl font-bold uppercase leading-[0.92] tracking-tight text-white text-balance sm:text-6xl lg:text-7xl">
            {campaign.title}
          </h1>
          {campaign.subtitle && (
            <p className="mt-4 font-display text-xs uppercase tracking-[0.22em] text-copper sm:text-sm">
              {campaign.subtitle}
            </p>
          )}
          <div className="mt-6 flex flex-wrap items-center gap-x-8 gap-y-2 text-sm text-white/70">
            {dateWindow && <span>{dateWindow}</span>}
            {campaign.price_from != null && (
              <span className="font-display text-lg text-copper">
                Desde {campaign.price_from.toLocaleString("pt-PT")} €
              </span>
            )}
          </div>
        </div>
      </section>

      {/* Texto + cartão de ação */}
      <section className="mx-auto max-w-[1440px] px-5 py-16 sm:px-8 sm:py-20 lg:px-12">
        <div className="grid gap-10 lg:grid-cols-[1.6fr_0.9fr] lg:gap-16">
          <Reveal className="min-w-0">
            <p className="kicker">A campanha</p>
            {campaign.description ? (
              <div className="mt-6 max-w-3xl whitespace-pre-line text-[15px] leading-8 text-silver sm:text-base">
                {campaign.description}
              </div>
            ) : (
              <p className="mt-6 max-w-3xl text-[15px] leading-8 text-silver sm:text-base">
                Condições especiais em viaturas selecionadas. Fala connosco para confirmar disponibilidade,
                prazos e tudo o que está incluído.
              </p>
            )}
          </Reveal>

          <Reveal delay={120}>
            <div className="border border-border bg-surface p-6 sm:p-7 lg:sticky lg:top-24">
              <p className="font-display text-[10px] uppercase tracking-[0.28em] text-copper">
                {campaign.badge || "Campanha"}
              </p>
              <h2 className="mt-3 font-display text-2xl uppercase leading-tight text-foreground">
                {campaign.title}
              </h2>
              <dl className="mt-6 space-y-3 border-t border-border pt-5 text-sm">
                {dateWindow && (
                  <div>
                    <dt className="font-display text-[10px] uppercase tracking-[0.2em] text-muted">Período</dt>
                    <dd className="mt-1 text-silver">{dateWindow}</dd>
                  </div>
                )}
                {campaign.price_from != null && (
                  <div>
                    <dt className="font-display text-[10px] uppercase tracking-[0.2em] text-muted">Desde</dt>
                    <dd className="mt-1 font-display text-2xl text-copper">
                      {campaign.price_from.toLocaleString("pt-PT")} €
                    </dd>
                  </div>
                )}
                {vehicleName && (
                  <div>
                    <dt className="font-display text-[10px] uppercase tracking-[0.2em] text-muted">Viatura</dt>
                    <dd className="mt-1 text-silver">
                      {vehicleName}
                      {vehicle?.trim ? ` ${vehicle.trim}` : ""}
                      {vehicle?.registration_year ? ` · ${vehicle.registration_year}` : ""}
                    </dd>
                  </div>
                )}
              </dl>
              <Link
                href={ctaHref}
                className="mt-7 inline-flex min-h-12 w-full items-center justify-center bg-copper px-6 py-3.5 text-center font-display text-xs font-semibold uppercase tracking-[0.2em] text-black transition-colors hover:bg-copper-light"
              >
                {campaign.cta_label || "Ver campanha"}
              </Link>
              <p className="mt-4 text-[11px] leading-relaxed text-muted">
                Condições sujeitas a disponibilidade e confirmação. Fala connosco para os detalhes finais.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Galeria */}
      {gallery.length > 0 && (
        <section className="mx-auto max-w-[1440px] px-5 pb-16 sm:px-8 sm:pb-20 lg:px-12">
          <Reveal>
            <h2 className="font-display text-xs uppercase tracking-[0.28em] text-copper">Galeria</h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {gallery.map((url, index) => (
                <div key={`${url}-${index}`} className="group overflow-hidden border border-border bg-surface-mid">
                  {/* eslint-disable-next-line @next/next/no-img-element -- imagem vem do R2 (domínio configurável) */}
                  <img
                    src={url}
                    alt={`${campaign.title} — fotografia ${index + 1}`}
                    loading="lazy"
                    className="aspect-[4/3] h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                  />
                </div>
              ))}
            </div>
          </Reveal>
        </section>
      )}

      {/* Viatura associada */}
      {vehicle?.slug && (
        <section className="border-t border-border">
          <div className="mx-auto max-w-[1440px] px-5 py-14 sm:px-8 lg:px-12">
            <Link
              href={`/catalogo/${vehicle.slug}`}
              className="group flex flex-wrap items-center gap-6 border border-border bg-surface p-4 transition-colors hover:border-copper/70 sm:p-5"
            >
              {vehicle.cover_image_url ? (
                // eslint-disable-next-line @next/next/no-img-element -- imagem vem do R2 (domínio configurável)
                <img
                  src={vehicle.cover_image_url}
                  alt={vehicleName || "Viatura"}
                  className="h-28 w-full rounded-sm object-cover sm:w-44"
                />
              ) : (
                <div className="flex h-28 w-full items-center justify-center bg-surface-mid sm:w-44">
                  <span className="font-display text-xs uppercase tracking-[0.2em] text-muted">{vehicleName}</span>
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="font-display text-[10px] uppercase tracking-[0.24em] text-copper">Viatura da campanha</p>
                <h2 className="mt-2 font-display text-2xl uppercase leading-none text-foreground">
                  {vehicleName}
                  {vehicle.trim ? <span className="text-muted"> {vehicle.trim}</span> : null}
                </h2>
                <p className="mt-2 text-xs text-muted">
                  {[vehicle.registration_year, vehicle.status === "reserved" ? "Reservada" : vehicle.status === "sold" ? "Vendida" : "Disponível"]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
              <span className="font-display text-sm uppercase tracking-[0.18em] text-copper transition-transform group-hover:translate-x-1">
                Ver ficha →
              </span>
            </Link>
          </div>
        </section>
      )}

      <div className="mx-auto max-w-[1440px] px-5 pb-20 sm:px-8 lg:px-12">
        <Link
          href="/campanhas"
          className="inline-flex items-center gap-2 border border-white/15 px-5 py-2.5 font-display text-[0.62rem] uppercase tracking-[0.24em] text-silver transition-colors hover:border-copper hover:text-copper"
        >
          <span aria-hidden="true">←</span> Todas as campanhas
        </Link>
      </div>
    </div>
  );
}
