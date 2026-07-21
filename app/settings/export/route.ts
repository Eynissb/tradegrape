import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { tradesToCsv, type ExportTradeRow } from '@/lib/journal/trade-csv';

/** GET /settings/export → CSV de TOUS les trades de l'utilisateur (RGPD). */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

  // RLS « trades owner » borne déjà la lecture aux trades de l'utilisateur.
  const { data: trades, error } = await supabase
    .from('trades')
    .select('trade_date, closed_at, symbol, direction, quantity, entry_price, exit_price, pnl, fees, tags, notes')
    .eq('user_id', user.id)
    .order('trade_date', { ascending: true })
    .order('closed_at', { ascending: true })
    .returns<ExportTradeRow[]>();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return new NextResponse(tradesToCsv(trades ?? []), {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="tradegrape-mes-trades.csv"',
    },
  });
}
