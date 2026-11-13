import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export const metadata = {
  title: "Analytics | Chikane Admin",
};

type Vehicle = {
  id: string;
  brand?: string | null;
  model?: string | null;
  registration_year?: number | null;
  mileage_km?: number | null;
  power_hp?: number | null;
  price?: number | null;
  status?: string | null;
  fuel_type?: string | null;
  transmission?: string | null;
  exterior_color?: string | null;
  created_at?: string | null;
};

export default async function AnalyticsPage() {
  const supabase = await createClient();

  const { data: vehicles } = await supabase
    .from("vehicles")
    .select("id, brand, model, registration_year, mileage_km, power_hp, price, status, fuel_type, transmission, exterior_color, created_at");

  const { count: totalContacts } = await supabase
    .from("contact_requests")
    .select("*", { count: "exact", head: true });

  const { count: totalTestDrives } = await supabase
    .from("test_drives")
    .select("*", { count: "exact", head: true });

  const v = (vehicles || []) as Vehicle[];

  // ─── Stats Calculation ───
  const available = v.filter((x) => x.status === "available");
  const reserved = v.filter((x) => x.status === "reserved");
  const sold = v.filter((x) => x.status === "sold");

  const prices = v.filter((x) => x.price != null).map((x) => x.price as number);
  const avgPrice = prices.length ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : 0;
  const minPrice = prices.length ? Math.min(...prices) : 0;
  const maxPrice = prices.length ? Math.max(...prices) : 0;

  const kms = v.filter((x) => x.mileage_km != null).map((x) => x.mileage_km as number);
  const avgKm = kms.length ? Math.round(kms.reduce((a, b) => a + b, 0) / kms.length) : 0;

  const powers = v.filter((x) => x.power_hp != null).map((x) => x.power_hp as number);
  const avgPower = powers.length ? Math.round(powers.reduce((a, b) => a + b, 0) / powers.length) : 0;

  const years = v.filter((x) => x.registration_year != null).map((x) => x.registration_year as number);
  const avgYear = years.length ? Math.round(years.reduce((a, b) => a + b, 0) / years.length) : 0;

  // ─── Group by Status ───
  // Só o estado tem cores com significado (disponível/reservada/vendida).
  const statusGroups = [
    { label: "Disponíveis", count: available.length, color: "var(--success)" },
    { label: "Reservadas", count: reserved.length, color: "var(--warning)" },
    { label: "Vendidas", count: sold.length, color: "var(--red-light)" },
  ];

  // ─── Group by Fuel ───
  const fuelMap = new Map<string, number>();
  v.forEach((x) => {
    const fuel = x.fuel_type || "unknown";
    fuelMap.set(fuel, (fuelMap.get(fuel) || 0) + 1);
  });
  const fuelGroups = Array.from(fuelMap.entries()).map(([label, count]) => ({
    label, count,
  }));

  // ─── Group by Transmission ───
  const transMap = new Map<string, number>();
  v.forEach((x) => {
    const t = x.transmission || "unknown";
    transMap.set(t, (transMap.get(t) || 0) + 1);
  });
  const transGroups = Array.from(transMap.entries()).map(([label, count]) => ({
    label: label === "automatic" ? "Automática" : label === "manual" ? "Manual" : label,
    count,
  }));

  // ─── Group by Color ───
  const colorMap = new Map<string, number>();
  v.forEach((x) => {
    const c = x.exterior_color || "Sem cor";
    colorMap.set(c, (colorMap.get(c) || 0) + 1);
  });
  const colorGroups = Array.from(colorMap.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);

  // ─── Price Distribution (bars) ───
  const priceRanges = [
    { label: "< 30k", min: 0, max: 30000 },
    { label: "30-40k", min: 30000, max: 40000 },
    { label: "40-50k", min: 40000, max: 50000 },
    { label: "> 50k", min: 50000, max: Infinity },
  ];
  const priceDistribution = priceRanges.map((range) => ({
    label: range.label,
    count: prices.filter((p) => p >= range.min && p < range.max).length,
    color: "var(--copper-deep)",
  }));

  // ─── KM Distribution ───
  const kmRanges = [
    { label: "< 50k", min: 0, max: 50000 },
    { label: "50-80k", min: 50000, max: 80000 },
    { label: "80-100k", min: 80000, max: 100000 },
    { label: "> 100k", min: 100000, max: Infinity },
  ];
  const kmDistribution = kmRanges.map((range) => ({
    label: range.label,
    count: kms.filter((k) => k >= range.min && k < range.max).length,
    color: "var(--copper-deep)",
  }));

  // ─── Year Distribution ───
  const yearMap = new Map<number, number>();
  v.forEach((x) => {
    if (x.registration_year) yearMap.set(x.registration_year, (yearMap.get(x.registration_year) || 0) + 1);
  });
  const yearGroups = Array.from(yearMap.entries())
    .map(([year, count]) => ({ label: String(year), count, color: "var(--copper-deep)" }))
    .sort((a, b) => Number(a.label) - Number(b.label));

  // ─── Recent vehicles ───
  const recent = v
    .sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""))
    .slice(0, 5);

  const maxBarCount = Math.max(
    ...priceDistribution.map((x) => x.count),
    ...kmDistribution.map((x) => x.count),
    1,
  );

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl uppercase tracking-wide" style={{ fontFamily: "var(--font-display)", color: "var(--foreground)" }}>
            Analytics
          </h1>
          <p className="mt-1 text-xs" style={{ color: "var(--muted)" }}>
            Estado atual do catálogo — sem período histórico.
          </p>
        </div>
        <Link
          href="/admin"
          className="inline-flex min-h-11 items-center rounded border px-3 text-xs uppercase tracking-widest transition-colors hover:text-foreground"
          style={{ borderColor: "var(--border)", color: "var(--muted)" }}
        >
          ← Dashboard
        </Link>
      </div>

      {/* ─── KPI: preço médio em destaque, três métricas de apoio ao lado ─── */}
      <div className="mb-4 grid gap-3 lg:grid-cols-3">
        <div
          className="rounded-md border p-5 lg:col-span-2"
          style={{ borderColor: "var(--border)", backgroundColor: "var(--surface-mid)" }}
        >
          <p className="text-xs uppercase tracking-wide" style={{ color: "var(--muted)" }}>Preço médio</p>
          <p
            className="mt-2 text-4xl leading-none tabular-nums"
            style={{ fontFamily: "var(--font-display)", color: "var(--foreground)" }}
          >
            {avgPrice.toLocaleString("pt-PT")} €
          </p>
          <p className="mt-2 text-xs tabular-nums" style={{ color: "var(--muted)" }}>
            {prices.length} {prices.length === 1 ? "viatura com preço" : "viaturas com preço"} · mínimo{" "}
            {minPrice.toLocaleString("pt-PT")} € · máximo {maxPrice.toLocaleString("pt-PT")} €
          </p>
        </div>

        <div
          className="divide-y rounded-md border px-4"
          style={{ borderColor: "var(--border)", backgroundColor: "var(--surface-mid)" }}
        >
          <div className="flex items-baseline justify-between gap-3 py-3">
            <span className="text-xs uppercase tracking-wide" style={{ color: "var(--muted)" }}>KM médio</span>
            <span className="text-lg tabular-nums" style={{ fontFamily: "var(--font-display)", color: "var(--foreground)" }}>
              {avgKm.toLocaleString("pt-PT")} km
            </span>
          </div>
          <div className="flex items-baseline justify-between gap-3 py-3">
            <span className="text-xs uppercase tracking-wide" style={{ color: "var(--muted)" }}>Potência média</span>
            <span className="text-lg tabular-nums" style={{ fontFamily: "var(--font-display)", color: "var(--foreground)" }}>
              {avgPower} cv
            </span>
          </div>
          <div className="flex items-baseline justify-between gap-3 py-3">
            <span className="text-xs uppercase tracking-wide" style={{ color: "var(--muted)" }}>Ano médio</span>
            <span className="text-lg tabular-nums" style={{ fontFamily: "var(--font-display)", color: "var(--foreground)" }}>
              {avgYear}
            </span>
          </div>
        </div>
      </div>

      {/* ─── Charts Row ─── */}
      <div className="grid gap-6 lg:grid-cols-2 mb-8">
        {/* Price Distribution */}
        <div className="rounded-md border p-5" style={{ borderColor: "var(--border)", backgroundColor: "var(--surface-mid)" }}>
          <h2 className="mb-4 text-xs uppercase tracking-[0.18em]" style={{ fontFamily: "var(--font-display)", color: "var(--foreground)" }}>
            Distribuição por preço
          </h2>
          <div className="space-y-3">
            {priceDistribution.map((bar) => (
              <div key={bar.label} className="flex items-center gap-3">
                <span className="w-12 shrink-0 text-right text-xs tabular-nums" style={{ color: "var(--muted)" }}>{bar.label}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-sm" style={{ backgroundColor: "var(--surface-raised)" }}>
                  <div
                    className="h-full transition-all"
                    style={{
                      width: `${maxBarCount > 0 ? (bar.count / maxBarCount) * 100 : 0}%`,
                      backgroundColor: bar.color,
                      minWidth: bar.count > 0 ? "6px" : "0",
                    }}
                  />
                </div>
                <span className="w-8 shrink-0 text-right text-xs tabular-nums" style={{ fontFamily: "var(--font-display)", color: "var(--foreground)" }}>{bar.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* KM Distribution */}
        <div className="rounded-md border p-5" style={{ borderColor: "var(--border)", backgroundColor: "var(--surface-mid)" }}>
          <h2 className="mb-4 text-xs uppercase tracking-[0.18em]" style={{ fontFamily: "var(--font-display)", color: "var(--foreground)" }}>
            Distribuição por quilometragem
          </h2>
          <div className="space-y-3">
            {kmDistribution.map((bar) => (
              <div key={bar.label} className="flex items-center gap-3">
                <span className="w-12 shrink-0 text-right text-xs tabular-nums" style={{ color: "var(--muted)" }}>{bar.label}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-sm" style={{ backgroundColor: "var(--surface-raised)" }}>
                  <div
                    className="h-full transition-all"
                    style={{
                      width: `${maxBarCount > 0 ? (bar.count / maxBarCount) * 100 : 0}%`,
                      backgroundColor: bar.color,
                      minWidth: bar.count > 0 ? "6px" : "0",
                    }}
                  />
                </div>
                <span className="w-8 shrink-0 text-right text-xs tabular-nums" style={{ fontFamily: "var(--font-display)", color: "var(--foreground)" }}>{bar.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── Status + Fuel + Transmission ─── */}
      <div className="mb-4 grid gap-3 lg:grid-cols-3">
        {/* By Status — a única lista com cor, porque o estado tem significado. */}
        <div className="rounded-md border p-5" style={{ borderColor: "var(--border)", backgroundColor: "var(--surface-mid)" }}>
          <h2 className="mb-4 text-xs uppercase tracking-[0.18em]" style={{ fontFamily: "var(--font-display)", color: "var(--foreground)" }}>
            Por estado
          </h2>
          <div className="space-y-3">
            {statusGroups.map((g) => (
              <div key={g.label} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: g.color }} />
                  <span className="text-sm" style={{ color: "var(--muted)" }}>{g.label}</span>
                </div>
                <span className="text-lg tabular-nums" style={{ fontFamily: "var(--font-display)", color: "var(--foreground)" }}>{g.count}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 border-t pt-4" style={{ borderColor: "var(--border)" }}>
            <div className="flex justify-between gap-3">
              <span className="text-xs" style={{ color: "var(--muted)" }}>Total</span>
              <span className="text-sm tabular-nums" style={{ fontFamily: "var(--font-display)", color: "var(--foreground)" }}>{v.length}</span>
            </div>
          </div>
        </div>

        {/* By Fuel */}
        <div className="rounded-md border p-5" style={{ borderColor: "var(--border)", backgroundColor: "var(--surface-mid)" }}>
          <h2 className="mb-4 text-xs uppercase tracking-[0.18em]" style={{ fontFamily: "var(--font-display)", color: "var(--foreground)" }}>
            Por combustível
          </h2>
          {fuelGroups.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--muted)" }}>—</p>
          ) : (
            <div className="divide-y" style={{ borderColor: "var(--border)" }}>
              {fuelGroups.map((g) => (
                <div key={g.label} className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0">
                  <span className="truncate text-sm capitalize" style={{ color: "var(--muted)" }}>{g.label}</span>
                  <span className="text-lg tabular-nums" style={{ fontFamily: "var(--font-display)", color: "var(--foreground)" }}>{g.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* By Transmission */}
        <div className="rounded-md border p-5" style={{ borderColor: "var(--border)", backgroundColor: "var(--surface-mid)" }}>
          <h2 className="mb-4 text-xs uppercase tracking-[0.18em]" style={{ fontFamily: "var(--font-display)", color: "var(--foreground)" }}>
            Por caixa
          </h2>
          {transGroups.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--muted)" }}>—</p>
          ) : (
            <div className="divide-y" style={{ borderColor: "var(--border)" }}>
              {transGroups.map((g) => (
                <div key={g.label} className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0">
                  <span className="truncate text-sm" style={{ color: "var(--muted)" }}>{g.label}</span>
                  <span className="text-lg tabular-nums" style={{ fontFamily: "var(--font-display)", color: "var(--foreground)" }}>{g.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ─── Year + Color ─── */}
      <div className="mb-4 grid gap-3 lg:grid-cols-2">
        {/* By Year */}
        <div className="rounded-md border p-5" style={{ borderColor: "var(--border)", backgroundColor: "var(--surface-mid)" }}>
          <h2 className="mb-4 text-xs uppercase tracking-[0.18em]" style={{ fontFamily: "var(--font-display)", color: "var(--foreground)" }}>
            Por ano
          </h2>
          <div className="space-y-3">
            {yearGroups.map((bar) => (
              <div key={bar.label} className="flex items-center gap-3">
                <span className="w-10 shrink-0 text-right text-xs tabular-nums" style={{ color: "var(--muted)" }}>{bar.label}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-sm" style={{ backgroundColor: "var(--surface-raised)" }}>
                  <div
                    className="h-full"
                    style={{
                      width: `${v.length > 0 ? (bar.count / v.length) * 100 : 0}%`,
                      backgroundColor: bar.color,
                      minWidth: bar.count > 0 ? "6px" : "0",
                    }}
                  />
                </div>
                <span className="w-8 shrink-0 text-right text-xs tabular-nums" style={{ fontFamily: "var(--font-display)", color: "var(--foreground)" }}>{bar.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* By Color */}
        <div className="rounded-md border p-5" style={{ borderColor: "var(--border)", backgroundColor: "var(--surface-mid)" }}>
          <h2 className="mb-4 text-xs uppercase tracking-[0.18em]" style={{ fontFamily: "var(--font-display)", color: "var(--foreground)" }}>
            Por cor
          </h2>
          <div>
            {colorGroups.map((g) => (
              <div key={g.label} className="flex items-center justify-between gap-3 border-b py-2 last:border-b-0" style={{ borderColor: "var(--border)" }}>
                <span className="truncate text-sm" style={{ color: "var(--muted)" }}>{g.label || "—"}</span>
                <span className="text-sm tabular-nums" style={{ fontFamily: "var(--font-display)", color: "var(--foreground)" }}>{g.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── Resumo geral: uma única cor de destaque, números tabulares ─── */}
      <section
        className="mb-4 rounded-md border"
        style={{ borderColor: "var(--border)", backgroundColor: "var(--surface-mid)" }}
      >
        <h2
          className="border-b px-4 py-3 text-xs uppercase tracking-[0.18em]"
          style={{ fontFamily: "var(--font-display)", color: "var(--foreground)", borderColor: "var(--border)" }}
        >
          Resumo
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Viaturas", value: String(v.length) },
            { label: "Contactos", value: String(totalContacts ?? 0) },
            { label: "Test drives", value: String(totalTestDrives ?? 0) },
            { label: "Valor do stock", value: `${prices.reduce((a, b) => a + b, 0).toLocaleString("pt-PT")} €` },
          ].map((item, index) => (
            <div
              key={item.label}
              className={`px-4 py-3 ${index > 0 ? "border-t sm:border-t-0 sm:border-l" : ""} ${
                index === 2 ? "sm:border-t lg:border-t-0" : ""
              } ${index === 3 ? "sm:border-l-0 lg:border-l" : ""}`}
              style={{ borderColor: "var(--border)" }}
            >
              <p className="text-xs uppercase tracking-widest" style={{ color: "var(--muted)" }}>{item.label}</p>
              <p
                className="mt-1 text-xl tabular-nums"
                style={{ fontFamily: "var(--font-display)", color: "var(--foreground)" }}
              >
                {item.value}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Recent Vehicles Table ─── */}
      <div className="rounded-md border" style={{ borderColor: "var(--border)", backgroundColor: "var(--surface-mid)" }}>
        <div className="border-b p-4" style={{ borderColor: "var(--border)" }}>
          <h2 className="text-xs uppercase tracking-[0.18em]" style={{ fontFamily: "var(--font-display)", color: "var(--foreground)" }}>
            Viaturas mais recentes
          </h2>
        </div>
        <div className="md:overflow-x-auto">
          <table className="admin-table w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                <th className="px-5 py-3 text-left text-xs uppercase tracking-wide" style={{ color: "var(--muted)" }}>Viatura</th>
                <th className="px-5 py-3 text-left text-xs uppercase tracking-wide" style={{ color: "var(--muted)" }}>Ano</th>
                <th className="px-5 py-3 text-left text-xs uppercase tracking-wide" style={{ color: "var(--muted)" }}>KM</th>
                <th className="px-5 py-3 text-left text-xs uppercase tracking-wide" style={{ color: "var(--muted)" }}>Potência</th>
                <th className="px-5 py-3 text-left text-xs uppercase tracking-wide" style={{ color: "var(--muted)" }}>Preço</th>
                <th className="px-5 py-3 text-left text-xs uppercase tracking-wide" style={{ color: "var(--muted)" }}>Estado</th>
              </tr>
            </thead>
            <tbody>
              {recent.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-6 text-center" style={{ color: "var(--muted)" }}>
                    Sem viaturas registadas.
                  </td>
                </tr>
              )}
              {recent.map((car) => (
                <tr key={car.id} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td data-label="Viatura" className="px-5 py-3" style={{ color: "var(--foreground)" }}>
                    {car.brand} {car.model}
                  </td>
                  <td data-label="Ano" className="px-5 py-3 tabular-nums" style={{ color: "var(--muted)" }}>{car.registration_year}</td>
                  <td data-label="KM" className="px-5 py-3 tabular-nums" style={{ color: "var(--muted)" }}>
                    {car.mileage_km != null ? car.mileage_km.toLocaleString("pt-PT") : "—"} km
                  </td>
                  <td data-label="Potência" className="px-5 py-3 tabular-nums" style={{ color: "var(--muted)" }}>
                    {car.power_hp != null ? `${car.power_hp} cv` : "—"}
                  </td>
                  <td data-label="Preço" className="px-5 py-3 tabular-nums" style={{ color: "var(--copper-deep)" }}>
                    {car.price != null ? `${car.price.toLocaleString("pt-PT")} €` : "—"}
                  </td>
                  <td data-label="Estado" className="px-5 py-3">
                    <span className="inline-flex items-center gap-2 text-xs">
                      <span
                        aria-hidden="true"
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{
                          backgroundColor:
                            car.status === "available"
                              ? "var(--success)"
                              : car.status === "reserved"
                                ? "var(--warning)"
                                : "var(--red-light)",
                        }}
                      />
                      <span style={{ color: "var(--muted)" }}>
                        {car.status === "available" ? "Disponível" : car.status === "reserved" ? "Reservada" : "Vendida"}
                      </span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
