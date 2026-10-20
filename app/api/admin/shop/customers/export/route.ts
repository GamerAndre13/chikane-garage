import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const csvCell = (value: unknown) => `"${String(value ?? "").replace(/[\r\n]+/g, " ").replace(/"/g, '""').replace(/^[=+\-@]/, "'$&")}"`;

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sessão necessária." }, { status: 401 });
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "admin") return NextResponse.json({ error: "Sem permissões." }, { status: 403 });
  const { data, error } = await supabase.from("orders").select("customer_name,customer_email,customer_phone,nif,total,created_at,order_number").order("created_at", { ascending: false }).limit(5000);
  if (error) return NextResponse.json({ error: "Não foi possível exportar os clientes." }, { status: 500 });
  const rows = [["Nome", "Email", "Telefone", "NIF", "Valor", "Data", "Encomenda"], ...(data ?? []).map((order) => [order.customer_name, order.customer_email, order.customer_phone, order.nif, Number(order.total).toFixed(2), new Date(order.created_at).toISOString(), order.order_number])];
  const csv = `\uFEFF${rows.map((row) => row.map(csvCell).join(";")).join("\r\n")}`;
  return new NextResponse(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="clientes-chikane-garage.csv"', "Cache-Control": "private, no-store" } });
}
