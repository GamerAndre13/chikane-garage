"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { FavoriteButton } from "@/components/ui/favorite-button";
import { VehicleCardGallery } from "@/components/ui/vehicle-card-gallery";

type Vehicle = {
  id: string; slug: string; brand?: string | null; model?: string | null; trim?: string | null;
  registration_year?: number | null; mileage_km?: number | null; power_hp?: number | null;
  fuel_type?: string | null; transmission?: string | null; exterior_color?: string | null;
  price?: number | null; status?: string | null; cover_image_url?: string | null;
  vehicle_images?: { url?: string | null; position?: number | null; alt_text?: string | null }[] | null;
};

const control = "w-full appearance-none border border-white/10 bg-[#111] px-4 py-3 text-sm text-white outline-none transition-colors focus:border-copper";

function photosFor(v: Vehicle) {
  return [...(v.cover_image_url ? [{ url: v.cover_image_url }] : []), ...((v.vehicle_images || []).filter((image) => image.url).sort((a, b) => (a.position ?? 0) - (b.position ?? 0)).map((image) => ({ url: image.url!, alt: image.alt_text || "" })))].filter((photo, index, all) => all.findIndex((candidate) => candidate.url === photo.url) === index).slice(0, 2);
}

function statusLabel(status?: string | null) {
  if (status === "reserved") return { label: "Reservada", color: "#f59e0b" };
  if (status === "sold") return { label: "Vendida", color: "#aaa" };
  if (status === "available") return { label: "Disponível", color: "#f47724" };
  return null;
}

