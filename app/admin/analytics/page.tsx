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
  const maxKm = kms.length ? Math.max(...kms) : 0;
  const minKm = kms.length ? Math.min(...kms) : 0;

  const powers = v.filter((x) => x.power_hp != null).map((x) => x.power_hp as number);
  const avgPower = powers.length ? Math.round(powers.reduce((a, b) => a + b, 0) / powers.length) : 0;

  const years = v.filter((x) => x.registration_year != null).map((x) => x.registration_year as number);
  const avgYear = years.length ? Math.round(years.reduce((a, b) => a + b, 0) / years.length) : 0;

  // ─── Group by Status ───
  const statusGroups = [
    { label: "Disponíveis", count: available.length, color: "#22c55e" },
    { label: "Reservadas", count: reserved.length, color: "#f59e0b" },
    { label: "Vendidas", count: sold.length, color: "#ef4444" },
  ];

  // ─── Group by Fuel ───
  const fuelMap = new Map<string, number>();
  v.forEach((x) => {
    const fuel = x.fuel_type || "unknown";
    fuelMap.set(fuel, (fuelMap.get(fuel) || 0) + 1);
  });
  const fuelGroups = Array.from(fuelMap.entries()).map(([label, count]) => ({
    label, count,
    color: label === "diesel" ? "var(--copper-deep)" : label === "gasoline" ? "#3b82f6" : "#8b5cf6",
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
    color: label === "automatic" ? "#22c55e" : "#f59e0b",
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
    color: "#3b82f6",
  }));

  // ─── Year Distribution ───
  const yearMap = new Map<number, number>();
  v.forEach((x) => {
    if (x.registration_year) yearMap.set(x.registration_year, (yearMap.get(x.registration_year) || 0) + 1);
  });
  const yearGroups = Array.from(yearMap.entries())
    .map(([year, count]) => ({ label: String(year), count, color: "#8b5cf6" }))
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
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl uppercase tracking-wide" style={{ fontFamily: "var(--font-display)", color: "var(--foreground)" }}>
            📊 Analytics
          </h1>
          <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>
            Dados de viaturas, contactos e test drives
          </p>
        </div>
        <Link href="/admin" className="text-xs uppercase tracking-widest px-4 py-2 border rounded" style={{ borderColor: "var(--border)", color: "var(--muted)" }}>
          ← Dashboard
        </Link>
      </div>

      {/* ─── KPI Cards ─── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <div className="border p-5 rounded" style={{ borderColor: "var(--border)", backgroundColor: "var(--surface-mid)" }}>
          <p className="text-xs uppercase tracking-wide" style={{ color: "var(--muted)" }}>Preço Médio</p>
          <p className="text-2xl font-display mt-1" style={{ color: "var(--copper-deep)" }}>
            {avgPrice.toLocaleString("pt-PT")} €
          </p>
          <p className="text-[10px] mt-1" style={{ color: "var(--muted-deep)" }}>
            Min: {minPrice.toLocaleString("pt-PT")} € · Max: {maxPrice.toLocaleString("pt-PT")} €
          </p>
        </div>
        <div className="border p-5 rounded" style={{ borderColor: "var(--border)", backgroundColor: "var(--surface-mid)" }}>
          <p className="text-xs uppercase tracking-wide" style={{ color: "var(--muted)" }}>KM Médio</p>
          <p className="text-2xl font-display mt-1" style={{ color: "#3b82f6" }}>
            {avgKm.toLocaleString("pt-PT")} km
          </p>
          <p className="text-[10px] mt-1" style={{ color: "var(--muted-deep)" }}>
            Min: {minKm.toLocaleString("pt-PT")} · Max: {maxKm.toLocaleString("pt-PT")}
          </p>
        </div>
        <div className="border p-5 rounded" style={{ borderColor: "var(--border)", backgroundColor: "var(--surface-mid)" }}>
          <p className="text-xs uppercase tracking-wide" style={{ color: "var(--muted)" }}>Potência Média</p>
          <p className="text-2xl font-display mt-1" style={{ color: "#22c55e" }}>
            {avgPower} cv
          </p>
          <p className="text-[10px] mt-1" style={{ color: "var(--muted-deep)" }}>
            {powers.length} viaturas com dados
          </p>
        </div>
        <div className="border p-5 rounded" style={{ borderColor: "var(--border)", backgroundColor: "var(--surface-mid)" }}>
          <p className="text-xs uppercase tracking-wide" style={{ color: "var(--muted)" }}>Ano Médio</p>
          <p className="text-2xl font-display mt-1" style={{ color: "#8b5cf6" }}>
            {avgYear}
          </p>
          <p className="text-[10px] mt-1" style={{ color: "var(--muted-deep)" }}>
            {years.length} viaturas
          </p>
        </div>
      </div>

      {/* ─── Charts Row ─── */}
      <div className="grid gap-6 lg:grid-cols-2 mb-8">
        {/* Price Distribution */}
        <div className="border p-5 rounded" style={{ borderColor: "var(--border)", backgroundColor: "var(--surface-mid)" }}>
          <h2 className="text-sm font-display uppercase tracking-wide mb-4" style={{ color: "var(--foreground)" }}>
            Distribuição por Preço
          </h2>
          <div className="space-y-3">
            {priceDistribution.map((bar) => (
              <div key={bar.label} className="flex items-center gap-3">
                <span className="text-xs w-12 text-right" style={{ color: "var(--muted)" }}>{bar.label}</span>
                <div className="flex-1 h-6 rounded overflow-hidden" style={{ backgroundColor: "var(--background-alt)" }}>
                  <div
                    className="h-full rounded transition-all"
                    style={{
                      width: `${maxBarCount > 0 ? (bar.count / maxBarCount) * 100 : 0}%`,
                      backgroundColor: bar.color,
                      minWidth: bar.count > 0 ? "24px" : "0",
                    }}
                  />
                </div>
                <span className="text-xs font-display w-6" style={{ color: "var(--foreground)" }}>{bar.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* KM Distribution */}
        <div className="border p-5 rounded" style={{ borderColor: "var(--border)", backgroundColor: "var(--surface-mid)" }}>
          <h2 className="text-sm font-display uppercase tracking-wide mb-4" style={{ color: "var(--foreground)" }}>
            Distribuição por Quilometragem
          </h2>
          <div className="space-y-3">
            {kmDistribution.map((bar) => (
              <div key={bar.label} className="flex items-center gap-3">
                <span className="text-xs w-12 text-right" style={{ color: "var(--muted)" }}>{bar.label}</span>
                <div className="flex-1 h-6 rounded overflow-hidden" style={{ backgroundColor: "var(--background-alt)" }}>
                  <div
                    className="h-full rounded transition-all"
                    style={{
                      width: `${maxBarCount > 0 ? (bar.count / maxBarCount) * 100 : 0}%`,
                      backgroundColor: bar.color,
                      minWidth: bar.count > 0 ? "24px" : "0",
                    }}
                  />
                </div>
                <span className="text-xs font-display w-6" style={{ color: "var(--foreground)" }}>{bar.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── Status + Fuel + Transmission ─── */}
      <div className="grid gap-6 lg:grid-cols-3 mb-8">
        {/* By Status */}
        <div className="border p-5 rounded" style={{ borderColor: "var(--border)", backgroundColor: "var(--surface-mid)" }}>
          <h2 className="text-sm font-display uppercase tracking-wide mb-4" style={{ color: "var(--foreground)" }}>
            Por Estado
          </h2>
          <div className="space-y-3">
            {statusGroups.map((g) => (
              <div key={g.label} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: g.color }} />
                  <span className="text-sm" style={{ color: "var(--muted)" }}>{g.label}</span>
                </div>
                <span className="font-display text-lg" style={{ color: g.color }}>{g.count}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t" style={{ borderColor: "var(--border)" }}>
            <div className="flex justify-between">
              <span className="text-xs" style={{ color: "var(--muted)" }}>Total</span>
              <span className="font-display text-sm" style={{ color: "var(--foreground)" }}>{v.length}</span>
            </div>
          </div>
        </div>

        {/* By Fuel */}
        <div className="border p-5 rounded" style={{ borderColor: "var(--border)", backgroundColor: "var(--surface-mid)" }}>
          <h2 className="text-sm font-display uppercase tracking-wide mb-4" style={{ color: "var(--foreground)" }}>
            Por Combustível
          </h2>
          <div className="space-y-3">
            {fuelGroups.map((g) => (
              <div key={g.label} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: g.color }} />
                  <span className="text-sm capitalize" style={{ color: "var(--muted)" }}>{g.label}</span>
                </div>
                <span className="font-display text-lg" style={{ color: g.color }}>{g.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* By Transmission */}
        <div className="border p-5 rounded" style={{ borderColor: "var(--border)", backgroundColor: "var(--surface-mid)" }}>
          <h2 className="text-sm font-display uppercase tracking-wide mb-4" style={{ color: "var(--foreground)" }}>
            Por Caixa
          </h2>
          <div className="space-y-3">
            {transGroups.map((g) => (
              <div key={g.label} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: g.color }} />
                  <span className="text-sm" style={{ color: "var(--muted)" }}>{g.label}</span>
                </div>
                <span className="font-display text-lg" style={{ color: g.color }}>{g.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── Year + Color ─── */}
      <div className="grid gap-6 lg:grid-cols-2 mb-8">
        {/* By Year */}
        <div className="border p-5 rounded" style={{ borderColor: "var(--border)", backgroundColor: "var(--surface-mid)" }}>
          <h2 className="text-sm font-display uppercase tracking-wide mb-4" style={{ color: "var(--foreground)" }}>
            Por Ano
          </h2>
          <div className="space-y-3">
            {yearGroups.map((bar) => (
              <div key={bar.label} className="flex items-center gap-3">
                <span className="text-xs w-10 text-right" style={{ color: "var(--muted)" }}>{bar.label}</span>
                <div className="flex-1 h-6 rounded overflow-hidden" style={{ backgroundColor: "var(--background-alt)" }}>
                  <div
                    className="h-full rounded"
                    style={{
                      width: `${v.length > 0 ? (bar.count / v.length) * 100 : 0}%`,
                      backgroundColor: bar.color,
                      minWidth: bar.count > 0 ? "24px" : "0",
                    }}
                  />
                </div>
                <span className="text-xs font-display w-6" style={{ color: "var(--foreground)" }}>{bar.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* By Color */}
        <div className="border p-5 rounded" style={{ borderColor: "var(--border)", backgroundColor: "var(--surface-mid)" }}>
          <h2 className="text-sm font-display uppercase tracking-wide mb-4" style={{ color: "var(--foreground)" }}>
            Por Cor
          </h2>
          <div className="space-y-2">
            {colorGroups.map((g) => (
              <div key={g.label} className="flex items-center justify-between py-1.5 border-b" style={{ borderColor: "var(--border)" }}>
                <span className="text-sm" style={{ color: "var(--muted)" }}>{g.label}</span>
                <span className="font-display text-sm" style={{ color: "var(--foreground)" }}>{g.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── Summary Stats ─── */}
      <div className="border p-5 rounded mb-8" style={{ borderColor: "var(--border)", backgroundColor: "var(--surface-mid)" }}>
        <h2 className="text-sm font-display uppercase tracking-wide mb-4" style={{ color: "var(--foreground)" }}>
          Resumo Geral
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-xs" style={{ color: "var(--muted)" }}>Total Viaturas</p>
            <p className="font-display text-xl" style={{ color: "var(--copper-deep)" }}>{v.length}</p>
          </div>
          <div>
            <p className="text-xs" style={{ color: "var(--muted)" }}>Total Contactos</p>
            <p className="font-display text-xl" style={{ color: "#ec4899" }}>{totalContacts ?? 0}</p>
          </div>
          <div>
            <p className="text-xs" style={{ color: "var(--muted)" }}>Test Drives</p>
            <p className="font-display text-xl" style={{ color: "#8b5cf6" }}>{totalTestDrives ?? 0}</p>
          </div>
          <div>
            <p className="text-xs" style={{ color: "var(--muted)" }}>Valor Total Stock</p>
            <p className="font-display text-xl" style={{ color: "#22c55e" }}>
              {prices.reduce((a, b) => a + b, 0).toLocaleString("pt-PT")} €
            </p>
          </div>
        </div>
      </div>

      {/* ─── Recent Vehicles Table ─── */}
      <div className="border rounded" style={{ borderColor: "var(--border)", backgroundColor: "var(--surface-mid)" }}>
        <div className="p-5 border-b" style={{ borderColor: "var(--border)" }}>
          <h2 className="text-sm font-display uppercase tracking-wide" style={{ color: "var(--foreground)" }}>
            Viaturas Mais Recentes
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
                    <span
                      className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded"
                      style={{
                        backgroundColor: car.status === "available" ? "#22c55e20" : car.status === "reserved" ? "#f59e0b20" : "#ef444420",
                        color: car.status === "available" ? "#22c55e" : car.status === "reserved" ? "#f59e0b" : "#ef4444",
                      }}
                    >
                      {car.status === "available" ? "Disponível" : car.status === "reserved" ? "Reservada" : "Vendida"}
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
