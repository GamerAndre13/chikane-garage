// Tipo partilhado da tabela site_settings (contactos, redes sociais,
// rodapé e fotos das páginas — editáveis em /admin/definicoes).
export type SiteSettings = {
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  location?: string | null;
  social_instagram?: string | null;
  social_facebook?: string | null;
  social_whatsapp?: string | null;
  social_youtube?: string | null;
  social_tiktok?: string | null;
  footer_tagline?: string | null;
  // Fotos das páginas (supabase/005_site_settings_fotos.sql)
  photo_home_hero?: string | null;
  photo_home_history?: string | null;
  photo_about_hero?: string | null;
  photo_about_garage?: string | null;
  avatar_pool?: string | null;
  // Configuração dos test-drives (supabase/016_reservas_testdrives.sql)
  td_duration_minutes?: number | null;
  td_slots?: string | null;
  td_days?: string | null;
};
