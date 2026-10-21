import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const csvCell = (value: unknown) => `"${String(value ?? "").replace(/[\r\n]+/g, " ").replace(/"/g, '""').replace(/^[=+\-@]/, "'$&")}"`;

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sessão necessária." }, { status: 401 });
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "admin") return NextResponse.json({ error: "Sem permissões." }, { status: 403 });
  const { data, error } = await supabase.from("newsletter_subscribers").select("email,name,source,status,created_at").order("created_at", { ascending: false }).limit(10000);
  if (error) return NextResponse.json({ error: "Não foi possível exportar a newsletter." }, { status: 500 });
  const rows = [["Email", "Nome", "Origem", "Estado", "Data"], ...(data ?? []).map((row) => [row.email, row.name, row.source, row.status, new Date(row.created_at).toISOString()])];
  const csv = `\uFEFF${rows.map((row) => row.map(csvCell).join(";")).join("\r\n")}`;
  return new NextResponse(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="newsletter-chikane-garage.csv"', "Cache-Control": "private, no-store" } });
}
