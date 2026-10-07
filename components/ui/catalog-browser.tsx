"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { FavoriteButton } from "@/components/ui/favorite-button";
import { VehicleCardGallery } from "@/components/ui/vehicle-card-gallery";
import { Reveal } from "@/components/ui/reveal";

type Vehicle = {
  id: string; slug: string; brand?: string | null; model?: string | null; trim?: string | null;
  registration_year?: number | null; mileage_km?: number | null; power_hp?: number | null;
  fuel_type?: string | null; transmission?: string | null; exterior_color?: string | null;
  body_style?: string | null; price?: number | null; status?: string | null; cover_image_url?: string | null;
  vehicle_images?: { url?: string | null; position?: number | null; alt_text?: string | null }[] | null;
};

const control = "w-full appearance-none border border-white/10 bg-surface px-3 py-2.5 text-sm text-white outline-none transition-colors focus:border-copper disabled:cursor-not-allowed disabled:opacity-40";
const all = "all";
const unique = (items: (string | number | null | undefined)[]) => [...new Set(items.filter((item): item is string | number => item !== null && item !== undefined && item !== ""))].sort((a, b) => String(a).localeCompare(String(b), "pt-PT", { numeric: true }));

function photosFor(v: Vehicle) {
  return [...(v.cover_image_url ? [{ url: v.cover_image_url }] : []), ...((v.vehicle_images || []).filter((image) => image.url).sort((a, b) => (a.position ?? 0) - (b.position ?? 0)).map((image) => ({ url: image.url!, alt: image.alt_text || "" })))].filter((photo, index, allPhotos) => allPhotos.findIndex((candidate) => candidate.url === photo.url) === index).slice(0, 2);
}

function statusLabel(status?: string | null) {
  if (status === "reserved") return { label: "Reservada", color: "var(--warning)" };
  if (status === "sold") return { label: "Vendida", color: "var(--muted)" };
  if (status === "available") return { label: "Disponível", color: "var(--copper)" };
  return null;
}

function RangeFilter({ label, values, min, max, onMin, onMax, unit, step = 1 }: { label: string; values: number[]; min: string; max: string; onMin: (value: string) => void; onMax: (value: string) => void; unit?: string; step?: number }) {
  const domainMin = values.length ? Math.min(...values) : undefined;
  const domainMax = values.length ? Math.max(...values) : undefined;
  const invalid = min !== all && max !== all && Number(min) > Number(max);
  const inputClass = `${control} min-w-0 px-3 placeholder:italic placeholder:text-white/50 ${unit ? "pr-8" : ""}`;
  return <fieldset className="border-0 p-0"><legend className="mb-2 font-display text-[10px] uppercase tracking-[0.16em] text-white/65">{label}</legend><div className="grid grid-cols-2 gap-2"><label className="relative"><span className="sr-only">{label} desde</span><input className={inputClass} type="number" inputMode="numeric" placeholder="de" aria-label={`${label} de`} aria-invalid={invalid} value={min === all ? "" : min} min={domainMin} max={domainMax} step={step} onChange={(event) => onMin(event.target.value || all)} />{unit && <span aria-hidden="true" className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-white/60">{unit}</span>}</label><label className="relative"><span className="sr-only">{label} até</span><input className={inputClass} type="number" inputMode="numeric" placeholder="até" aria-label={`${label} até`} aria-invalid={invalid} value={max === all ? "" : max} min={domainMin} max={domainMax} step={step} onChange={(event) => onMax(event.target.value || all)} />{unit && <span aria-hidden="true" className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-white/60">{unit}</span>}</label></div>{invalid && <p role="alert" className="mt-1.5 text-xs text-red-300">O valor “de” tem de ser inferior ou igual a “até”.</p>}</fieldset>;
}

