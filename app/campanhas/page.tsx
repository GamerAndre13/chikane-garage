import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Campanhas", description: "Campanhas ativas da Chikane Garage: ofertas, novidades e condições especiais em viaturas e artigos." };

type Campaign = {
  id: string; title: string; description: string; image_url: string; button_label: string; button_href: string;
  starts_at: string | null; ends_at: string | null;
};

// Página pública das campanhas promocionais (/campanhas): mostra só as
// campanhas ativas e dentro do período — o resto fica no backoffice.
export default async function CampanhasPage() {
  let campaigns: Campaign[] = [];
  try {
    const supabase = await createClient();
    const today = new Date().toISOString().slice(0, 10);
    const { data } = await supabase.from("campaigns").select("id,title,description,image_url,button_label,button_href,starts_at,ends_at").eq("is_active", true).order("position").order("created_at", { ascending: false });
    campaigns = ((data ?? []) as Campaign[]).filter((campaign) => (!campaign.starts_at || campaign.starts_at <= today) && (!campaign.ends_at || campaign.ends_at >= today));
  } catch { campaigns = []; }

  return <div className="mx-auto max-w-[1440px] px-5 pb-20 pt-12 sm:px-8 sm:pt-16 lg:px-12">
    <header className="max-w-3xl">
      <p className="font-display text-[10px] uppercase tracking-[0.28em] text-copper">Chikane Garage</p>
      <h1 className="mt-3 font-display text-5xl font-bold uppercase leading-none tracking-tight text-white sm:text-7xl">Campanhas</h1>
      <p className="mt-5 max-w-2xl text-sm leading-relaxed text-white/70 sm:text-base">Ofertas e condições especiais em vigor. Se alguma campanha te interesar, fala connosco antes de acabar o prazo.</p>
    </header>
    {!campaigns.length ? (
      /* Estado vazio: explica o que fazer em vez de mostrar um ecrã em branco. */
      <div className="mt-14 max-w-2xl border border-border bg-surface-deep p-8 sm:p-10">
        <h2 className="font-display text-2xl font-bold uppercase text-white">De momento não há campanhas ativas</h2>
        <p className="mt-3 text-sm leading-relaxed text-white/70">As novas campanhas são publicadas aqui assim que saem. Enquanto isso, vê o inventário e a loja — há sempre alguma coisa de boa à espera.</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/novos" className="border border-border px-5 py-3 font-display text-xs uppercase tracking-widest text-silver transition-colors hover:border-copper hover:text-copper">Ver novos</Link>
          <Link href="/usados" className="border border-border px-5 py-3 font-display text-xs uppercase tracking-widest text-silver transition-colors hover:border-copper hover:text-copper">Ver usados</Link>
          <Link href="/loja" className="border border-border px-5 py-3 font-display text-xs uppercase tracking-widest text-silver transition-colors hover:border-copper hover:text-copper">Ver loja</Link>
          <Link href="/contacto" className="bg-copper px-5 py-3 font-display text-xs uppercase tracking-widest text-black transition-colors hover:bg-copper-light">Fala connosco</Link>
        </div>
      </div>
    ) : (
      <ul className="mt-12 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">{campaigns.map((campaign) => <li key={campaign.id} className="card-lift overflow-hidden border border-white/10 bg-surface hover:border-copper/70">
        {campaign.image_url ? <div className="relative aspect-[4/3] overflow-hidden">{/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={campaign.image_url} alt={campaign.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"/></div> : null}
        <div className="p-5 sm:p-6">
          <h2 className="font-display text-xl font-semibold uppercase tracking-wide text-white">{campaign.title}</h2>
          {campaign.starts_at || campaign.ends_at ? <p className="mt-2 font-display text-[10px] uppercase tracking-[0.18em] text-copper">{campaign.starts_at ? `De ${formatDate(campaign.starts_at)}` : "Sem data de início"}{campaign.ends_at ? ` a ${formatDate(campaign.ends_at)}` : " · sem prazo de fim"}</p> : null}
          {campaign.description ? <p className="mt-3 text-sm leading-relaxed text-white/70">{campaign.description}</p> : null}
          {campaign.button_label && campaign.button_href ? campaign.button_href.startsWith("http") ? <a href={campaign.button_href} target="_blank" rel="noopener noreferrer" className="mt-5 inline-block bg-copper px-5 py-3 font-display text-xs uppercase tracking-widest text-black transition-colors hover:bg-copper-light">{campaign.button_label}</a> : <Link href={campaign.button_href} className="mt-5 inline-block bg-copper px-5 py-3 font-display text-xs uppercase tracking-widest text-black transition-colors hover:bg-copper-light">{campaign.button_label}</Link> : null}
        </div>
      </li>)}</ul>
    )}
  </div>;
}

function formatDate(iso: string) {
  const date = new Date(`${iso.slice(0, 10)}T12:00:00`);
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleDateString("pt-PT", { day: "2-digit", month: "long", year: "numeric" });
}
