import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { tradesToCsv, type ExportTradeRow } from '@/lib/journal/trade-csv';

/**
 * GET /app/journal/export → CSV consolidé de TOUS les trades de l'utilisateur,
 * optionnellement filtré par compte (?account=…). RLS garantit le périmètre.
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

  const account = request.nextUrl.searchParams.get('account');

  let query = supabase
    .from('trades')
    .select('trade_date, closed_at, symbol, direction, quantity, entry_price, exit_price, pnl, fees, tags, notes')
    .order('trade_date', { ascending: true })
    .order('closed_at', { ascending: true });
  if (account && account !== 'all') query = query.eq('account_id', account);

  const { data: trades, error } = await query.returns<ExportTradeRow[]>();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const csv = tradesToCsv(trades ?? []);
  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="trades-journal.csv"',
    },
  });
}
