import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Reveal } from "@/components/ui/reveal";

export const metadata = {
  title: "Campanhas",
  description:
    "Campanhas e condições especiais da Chikane Garage. Viaturas selecionadas, propostas por encomenda e ofertas com tempo limitado.",
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
  cta_label?: string | null;
  cta_url?: string | null;
  starts_at?: string | null;
  ends_at?: string | null;
  position?: number | null;
  vehicles?: { slug?: string | null } | { slug?: string | null }[] | null;
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

function campaignHref(campaign: Campaign): string {
  // Cada campanha tem página própria; o destino final (viatura ou link
  // externo) é escolhido lá dentro.
  return `/campanhas/${campaign.slug}`;
}

export default async function CampanhasPage() {
  let campaigns: Campaign[] = [];
  try {
    const supabase = await createClient();
    // Se a migração 027 ainda não tiver sido executada a consulta falha; a
    // página mostra o estado vazio em vez de rebentar.
    const { data } = await supabase
      .from("campaigns")
      .select(
        "id, slug, title, subtitle, description, badge, image_url, price_from, cta_label, cta_url, starts_at, ends_at, position, vehicles(slug)"
      )
      .eq("is_active", true)
      .order("position", { ascending: true })
      .order("created_at", { ascending: false });
    campaigns = (data || []) as Campaign[];
  } catch {
    campaigns = [];
  }

  return (
    <div className="mx-auto max-w-[1440px] px-5 pb-20 pt-12 sm:px-8 sm:pt-16 lg:px-12">
      <header className="max-w-3xl">
        <p className="font-display text-[10px] uppercase tracking-[0.28em] text-copper">
          Ofertas <span className="px-1 text-white/30">·</span> Tempo limitado
        </p>
        <h1 className="mt-3 font-display text-5xl font-bold uppercase leading-none tracking-tight text-white sm:text-7xl">
          Campanhas
        </h1>
        <p className="mt-5 max-w-2xl text-sm leading-relaxed text-white/70 sm:text-base">
          Condições especiais em viaturas selecionadas e configurações por encomenda. Cada campanha indica o que está
          incluído e o prazo para aproveitar.
        </p>
      </header>

      {campaigns.length === 0 ? (
        <div className="mt-12 border border-white/10 bg-surface px-6 py-16 text-center">
          <p className="font-display text-xs uppercase tracking-[0.28em] text-copper">A chegar</p>
          <h2 className="mt-4 font-display text-2xl font-bold uppercase tracking-tight text-white sm:text-3xl">
            Sem campanhas ativas de momento
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-white/70">
            Estamos a preparar as próximas condições especiais. Entretanto, consulta o catálogo ou fala connosco para
            saber o que temos disponível.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/usados"
              className="border border-copper bg-copper px-5 py-2.5 font-display text-xs uppercase tracking-[0.2em] text-background transition-opacity hover:opacity-90"
            >
              Ver catálogo
            </Link>
            <Link
              href="/contacto"
              className="border border-white/15 px-5 py-2.5 font-display text-xs uppercase tracking-[0.2em] text-silver transition-colors hover:border-copper hover:text-copper"
            >
              Falar connosco
            </Link>
          </div>
        </div>
      ) : (
        <div className="mt-12 grid gap-8 md:grid-cols-2 xl:grid-cols-3">
          {campaigns.map((campaign, index) => {
            const dateWindow = campaignWindow(campaign.starts_at, campaign.ends_at);
            return (
              <Reveal key={campaign.id} delay={Math.min(index * 60, 240)} className="h-full">
                <article className="group relative flex h-full flex-col border border-border bg-surface transition-colors duration-500 hover:border-copper/70">
                  <div className="relative aspect-[16/10] overflow-hidden bg-surface-mid">
                    {campaign.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element -- imagem vem do R2 (domínio configurável)
                      <img
                        src={campaign.image_url}
                        alt={campaign.title}
                        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center px-6 text-center">
                        <p className="font-display text-lg font-bold uppercase tracking-wide text-muted">
                          {campaign.title}
                        </p>
                      </div>
                    )}
                    {campaign.badge && (
                      <span className="absolute left-0 top-5 bg-copper px-3 py-1 font-display text-[0.6rem] tracking-[0.26em] text-black">
                        {campaign.badge}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-1 flex-col p-6">
                    {dateWindow && (
                      <p className="font-display text-[0.6rem] uppercase tracking-[0.22em] text-copper">{dateWindow}</p>
                    )}
                    <h2 className="mt-2 font-display text-2xl uppercase leading-none text-foreground">
                      {campaign.title}
                    </h2>
                    {campaign.subtitle && (
                      <p className="mt-2 font-display text-xs uppercase tracking-[0.16em] text-muted">
                        {campaign.subtitle}
                      </p>
                    )}
                    {campaign.description && (
                      <p className="mt-4 line-clamp-3 text-sm leading-relaxed text-silver">{campaign.description}</p>
                    )}

                    <div className="mt-auto pt-6">
                      {campaign.price_from != null && (
                        <p className="font-display text-xl text-copper">
                          Desde {campaign.price_from.toLocaleString("pt-PT")} €
                        </p>
                      )}
                      <Link
                        href={campaignHref(campaign)}
                        className="mt-4 inline-flex border border-copper px-5 py-2.5 font-display text-[0.62rem] uppercase tracking-[0.24em] text-copper transition-colors hover:bg-copper hover:text-black"
                      >
                        {campaign.cta_label || "Ver campanha"}
                      </Link>
                    </div>
                  </div>
                </article>
              </Reveal>
            );
          })}
        </div>
      )}
    </div>
  );
}
