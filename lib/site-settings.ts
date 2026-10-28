// Tipo partilhado da tabela site_settings (contactos, redes sociais,
// rodapé e fotos das páginas — editáveis em /admin/definicoes).
export type SiteSettings = {
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  location?: string | null;
  // Link do Google Maps (opcional) — usado no rodapé/contactos.
  location_url?: string | null;
  social_instagram?: string | null;
  social_facebook?: string | null;
  social_whatsapp?: string | null;
  social_youtube?: string | null;
  social_tiktok?: string | null;
  footer_tagline?: string | null;
  // Fotos das páginas (colunas em site_settings — supabase/setup.sql)
  photo_home_hero?: string | null;
  photo_home_history?: string | null;
  photo_about_hero?: string | null;
  photo_about_garage?: string | null;
  avatar_pool?: string | null;
  // Configuração dos test-drives (supabase/setup.sql)
  td_duration_minutes?: number | null;
  td_slots?: string | null;
  td_days?: string | null;
  // Propostas de viaturas novas (supabase/021_add_sale_type_and_proposals.sql)
  proposal_notify_emails?: string | null;
};
