"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { usePathname } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";
import { pickFromPool } from "@/lib/avatar-pool";

export function Header() {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const router = useRouter();
  const pathname = usePathname();
  const navClass = (href: string) => {
    const active = pathname === href || pathname.startsWith(`${href}/`);
    return `group relative py-2 font-display text-xs font-medium uppercase tracking-[0.2em] transition-colors ${active ? "text-copper group-hover/nav:text-silver hover:!text-copper" : "text-silver hover:text-copper"} after:absolute after:inset-x-0 after:-bottom-px after:h-px after:origin-left after:scale-x-0 after:bg-copper after:transition-transform after:duration-300 ${active ? "after:scale-x-100 group-hover/nav:after:scale-x-0 hover:after:scale-x-100" : "hover:after:scale-x-100"}`;
  };

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    // Listen for auth changes (login/logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // O link "Backoffice" só aparece a utilizadores com role admin.
  // (O /admin já é bloqueado pelo proxy — isto é só para não mostrar a entrada.)
  // Aproveita para carregar a imagem de perfil (avatar próprio ou do pool).
  useEffect(() => {
    const id = user?.id;
    let cancelled = false;

    (async () => {
      if (!id) {
        if (!cancelled) {
          setIsAdmin(false);
          setAvatarUrl(null);
        }
        return;
      }
      try {
        const [profileRes, settingsRes] = await Promise.all([
          supabase.from("profiles").select("role, avatar_url").eq("id", id).maybeSingle(),
          supabase.from("site_settings").select("avatar_pool").limit(1).maybeSingle(),
        ]);
        if (cancelled) return;
        setIsAdmin(profileRes.data?.role === "admin");
        const avatar =
          profileRes.data?.avatar_url ||
          pickFromPool(id, (settingsRes.data as { avatar_pool?: string | null } | null)?.avatar_pool);
        setAvatarUrl(avatar || null);
      } catch {
        if (!cancelled) {
          setIsAdmin(false);
          setAvatarUrl(null);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  // Fecha o menu móvel com a tecla Escape ou ao clicar fora do header
  useEffect(() => {
    if (!mobileOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileOpen(false);
    };
    const onClickOutside = (event: MouseEvent) => {
      if (event.target instanceof Node && headerRef.current && !headerRef.current.contains(event.target)) {
        setMobileOpen(false);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("click", onClickOutside);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("click", onClickOutside);
    };
  }, [mobileOpen]);

  async function handleLogout() {
    setMobileOpen(false);
    await supabase.auth.signOut();
    setUser(null);
    router.push("/");
    router.refresh();
  }

  return (
    <header ref={headerRef} className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-md">
      <div className="mx-auto flex h-[76px] max-w-[1440px] items-center px-5 sm:px-8 lg:px-12">
        <Link href="/" className="flex items-center gap-2">
          {/* Em ecrãs pequenos o wordmark parte em 2 linhas (Chikane /
              Garage); a partir de md volta a uma só linha. */}
          <span className="font-display text-lg font-bold uppercase leading-tight tracking-[0.18em] text-foreground">
            Chikane{" "}
            <br className="md:hidden" aria-hidden="true" />
            <span className="text-copper">Garage</span>
          </span>
        </Link>

        <nav className="group/nav ml-auto hidden items-center gap-9 md:flex">
          <Link href="/usados" className={navClass("/usados")}>
            Usados
          </Link>
          <Link href="/novos" className={navClass("/novos")}>
            Novos
          </Link>
          <Link href="/loja" className={navClass("/loja")}>
            Loja
          </Link>
          <Link href="/sobre" className={navClass("/sobre")}>
            Sobre Nós
          </Link>
          <Link href="/contacto" className={navClass("/contacto")}>
            Contacto
          </Link>
        </nav>

        {/* ml-auto empurra os controlos para a direita no telemóvel (onde a nav
            está escondida); a partir de md a nav já tem ml-auto e o espaçamento
            volta a ser o ml-6. */}
        <div className="ml-auto flex items-center gap-3 md:ml-6">
          {user ? (
            <>
              {isAdmin && (
                <Link
                  href="/admin"
                  className="hidden text-xs font-medium uppercase tracking-widest text-copper hover:text-copper-light transition-colors sm:block"
                >
                  Backoffice
                </Link>
              )}
              <Link
                href="/conta/perfil"
                className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded border border-border text-silver transition-colors hover:border-copper hover:text-copper"
                title="Meu perfil"
                aria-label="Abrir o meu perfil"
              >
                {avatarUrl ? (
                  // Avatar do utilizador (próprio ou do pool) — <img> simples
                  // porque a imagem vem de um domínio R2 configurável.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                )}
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
              className="flex h-10 w-10 shrink-0 items-center justify-center border border-border text-silver transition-colors hover:border-copper hover:text-copper"
              title="Entrar"
              aria-label="Entrar na conta"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                <polyline points="10 17 15 12 10 7" />
                <line x1="15" y1="12" x2="3" y2="12" />
              </svg>
            </Link>
          )}

          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="flex h-10 w-10 shrink-0 items-center justify-center md:hidden"
            aria-label={mobileOpen ? "Fechar menu" : "Abrir menu"}
            aria-expanded={mobileOpen}
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
            <Link href="/usados" className={`${navClass("/usados")} w-fit`} onClick={() => setMobileOpen(false)}>
              Usados
            </Link>
            <Link href="/novos" className={`${navClass("/novos")} w-fit`} onClick={() => setMobileOpen(false)}>
              Novos
            </Link>
            <Link href="/loja" className={`${navClass("/loja")} w-fit`} onClick={() => setMobileOpen(false)}>
              Loja
            </Link>
            <Link href="/sobre" className={`${navClass("/sobre")} w-fit`} onClick={() => setMobileOpen(false)}>
              Sobre Nós
            </Link>
            <Link href="/contacto" className={`${navClass("/contacto")} w-fit`} onClick={() => setMobileOpen(false)}>
              Contacto
            </Link>
          </nav>

          {/* Em ecrãs pequenos o "Backoffice" e o "Sair" do cabeçalho ficam
              escondidos — repõe-se aqui o acesso, senão não havia como
              terminar sessão no telemóvel. */}
          {user && (
            <div className="mt-4 flex flex-col gap-3 border-t border-border pt-4">
              <Link href="/conta/perfil" className={`${navClass("/conta")} w-fit`} onClick={() => setMobileOpen(false)}>
                Meu Perfil
              </Link>
              {isAdmin && (
                <Link href="/admin" className={`${navClass("/admin")} w-fit`} onClick={() => setMobileOpen(false)}>
                  Backoffice
                </Link>
              )}
              <button
                type="button"
                onClick={handleLogout}
                className="w-fit py-2 text-left font-display text-xs font-medium uppercase tracking-[0.2em] text-red-light transition-colors hover:text-red"
              >
                Terminar sessão
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
