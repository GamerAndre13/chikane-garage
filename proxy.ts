import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isStaffRole, canAccessArea, canManageVehicles, type AdminArea } from "@/lib/roles";

// Área do backoffice a que cada caminho pertence. Os caminhos mais
// específicos vêm primeiro.
function areaDoCaminho(pathname: string): AdminArea {
  if (pathname === "/admin" || pathname === "/admin/") return "dashboard";
  if (pathname.startsWith("/admin/utilizadores")) return "utilizadores";
  if (pathname.startsWith("/admin/contas")) return "contas";
  if (pathname.startsWith("/admin/definicoes")) return "definicoes";
  if (pathname.startsWith("/admin/campanhas")) return "campanhas";
  if (pathname.startsWith("/admin/pedidos")) return "pedidos";
  if (pathname.startsWith("/admin/propostas")) return "propostas";
  if (pathname.startsWith("/admin/analytics")) return "pedidos";
  if (pathname.startsWith("/admin/veiculos/extras")) return "extras";
  if (pathname.startsWith("/admin/veiculos")) return "veiculos";
  return "dashboard";
}

// Criar e editar viaturas é do admin e do gestor de vendas (o editor só
// consulta). Apagar viaturas continua exclusivo do admin — a própria página
// esconde o botão e a política RLS de DELETE só aceita admin.
function caminhoGestaoVeiculos(pathname: string): boolean {
  return pathname.startsWith("/admin/veiculos/novo") || pathname.startsWith("/admin/veiculos/editar");
}

// Gestão de utilizadores (incluindo cargos) é exclusiva do admin.
function caminhoExclusivoAdmin(pathname: string): boolean {
  return pathname.startsWith("/admin/utilizadores");
}

export async function proxy(request: NextRequest) {
  const forwardedProtocol = request.headers.get("x-forwarded-proto");
  if (forwardedProtocol && forwardedProtocol.split(",")[0].trim() === "http" && request.nextUrl.hostname !== "localhost" && request.nextUrl.hostname !== "127.0.0.1") {
    const secureUrl = request.nextUrl.clone();
    secureUrl.protocol = "https:";
    return NextResponse.redirect(secureUrl, 308);
  }

  const supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            supabaseResponse.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  const { data: { user } } = await supabase.auth.getUser();
  const pathname = request.nextUrl.pathname;

  if (pathname.startsWith("/admin")) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/conta";
      url.searchParams.set("redirect", pathname);
      return NextResponse.redirect(url);
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    // Apenas a equipa entra no backoffice; cada área tem os seus cargos.
    const role = profile?.role;
    if (!isStaffRole(role)) {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }

    const area = areaDoCaminho(pathname);
    if (
      !canAccessArea(role, area) ||
      (caminhoExclusivoAdmin(pathname) && role !== "admin") ||
      (caminhoGestaoVeiculos(pathname) && !canManageVehicles(role))
    ) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin";
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
