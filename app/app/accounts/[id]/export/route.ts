import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { tradesToCsv, type ExportTradeRow } from '@/lib/journal/trade-csv';

/** GET /app/accounts/<id>/export → CSV des trades de l'utilisateur (confiance / RGPD). */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

  // RLS garantit qu'on n'exporte que les trades de comptes de l'utilisateur.
  const { data: account } = await supabase
    .from('journal_accounts')
    .select('id, label')
    .eq('id', id)
    .single<{ id: string; label: string | null }>();
  if (!account) return NextResponse.json({ error: 'Compte introuvable' }, { status: 404 });

  const { data: trades, error } = await supabase
    .from('trades')
    .select('trade_date, closed_at, symbol, direction, quantity, entry_price, exit_price, pnl, fees, tags, notes')
    .eq('account_id', id)
    .order('trade_date', { ascending: true })
    .order('closed_at', { ascending: true })
    .returns<ExportTradeRow[]>();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const csv = tradesToCsv(trades ?? []);
  const slug = (account.label ?? 'compte').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const filename = `trades-${slug || id}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