export function CatalogBrowser({ vehicles }: { vehicles: Vehicle[] }) {
  const [query, setQuery] = useState("");
  const [brand, setBrand] = useState(all);
  const [model, setModel] = useState(all);
  const [fuel, setFuel] = useState(all);
  const [color, setColor] = useState(all);
  const [bodyStyle, setBodyStyle] = useState(all);
  const [minPower, setMinPower] = useState(all);
  const [maxPower, setMaxPower] = useState(all);
  const [minYear, setMinYear] = useState(all);
  const [maxYear, setMaxYear] = useState(all);
  const [minPrice, setMinPrice] = useState(all);
  const [maxPrice, setMaxPrice] = useState(all);
  const [minMileage, setMinMileage] = useState(all);
  const [maxMileage, setMaxMileage] = useState(all);

  const brands = useMemo(() => unique(vehicles.map((v) => v.brand)) as string[], [vehicles]);
  const models = useMemo(() => unique(vehicles.filter((v) => brand === all || v.brand === brand).map((v) => v.model)) as string[], [vehicles, brand]);
  const fuels = useMemo(() => unique(vehicles.map((v) => v.fuel_type)) as string[], [vehicles]);
  const colors = useMemo(() => unique(vehicles.map((v) => v.exterior_color)) as string[], [vehicles]);
  const bodyStyles = useMemo(() => unique(vehicles.map((v) => v.body_style)) as string[], [vehicles]);
  const years = useMemo(() => unique(vehicles.map((v) => v.registration_year)) as number[], [vehicles]);
  const prices = useMemo(() => unique(vehicles.map((v) => v.price)) as number[], [vehicles]);
  const mileages = useMemo(() => unique(vehicles.map((v) => v.mileage_km)) as number[], [vehicles]);
  const powers = useMemo(() => unique(vehicles.map((v) => v.power_hp)) as number[], [vehicles]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("pt-PT");
    const numericMatch = (value: number | null | undefined, lower: string, upper: string) => lower === all && upper === all || value != null && (lower === all || value >= Number(lower)) && (upper === all || value <= Number(upper));
    return vehicles.filter((v) => {
      const searchable = [v.brand, v.model, v.trim, v.registration_year, v.exterior_color, v.body_style].join(" ").toLocaleLowerCase("pt-PT");
      return (!needle || searchable.includes(needle)) && (brand === all || v.brand === brand) && (model === all || v.model === model) && (fuel === all || v.fuel_type === fuel) && (color === all || v.exterior_color === color) && (bodyStyle === all || v.body_style === bodyStyle) && numericMatch(v.registration_year, minYear, maxYear) && numericMatch(v.price, minPrice, maxPrice) && numericMatch(v.mileage_km, minMileage, maxMileage) && numericMatch(v.power_hp, minPower, maxPower);
    });
  }, [vehicles, query, brand, model, fuel, color, bodyStyle, minYear, maxYear, minPrice, maxPrice, minMileage, maxMileage, minPower, maxPower]);

  const clear = () => { setQuery(""); setBrand(all); setModel(all); setFuel(all); setColor(all); setBodyStyle(all); setMinPower(all); setMaxPower(all); setMinYear(all); setMaxYear(all); setMinPrice(all); setMaxPrice(all); setMinMileage(all); setMaxMileage(all); };
  const optionLabel = (value: string) => value.replaceAll("_", " ").replace(/^./, (first) => first.toLocaleUpperCase("pt-PT"));

  return <>
    <div className="mt-9 flex flex-col gap-3 border border-white/10 bg-surface-oxide p-3 sm:flex-row sm:p-4">
      <label className="relative flex-1"><span className="sr-only">Pesquisar viaturas</span><svg className="absolute left-4 top-1/2 -translate-y-1/2 text-copper" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Pesquisar por modelo, versão, ano..." className="w-full border border-white/10 bg-black px-12 py-4 text-sm text-white placeholder:text-white/35 outline-none transition-colors focus:border-copper" /></label>
      <div className="flex items-center justify-between gap-5 border border-white/10 bg-black px-5 py-3 sm:min-w-52"><span className="font-display text-[10px] uppercase tracking-[0.18em] text-white/45">Em garagem</span><span className="font-display text-lg text-white">{filtered.length.toString().padStart(2, "0")} <span className="text-xs text-white/40">/ {vehicles.length.toString().padStart(2, "0")}</span></span></div>
    </div>
    <div className="mt-7 grid gap-8 lg:grid-cols-[270px_1fr] xl:gap-12">
      <aside className="h-fit border border-white/10 bg-surface-oxide p-5 sm:p-6 lg:sticky lg:top-24"><div className="mb-6 flex items-center justify-between border-b border-white/10 pb-4"><h2 className="font-display text-sm font-semibold uppercase tracking-[0.2em] text-white">Filtros</h2><button type="button" onClick={clear} className="font-display text-[10px] uppercase tracking-[0.16em] text-copper transition-colors hover:text-white">Limpar</button></div>
        <div className="space-y-5">
          <label className="block"><span className="mb-2 block font-display text-[10px] uppercase tracking-[0.16em] text-white/50">Marca</span><select className={control} value={brand} onChange={(e) => { setBrand(e.target.value); setModel(all); }}><option value={all}>Todas as marcas</option>{brands.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
          <label className="block"><span className="mb-2 block font-display text-[10px] uppercase tracking-[0.16em] text-white/50">Modelo</span><select className={control} value={model} disabled={!models.length} onChange={(e) => setModel(e.target.value)}><option value={all}>Todos os modelos</option>{models.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
          <label className="block"><span className="mb-2 block font-display text-[10px] uppercase tracking-[0.16em] text-white/50">Combustível</span><select className={control} value={fuel} onChange={(e) => setFuel(e.target.value)}><option value={all}>Todos</option>{fuels.map((value) => <option key={value} value={value}>{optionLabel(value)}</option>)}</select></label>
          <label className="block"><span className="mb-2 block font-display text-[10px] uppercase tracking-[0.16em] text-white/50">Cor exterior</span><select className={control} value={color} onChange={(e) => setColor(e.target.value)}><option value={all}>Todas as cores</option>{colors.map((value) => <option key={value} value={value}>{optionLabel(value)}</option>)}</select></label>
          <label className="block"><span className="mb-2 block font-display text-[10px] uppercase tracking-[0.16em] text-white/50">Estilo</span><select className={control} value={bodyStyle} onChange={(e) => setBodyStyle(e.target.value)}><option value={all}>Todos os estilos</option>{bodyStyles.map((value) => <option key={value} value={value}>{optionLabel(value)}</option>)}</select></label>
          <RangeFilter label="Desempenho · CV" values={powers} min={minPower} max={maxPower} onMin={setMinPower} onMax={setMaxPower} step={10} />
          <RangeFilter label="Preço" values={prices} min={minPrice} max={maxPrice} onMin={setMinPrice} onMax={setMaxPrice} step={500} unit="€" />
          <RangeFilter label="Primeiro registo" values={years} min={minYear} max={maxYear} onMin={setMinYear} onMax={setMaxYear} />
          <RangeFilter label="Quilometragem" values={mileages} min={minMileage} max={maxMileage} onMin={setMinMileage} onMax={setMaxMileage} step={1000} unit="km" />
        </div>
      </aside>
      <section aria-live="polite"><div className="mb-5 flex items-center gap-4"><span className="h-px flex-1 bg-white/10"/><p className="font-display text-[10px] uppercase tracking-[0.2em] text-white/45">{filtered.length} viaturas <span className="text-copper">em garagem</span></p></div>
        {filtered.length === 0 ? <div className="border border-white/10 bg-surface-oxide px-6 py-20 text-center"><p className="font-display text-xl uppercase tracking-wide text-white">Nenhuma viatura encontrada</p><p className="mt-2 text-sm text-white/45">Altera os filtros ou tenta outra pesquisa.</p><button type="button" onClick={clear} className="mt-6 border border-copper px-5 py-3 font-display text-xs uppercase tracking-widest text-copper transition-colors hover:bg-copper hover:text-white">Limpar filtros</button></div> : <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{filtered.map((v, index) => { const status = statusLabel(v.status); return <Reveal key={v.id} className="h-full" delay={Math.min(index * 55, 330)}><article className="card-lift group h-full overflow-hidden border border-white/10 bg-surface hover:border-copper/70 hover:shadow-[0_0_24px_rgba(244,119,36,0.13)]"><VehicleCardGallery photos={photosFor(v)} href={`/catalogo/${v.slug}`} title={`${v.brand ?? ""} ${v.model ?? ""}`}><div className="absolute right-3 top-3 z-20"><FavoriteButton vehicleId={v.id}/></div>{status && <span className="absolute bottom-3 left-3 z-20 border border-current bg-black/80 px-3 py-1 font-display text-[10px] uppercase tracking-[0.15em]" style={{color:status.color}}>{status.label}</span>}</VehicleCardGallery><Link href={`/catalogo/${v.slug}`} className="block p-4 sm:p-5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-copper"><p className="font-display text-[10px] uppercase tracking-[0.18em] text-white/45">{v.brand || ""} <span className="text-copper">·</span> {v.registration_year || ""}</p><h3 className="mt-2 font-display text-xl font-semibold uppercase tracking-wide text-white">{v.model}</h3>{v.trim && <p className="mt-1 font-display text-[10px] uppercase tracking-[0.15em] text-copper">{v.trim}</p>}<div className="mt-4 grid grid-cols-2 gap-y-2 border-y border-white/10 py-3 text-xs"><span className="text-white/40">Quilometragem</span><span className="text-right text-white/80">{v.mileage_km != null ? `${v.mileage_km.toLocaleString("pt-PT")} km` : "—"}</span><span className="text-white/40">Potência</span><span className="text-right text-white/80">{v.power_hp != null ? `${v.power_hp} cv` : "—"}</span><span className="text-white/40">Combustível</span><span className="text-right text-white/80">{v.fuel_type || "—"}</span></div><div className="mt-4 flex items-end justify-between"><span className="font-display text-xl font-semibold text-white">{v.price != null ? `${v.price.toLocaleString("pt-PT")} €` : "Sob consulta"}</span><span className="font-display text-[10px] uppercase tracking-[0.13em] text-copper transition-colors group-hover:text-white">Ver viatura ↗</span></div></Link></article></Reveal>; })}</div>}
      </section>
    </div>
  </>;
}