export function CatalogBrowser({ vehicles }: { vehicles: Vehicle[] }) {
  const [query, setQuery] = useState("");
  const [model, setModel] = useState("all");
  const [fuel, setFuel] = useState("all");
  const [year, setYear] = useState(2018);
  const [price, setPrice] = useState(60000);
  const [mileage, setMileage] = useState(130000);
  const models = useMemo(() => [...new Set(vehicles.map((v) => v.model).filter((v): v is string => Boolean(v)))].sort(), [vehicles]);
  const fuels = useMemo(() => [...new Set(vehicles.map((v) => v.fuel_type).filter((v): v is string => Boolean(v)))].sort(), [vehicles]);
  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("pt-PT");
    return vehicles.filter((v) => {
      const searchable = [v.brand, v.model, v.trim, v.registration_year, v.exterior_color].join(" ").toLocaleLowerCase("pt-PT");
      return (!needle || searchable.includes(needle)) && (model === "all" || v.model === model) && (fuel === "all" || v.fuel_type === fuel) && (v.registration_year ?? 0) >= year && (v.price ?? 0) <= price && (v.mileage_km ?? 0) <= mileage;
    });
  }, [vehicles, query, model, fuel, year, price, mileage]);

  const clear = () => { setQuery(""); setModel("all"); setFuel("all"); setYear(2018); setPrice(60000); setMileage(130000); };

  return (
    <>
      <div className="mt-9 flex flex-col gap-3 border border-white/10 bg-[#101010] p-3 sm:flex-row sm:p-4">
        <label className="relative flex-1">
          <span className="sr-only">Pesquisar viaturas</span>
          <svg className="absolute left-4 top-1/2 -translate-y-1/2 text-copper" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Pesquisar por modelo, versão, ano..." className="w-full border border-white/10 bg-black px-12 py-4 text-sm text-white placeholder:text-white/35 outline-none transition-colors focus:border-copper" />
        </label>
        <div className="flex items-center justify-between gap-5 border border-white/10 bg-black px-5 py-3 sm:min-w-52">
          <span className="font-display text-[10px] uppercase tracking-[0.18em] text-white/45">Em garagem</span>
          <span className="font-display text-lg text-white">{filtered.length.toString().padStart(2, "0")} <span className="text-xs text-white/40">/ {vehicles.length.toString().padStart(2, "0")}</span></span>
        </div>
      </div>

      <div className="mt-7 grid gap-8 lg:grid-cols-[250px_1fr] xl:gap-12">
        <aside className="h-fit border border-white/10 bg-[#101010] p-5 sm:p-6">
          <div className="mb-7 flex items-center justify-between border-b border-white/10 pb-4">
            <h2 className="font-display text-sm font-semibold uppercase tracking-[0.2em] text-white">Filtros</h2>
            <button type="button" onClick={clear} className="font-display text-[10px] uppercase tracking-[0.16em] text-copper transition-colors hover:text-white">Limpar</button>
          </div>
          <div className="space-y-6">
            <label className="block"><span className="mb-2 block font-display text-[10px] uppercase tracking-[0.16em] text-white/50">Marca</span><select className={`${control} cursor-not-allowed text-white/60`} disabled value="BMW"><option>BMW</option></select></label>
            <label className="block"><span className="mb-2 block font-display text-[10px] uppercase tracking-[0.16em] text-white/50">Modelo</span><select className={control} value={model} onChange={(e) => setModel(e.target.value)}><option value="all">Todos os modelos</option>{models.map((m) => <option key={m} value={m}>{m}</option>)}</select></label>
            <label className="block"><span className="mb-2 block font-display text-[10px] uppercase tracking-[0.16em] text-white/50">Combustível</span><select className={control} value={fuel} onChange={(e) => setFuel(e.target.value)}><option value="all">Todos</option>{fuels.map((f) => <option key={f} value={f}>{f}</option>)}</select></label>
            <label className="block"><span className="mb-3 flex justify-between font-display text-[10px] uppercase tracking-[0.13em] text-white/50"><span>Ano a partir de</span><span className="text-white">{year}</span></span><input className="w-full accent-[#f47724]" type="range" min="2000" max="2026" step="1" value={year} onChange={(e) => setYear(Number(e.target.value))}/><span className="mt-1 flex justify-between text-[10px] text-white/30"><span>2000</span><span>2026</span></span></label>
            <label className="block"><span className="mb-3 flex justify-between font-display text-[10px] uppercase tracking-[0.13em] text-white/50"><span>Preço até</span><span className="text-white">{price.toLocaleString("pt-PT")} €</span></span><input className="w-full accent-[#f47724]" type="range" min="5000" max="100000" step="1000" value={price} onChange={(e) => setPrice(Number(e.target.value))}/><span className="mt-1 flex justify-between text-[10px] text-white/30"><span>5 000 €</span><span>100 000 €</span></span></label>
            <label className="block"><span className="mb-3 flex justify-between font-display text-[10px] uppercase tracking-[0.13em] text-white/50"><span>Quilometragem até</span><span className="text-white">{mileage.toLocaleString("pt-PT")} km</span></span><input className="w-full accent-[#f47724]" type="range" min="0" max="300000" step="5000" value={mileage} onChange={(e) => setMileage(Number(e.target.value))}/><span className="mt-1 flex justify-between text-[10px] text-white/30"><span>0 km</span><span>300 000 km</span></span></label>
          </div>
        </aside>

        <section aria-live="polite">
          <div className="mb-5 flex items-center gap-4"><span className="h-px flex-1 bg-white/10"/><p className="font-display text-[10px] uppercase tracking-[0.2em] text-white/45">{filtered.length} viaturas <span className="text-copper">em garagem</span></p></div>
          {filtered.length === 0 ? <div className="border border-white/10 bg-[#101010] px-6 py-20 text-center"><p className="font-display text-xl uppercase tracking-wide text-white">Nenhuma viatura encontrada</p><p className="mt-2 text-sm text-white/45">Altera os filtros ou tenta outra pesquisa.</p><button type="button" onClick={clear} className="mt-6 border border-copper px-5 py-3 font-display text-xs uppercase tracking-widest text-copper transition-colors hover:bg-copper hover:text-white">Limpar filtros</button></div> : <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{filtered.map((v) => {
            const status = statusLabel(v.status);
            return <article key={v.id} className="group overflow-hidden border border-white/10 bg-[#111] transition-[border-color,box-shadow] duration-300 hover:border-copper/70 hover:shadow-[0_0_24px_rgba(244,119,36,0.13)]">
              <VehicleCardGallery photos={photosFor(v)} href={`/catalogo/${v.slug}`} title={`${v.brand ?? ""} ${v.model ?? ""}`}>
                <div className="absolute right-3 top-3 z-20"><FavoriteButton vehicleId={v.id}/></div>
                {status && <span className="absolute bottom-3 left-3 z-20 border border-current bg-black/80 px-3 py-1 font-display text-[10px] uppercase tracking-[0.15em]" style={{color:status.color}}>{status.label}</span>}
              </VehicleCardGallery>
              <Link href={`/catalogo/${v.slug}`} className="block p-4 sm:p-5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-copper">
                <p className="font-display text-[10px] uppercase tracking-[0.18em] text-white/45">{v.brand || "BMW"} <span className="text-copper">·</span> {v.registration_year || ""}</p>
                <h3 className="mt-2 font-display text-xl font-semibold uppercase tracking-wide text-white">{v.model}</h3>
                {v.trim && <p className="mt-1 font-display text-[10px] uppercase tracking-[0.15em] text-copper">{v.trim}</p>}
                <div className="mt-4 grid grid-cols-2 gap-y-2 border-y border-white/10 py-3 text-xs"><span className="text-white/40">Quilometragem</span><span className="text-right text-white/80">{v.mileage_km != null ? `${v.mileage_km.toLocaleString("pt-PT")} km` : "—"}</span><span className="text-white/40">Potência</span><span className="text-right text-white/80">{v.power_hp != null ? `${v.power_hp} cv` : "—"}</span><span className="text-white/40">Combustível</span><span className="text-right text-white/80">{v.fuel_type || "—"}</span></div>
                <div className="mt-4 flex items-end justify-between"><span className="font-display text-xl font-semibold text-white">{v.price != null ? `${v.price.toLocaleString("pt-PT")} €` : "Sob consulta"}</span><span className="font-display text-[10px] uppercase tracking-[0.13em] text-copper transition-colors group-hover:text-white">Ver viatura ↗</span></div>
              </Link>
            </article>;
          })}</div>}
        </section>
      </div>
    </>
  );
}
