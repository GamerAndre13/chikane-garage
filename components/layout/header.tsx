"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

export function Header() {
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) checkAdmin(session.user.id);
    });

    // Listen for auth changes (login/logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        checkAdmin(session.user.id);
      } else {
        setIsAdmin(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function checkAdmin(userId: string) {
    const { data } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .single();
    setIsAdmin(data?.role === "admin");
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    setUser(null);
    setIsAdmin(false);
    router.push("/");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2">
          <span className="font-display text-lg font-bold uppercase tracking-wider text-foreground">
            Chikane <span className="text-copper">Garage</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          <Link href="/catalogo" className="text-sm font-medium uppercase tracking-wide text-silver hover:text-copper transition-colors">
            Catálogo
          </Link>
          <Link href="/sobre" className="text-sm font-medium uppercase tracking-wide text-silver hover:text-copper transition-colors">
            Sobre Nós
          </Link>
          <Link href="/loja" className="text-sm font-medium uppercase tracking-wide text-silver hover:text-copper transition-colors">
            Loja
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          {user ? (
            <>
              <Link
                href="/admin"
                className="hidden text-xs font-medium uppercase tracking-widest text-copper hover:text-copper-light transition-colors sm:block"
              >
                Backoffice
              </Link>
              <Link
                href="/conta/perfil"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-silver hover:border-copper hover:text-copper transition-colors"
                title="Meu perfil"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </Link>
              <button
                onClick={handleLogout}
                className="hidden border border-border px-3 py-1.5 text-xs font-medium uppercase tracking-widest text-muted hover:border-copper hover:text-copper transition-colors sm:block"
              >
                Sair
              </button>
            </>
          ) : (
            <Link
              href="/conta"
              className="border border-border px-4 py-1.5 text-xs font-medium uppercase tracking-widest text-muted hover:border-copper hover:text-copper transition-colors"
            >
              Conta
            </Link>
          )}

          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="flex h-9 w-9 items-center justify-center md:hidden"
            aria-label="Menu"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {mobileOpen ? (
                <path d="M18 6L6 18M6 6l12 12" />
              ) : (
                <path d="M3 12h18M3 6h18M3 18h18" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t border-border bg-background px-4 py-4 md:hidden">
          <nav className="flex flex-col gap-3">
            <Link href="/catalogo" className="text-sm font-medium uppercase tracking-wide text-silver hover:text-copper" onClick={() => setMobileOpen(false)}>
              Catálogo
            </Link>
            <Link href="/sobre" className="text-sm font-medium uppercase tracking-wide text-silver hover:text-copper" onClick={() => setMobileOpen(false)}>
              Sobre Nós
            </Link>
            <Link href="/loja" className="text-sm font-medium uppercase tracking-wide text-silver hover:text-copper" onClick={() => setMobileOpen(false)}>
              Loja
            </Link>
            <Link href="/contacto" className="text-sm font-medium uppercase tracking-wide text-silver hover:text-copper" onClick={() => setMobileOpen(false)}>
              Contacto
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
