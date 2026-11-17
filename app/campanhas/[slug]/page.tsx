import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Reveal } from "@/components/ui/reveal";
import { VehicleDetailGallery } from "@/components/ui/vehicle-detail-gallery";
import { vehicleHref } from "@/lib/vehicle-links";

// Página própria de cada campanha: /campanhas/<slug>.
// Estrutura: voltar atrás no topo, fotografias em carrossel à esquerda e a
// informação da campanha à direita. No fim, três campanhas relacionadas
// (mesma marca, ou as mais recentes) para o cliente continuar a explorar.

type VehicleRelation = {
  slug?: string | null;
  brand?: string | null;
  model?: string | null;
  trim?: string | null;
  registration_year?: number | null;
  price?: number | null;
  cover_image_url?: string | null;
  status?: string | null;
  sale_type?: string | null;
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

const CAMPAIGN_FIELDS =
  "id, slug, title, subtitle, description, badge, image_url, price_from, vehicle_id, cta_label, cta_url, starts_at, ends_at, vehicles(slug, brand, model, trim, registration_year, price, cover_image_url, status, sale_type)";

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

function uniqueUrls(urls: (string | null | undefined)[]): string[] {
  return urls.filter((url, index, all): url is string => Boolean(url) && all.indexOf(url) === index);
}

async function loadCampaign(slug: string) {
  try {
    const supabase = await createClient();
    const { data } = await supabase.from("campaigns").select(CAMPAIGN_FIELDS).eq("slug", slug).maybeSingle();
    const campaign = data as Campaign | null;
    if (!campaign) return { campaign: null, images: [] as string[], more: [] as Campaign[] };

    // Fotos adicionais da campanha; sem a migração 029 fica só a capa.
    const [{ data: imageRows }, { data: otherRows }] = await Promise.all([
      supabase.from("campaign_images").select("url, position").eq("campaign_id", campaign.id).order("position", { ascending: true }),
      supabase
        .from("campaigns")
        .select(CAMPAIGN_FIELDS)
        .eq("is_active", true)
        .neq("id", campaign.id)
        .order("position", { ascending: true })
        .order("created_at", { ascending: false })
        .limit(12),
    ]);

    const images = ((imageRows || []) as { url?: string | null }[])
      .map((image) => image.url)
      .filter((url): url is string => Boolean(url));

    // Três sugestões: primeiro as que partilham a viatura/marca, depois as
    // mais recentes que sobram.
    const brand = relatedVehicle(campaign)?.brand ?? null;
    const candidates = ((otherRows || []) as unknown as Campaign[]).filter((item) => item.slug !== campaign.slug);
    const related = brand
      ? candidates.filter((item) => relatedVehicle(item)?.brand === brand)
      : [];
    const more = [...related, ...candidates.filter((item) => !related.includes(item))].slice(0, 3);

    return { campaign, images, more };
  } catch {
    return { campaign: null, images: [] as string[], more: [] as Campaign[] };
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
  const { campaign, images, more } = await loadCampaign(slug);
  if (!campaign) notFound();

  const photos = uniqueUrls([campaign.image_url, ...images]).map((url) => ({ url, alt: campaign.title }));
  const vehicle = relatedVehicle(campaign);
  const dateWindow = campaignWindow(campaign.starts_at, campaign.ends_at);
  const ctaHref = campaign.cta_url?.trim() || (vehicle?.slug ? vehicleHref({ slug: vehicle.slug, sale_type: vehicle.sale_type }) : "/contacto");
  const vehicleName = vehicle ? [vehicle.brand, vehicle.model].filter(Boolean).join(" ") : null;

  return (
    <div className="bg-background">
      {/* Voltar — fica sempre no topo, antes das fotografias. */}
      <div className="border-b border-border">
        <div className="mx-auto flex max-w-[1440px] items-center px-5 py-3 sm:px-8 lg:px-12">
          <Link
            href="/campanhas"
            className="inline-flex items-center gap-2 font-display text-[10px] uppercase tracking-[0.24em] text-silver transition-colors hover:text-copper"
          >
            <span aria-hidden="true">←</span> Campanhas
          </Link>
        </div>
      </div>

      {/* O banner continua no topo, em toda a largura disponível. */}
      <section className="border-b border-border">
        <div className="mx-auto max-w-[1440px] px-5 py-8 sm:px-8 lg:px-12 lg:py-10">
          <div className="mx-auto max-w-5xl">
            {photos.length > 0 ? (
              <VehicleDetailGallery photos={photos} title={campaign.title} />
            ) : (
              <div className="relative flex aspect-[3/2] w-full items-center justify-center overflow-hidden border border-border bg-surface-mid">
                <div className="grid-lines absolute inset-0 opacity-30" aria-hidden="true" />
                <p className="relative px-6 text-center font-display text-2xl font-bold uppercase tracking-wide text-muted">{campaign.title}</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Os textos podem ocupar 2/3 ou quase todo o ecrã: bloco próprio com
          altura mínima e leitura com scroll no PC, sem empurrar o resto. */}
      <section className="mx-auto max-w-[1440px] px-5 py-10 sm:px-8 lg:px-12">
        <div className="grid min-h-[66dvh] border border-border bg-surface lg:max-h-[calc(100dvh-7rem)] lg:min-h-[calc(100dvh-7rem)] lg:grid-cols-[minmax(0,1fr)_minmax(280px,320px)]">
          <div className="min-h-0 min-w-0 p-6 sm:p-10 lg:overflow-y-auto lg:overscroll-contain lg:p-14">
            {/* Informação da campanha */}

            {campaign.badge && (
              <span className="inline-block bg-copper px-3 py-1 font-display text-[0.62rem] uppercase tracking-[0.26em] text-black">
                {campaign.badge}
              </span>
            )}
            <h1 className="mt-4 font-display text-4xl font-bold uppercase leading-[0.95] tracking-tight text-white text-balance sm:text-5xl">
              {campaign.title}
            </h1>
            {campaign.subtitle && (
              <p className="mt-3 font-display text-xs uppercase tracking-[0.22em] text-copper sm:text-sm">{campaign.subtitle}</p>
            )}

            {campaign.description ? (
              <div className="mt-6 whitespace-pre-line border-t border-border pt-6 text-[15px] leading-8 text-silver">
                {campaign.description}
              </div>
            ) : (
              <p className="mt-6 border-t border-border pt-6 text-[15px] leading-8 text-silver">
                Condições especiais em viaturas selecionadas. Fala connosco para confirmar disponibilidade, prazos e tudo o que está incluído.
              </p>
            )}
          </div>

          <aside className="flex min-h-0 min-w-0 flex-col border-t border-border bg-surface-raised p-6 sm:p-8 lg:border-l lg:border-t-0 lg:overflow-y-auto lg:overscroll-contain lg:p-10">
            <div className="flex flex-wrap items-center gap-x-8 gap-y-2 text-sm text-white/70">
              {dateWindow && <span>{dateWindow}</span>}
              {campaign.price_from != null && (
                <span className="font-display text-lg text-copper">Desde {campaign.price_from.toLocaleString("pt-PT")} €</span>
              )}
            </div>

            <dl className="mt-7 space-y-3 border-t border-border pt-5 text-sm">
              {dateWindow && (
                <div>
                  <dt className="font-display text-[10px] uppercase tracking-[0.2em] text-muted">Período</dt>
                  <dd className="mt-1 text-silver">{dateWindow}</dd>
                </div>
              )}
              {campaign.price_from != null && (
                <div>
                  <dt className="font-display text-[10px] uppercase tracking-[0.2em] text-muted">Desde</dt>
                  <dd className="mt-1 font-display text-2xl text-copper">{campaign.price_from.toLocaleString("pt-PT")} €</dd>
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
            <p className="mt-auto pt-6 text-[11px] leading-relaxed text-muted">
              Condições sujeitas a disponibilidade e confirmação. Fala connosco para os detalhes finais.
            </p>
          </aside>
        </div>
      </section>

      {/* Viatura associada */}
      {vehicle?.slug && (
        <section className="border-t border-border">
          <div className="mx-auto max-w-[1440px] px-5 py-14 sm:px-8 lg:px-12">
            <Link
              href={vehicleHref({ slug: vehicle.slug, sale_type: vehicle.sale_type })}
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

      {/* Mais campanhas */}
      {more.length > 0 && (
        <section className="border-t border-border">
          <div className="mx-auto max-w-[1440px] px-5 py-14 sm:px-8 lg:px-12">
            <Reveal className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="kicker">Continua a explorar</p>
                <h2 className="mt-3 font-display text-3xl font-bold uppercase tracking-tight text-foreground">Mais campanhas</h2>
              </div>
              <Link href="/campanhas" className="font-display text-[10px] uppercase tracking-[0.22em] text-copper transition-colors hover:text-white">
                Ver todas →
              </Link>
            </Reveal>

            <div className="mt-8 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {more.map((item, index) => (
                <Reveal key={item.id} delay={Math.min(index * 70, 210)} className="h-full">
                  <Link
                    href={`/campanhas/${item.slug}`}
                    className="group flex h-full flex-col border border-border bg-surface transition-colors duration-500 hover:border-copper/70"
                  >
                    <div className="relative aspect-[16/10] overflow-hidden bg-surface-mid">
                      {item.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element -- imagem vem do R2 (domínio configurável)
                        <img
                          src={item.image_url}
                          alt={item.title}
                          loading="lazy"
                          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center px-6 text-center">
                          <p className="font-display text-lg font-bold uppercase tracking-wide text-muted">{item.title}</p>
                        </div>
                      )}
                      {item.badge && (
                        <span className="absolute left-0 top-5 bg-copper px-3 py-1 font-display text-[0.6rem] tracking-[0.26em] text-black">
                          {item.badge}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-1 flex-col p-5">
                      <h3 className="font-display text-xl uppercase leading-tight text-foreground">{item.title}</h3>
                      {item.subtitle && (
                        <p className="mt-2 font-display text-[10px] uppercase tracking-[0.16em] text-muted">{item.subtitle}</p>
                      )}
                      <div className="mt-auto flex items-end justify-between gap-3 pt-5">
                        <p className="font-display text-base text-copper">
                          {item.price_from != null ? `Desde ${item.price_from.toLocaleString("pt-PT")} €` : ""}
                        </p>
                        <span className="font-display text-[0.6rem] uppercase tracking-[0.22em] text-silver transition-colors group-hover:text-copper">
                          Ver →
                        </span>
                      </div>
                    </div>
                  </Link>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
