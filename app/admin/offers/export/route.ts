import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getProfile, isStaff } from '@/lib/auth/roles';
import { OFFER_COLUMNS, offersToCsv } from '@/lib/admin/offer-csv';

const COLUMNS = ['id', ...OFFER_COLUMNS.map((c) => c.key)].join(', ');

/** GET /admin/offers/export?plan=<planId> → CSV des offres du plan. */
export async function GET(request: NextRequest) {
  // Les route handlers ne sont pas couverts par le layout /admin : garde explicite.
  const profile = await getProfile();
  if (!profile) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  }
  if (!isStaff(profile.role)) {
    return NextResponse.json({ error: 'Accès réservé au staff' }, { status: 403 });
  }

  const planId = request.nextUrl.searchParams.get('plan');
  if (!planId) {
    return NextResponse.json({ error: 'Paramètre plan manquant' }, { status: 400 });
  }

  const supabase = await createClient();

  const { data: plan } = await supabase
    .from('plans')
    .select('slug')
    .eq('id', planId)
    .single<{ slug: string }>();

  const { data: offers, error } = await supabase
    .from('offers')
    .select(COLUMNS)
    .eq('plan_id', planId)
    .order('account_size', { ascending: true })
    .returns<Record<string, unknown>[]>();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const csv = offersToCsv(offers ?? []);
  const filename = `offers-${plan?.slug ?? planId}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
