import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { Reveal } from "@/components/ui/reveal";
import type { SiteSettings } from "@/lib/site-settings";

export const metadata: Metadata = {
  title: "Sobre Nós",
  description: "Conhece a Chikane Garage e consulta o catálogo de viaturas disponíveis.",
};

type AboutStats = Pick<
  SiteSettings,
  | "photo_about_hero"
  | "photo_about_garage"
  | "about_inspection_points"
  | "about_vehicles_sold"
  | "about_years_experience"
  | "about_clients"
>;

export default async function SobrePage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("site_settings")
    .select(
      "photo_about_hero, photo_about_garage, about_inspection_points, about_vehicles_sold, about_years_experience, about_clients"
    )
    .limit(1)
    .maybeSingle();
  const photos = data as AboutStats | null;

  // Números editáveis em /admin/definicoes. Valores a 0 (ou em falta)
  // escondem a respetiva entrada, para a faixa nunca ficar com zeros.
  const stats = [
    {
      value: Number(photos?.about_inspection_points ?? 140),
      prefix: "",
      label: "pontos de inspeção por viatura",
    },
    {
      value: Number(photos?.about_vehicles_sold ?? 0),
      prefix: "+",
      label: "viaturas vendidas",
    },
    {
      value: Number(photos?.about_years_experience ?? 0),
      prefix: "+",
      label: "anos de experiência",
    },
    {
      value: Number(photos?.about_clients ?? 0),
      prefix: "+",
      label: "clientes satisfeitos",
    },
  ].filter((stat) => Number.isFinite(stat.value) && stat.value > 0);

  return (
    <div className="bg-background">
      {/* Hero Section */}
      <section className="relative flex min-h-[62vh] items-end overflow-hidden sm:min-h-[72vh]">
        <Image
          src={photos?.photo_about_hero || "https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=1800&q=75"}
          alt="Automóvel numa garagem, imagem ilustrativa"
          fill
          sizes="100vw"
          priority
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/95 via-black/65 to-black/20" />
        <div className="relative z-10 mx-auto w-full max-w-[1440px] px-5 pb-16 pt-24 sm:px-8 sm:pb-20 lg:px-12">
          <p className="font-display text-[10px] uppercase tracking-[0.28em] text-copper">
            Chikane Garage
          </p>
          <h1 className="mt-6 max-w-4xl font-display text-5xl font-bold uppercase leading-[0.92] tracking-tight text-white text-balance sm:text-7xl lg:text-[6.5rem]">
            Viaturas.
            <br />
            <span className="text-copper">Sem rodeios.</span>
          </h1>
          <p className="mt-6 max-w-xl text-sm leading-relaxed text-white/80 sm:text-base">
            A Chikane Garage apresenta viaturas e respetiva informação num só lugar.
            Consulta o catálogo e fala connosco para esclarecer dúvidas sobre cada unidade.
          </p>
          <Link
            href="/usados"
            className="mt-8 inline-flex min-h-12 items-center bg-copper px-6 py-4 font-display text-xs font-semibold uppercase tracking-widest text-black transition-colors hover:bg-copper-light"
          >
            Explorar catálogo
          </Link>
        </div>
      </section>

      {/* A Garagem Section */}
      <section className="mx-auto max-w-[1440px] px-5 py-16 sm:px-8 sm:py-24 lg:px-12">
        <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
          <div>
            <p className="font-display text-[10px] uppercase tracking-[0.26em] text-copper">
              A garagem
            </p>
            <h2 className="mt-4 font-display text-3xl font-semibold uppercase leading-tight text-white text-balance sm:text-4xl">
              Compramos como se fosse para nós.
              <br />
              <span className="text-white/60">Porque já foi.</span>
            </h2>
            <p className="mt-5 text-sm leading-7 text-white/70">
              Cada viatura é escolhida como se fosse para a nossa própria garagem.
              Avaliamos o histórico, o estado mecânico e estético, e só depois de
              passar a nossa lista de 140 pontos é que uma unidade recebe o número
              de série Chikane.
            </p>
          </div>
          <div className="relative min-h-[280px] overflow-hidden sm:min-h-[360px] lg:min-h-0 lg:h-[calc(100%+3rem)]">
            <Image
              src={photos?.photo_about_garage || "https://images.unsplash.com/photo-1486262715619-01b8c2297602?auto=format&fit=crop&w=1000&q=75"}
              alt="Detalhe de manutenção automóvel"
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover"
            />
          </div>
        </div>
      </section>

      {/* Faixa de números (editáveis em /admin/definicoes) */}
      {stats.length > 0 && (
        <section className="border-y border-border bg-surface/40">
          <div className="mx-auto max-w-[1440px] px-5 py-14 sm:px-8 sm:py-16 lg:px-12">
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {stats.map((stat, i) => (
                <Reveal key={stat.label} delay={Math.min(i * 100, 300)}>
                  <p className="font-display text-5xl leading-none tabular-nums text-copper sm:text-6xl">
                    {stat.prefix}
                    {stat.value.toLocaleString("pt-PT")}
                  </p>
                  <p className="mt-3 max-w-[16rem] text-sm leading-relaxed text-white/70">
                    {stat.label}
                  </p>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* O Processo Section */}
      <section className="mx-auto max-w-[1440px] px-5 py-16 sm:px-8 sm:py-24 lg:px-12">
        <div className="mb-12">
          <p className="font-display text-[10px] uppercase tracking-[0.26em] text-copper">
            O processo
          </p>
          <h2 className="mt-4 font-display text-3xl font-semibold uppercase leading-tight text-white text-balance sm:text-4xl">
            Da escolha à sua garagem
          </h2>
        </div>
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Step 1 */}
          <div className="border border-white/10 bg-surface p-6">
            <div className="flex h-12 w-12 items-center justify-center border border-copper/30 bg-copper/10">
              <span className="font-display text-xl font-bold text-copper">01</span>
            </div>
            <h3 className="mt-5 font-display text-lg font-semibold uppercase text-white">
              Seleção
            </h3>
            <p className="mt-3 text-sm leading-6 text-white/70">
              Procuramos ativamente as melhores unidades no mercado. Avaliamos cada
              oportunidade com critérios rigorosos.
            </p>
          </div>

          {/* Step 2 */}
          <div className="border border-white/10 bg-surface p-6">
            <div className="flex h-12 w-12 items-center justify-center border border-copper/30 bg-copper/10">
              <span className="font-display text-xl font-bold text-copper">02</span>
            </div>
            <h3 className="mt-5 font-display text-lg font-semibold uppercase text-white">
              Inspecção
            </h3>
            <p className="mt-3 text-sm leading-6 text-white/70">
              Cada viatura passa por 140 pontos de verificação. Documentamos tudo
              com fotografia para total transparência.
            </p>
          </div>

          {/* Step 3 */}
          <div className="border border-white/10 bg-surface p-6">
            <div className="flex h-12 w-12 items-center justify-center border border-copper/30 bg-copper/10">
              <span className="font-display text-xl font-bold text-copper">03</span>
            </div>
            <h3 className="mt-5 font-display text-lg font-semibold uppercase text-white">
              Transparência
            </h3>
            <p className="mt-3 text-sm leading-6 text-white/70">
              Documentação completa e acompanhamento de todo o processo. Sabes
              sempre em que estado está o teu processo.
            </p>
          </div>

          {/* Step 4 */}
          <div className="border border-white/10 bg-surface p-6">
            <div className="flex h-12 w-12 items-center justify-center border border-copper/30 bg-copper/10">
              <span className="font-display text-xl font-bold text-copper">04</span>
            </div>
            <h3 className="mt-5 font-display text-lg font-semibold uppercase text-white">
              Entrega
            </h3>
            <p className="mt-3 text-sm leading-6 text-white/70">
              Viatura entregue pronta a usar, com garantia Chikane e apoio contínuo
              após a compra.
            </p>
          </div>
        </div>
      </section>

      {/* Como Funciona Section */}
      <section className="mx-auto max-w-[1440px] px-5 py-16 sm:px-8 sm:py-24 lg:px-12">
        <div className="grid gap-10 md:grid-cols-2 md:gap-16">
          <div>
            <p className="font-display text-[10px] uppercase tracking-[0.26em] text-copper">
              Como funciona
            </p>
            <h2 className="mt-4 font-display text-3xl font-semibold uppercase leading-tight text-white text-balance sm:text-4xl">
              Informação por viatura
            </h2>
            <p className="mt-5 text-sm leading-7 text-white/70">
              Cada ficha reúne os dados disponíveis, fotografias, equipamento e
              preço indicado. Como as condições podem variar de unidade para unidade,
              confirma diretamente com a equipa os detalhes antes de tomar uma decisão.
            </p>
          </div>
          <div className="border border-white/10 bg-[#111] p-6 sm:p-8">
            <h2 className="font-display text-xl font-semibold uppercase text-white">
              Queres saber mais?
            </h2>
            <p className="mt-3 text-sm leading-6 text-white/70">
              Envia um pedido sobre uma viatura específica ou coloca uma questão
              geral através do formulário.
            </p>
            <Link
              href="/contacto"
              className="mt-6 inline-flex min-h-11 items-center border border-copper px-5 py-3 font-display text-xs font-semibold uppercase tracking-widest text-copper transition-colors hover:bg-copper hover:text-black"
            >
              Contactar a equipa
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}