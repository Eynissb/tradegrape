import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Inscription email publique (section « alertes » de la home). POST { email, locale }.
 * Écrit UNIQUEMENT via la RPC SECURITY DEFINER `record_email_signup` (migration 0016) :
 * la table `newsletter_subscribers` n'est ni lisible ni insérable directement avec la
 * clé anon. La RPC est idempotente (upsert par email normalisé) → pas d'énumération,
 * pas de doublon. On revalide le format ici ET en base.
 */
export const dynamic = 'force-dynamic';

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export async function POST(req: Request) {
  let body: { email?: unknown; locale?: unknown } = {};
  try {
    body = await req.json();
  } catch {
    // corps absent ou invalide → traité comme email manquant ci-dessous
  }

  const email = typeof body.email === 'string' ? body.email.trim() : '';
  const locale = body.locale === 'en' ? 'en' : 'fr';

  if (!EMAIL_RE.test(email) || email.length > 254) {
    return NextResponse.json({ ok: false, error: 'invalid_email' }, { status: 400 });
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc('record_email_signup', {
    p_email: email,
    p_locale: locale,
    p_source: 'home',
  });

  if (error) {
    const invalid = error.code === '22023' || /invalid_email/.test(error.message);
    return NextResponse.json(
      { ok: false, error: invalid ? 'invalid_email' : 'server' },
      { status: invalid ? 400 : 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
