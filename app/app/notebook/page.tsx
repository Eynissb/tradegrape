import Link from 'next/link';
import { NotebookPen, Pin } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import Button from '@/components/ui/Button';
import { createNote } from '@/app/app/actions';

export const metadata = { title: 'Notebook — Tradegrape' };

interface NoteRow {
  id: string;
  title: string;
  body: string;
  pinned: boolean;
  updated_at: string;
}

const COLS_NOTES = 'minmax(0,1fr) 116px 84px';

function fmtDate(iso: string): string {
  return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(iso));
}

export default async function NotebookPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();

  // La table peut ne pas encore exister (migration 0009) : on dégrade en liste vide.
  const { data } = await supabase
    .from('journal_notes')
    .select('id, title, body, pinned, updated_at')
    .order('pinned', { ascending: false })
    .order('updated_at', { ascending: false })
    .returns<NoteRow[]>();
  const notes = data ?? [];

  return (
    <main className="ui jwrap jwrap-acct">
      <div className="acct2-top">
        <h1 className="jh1">Notebook</h1>
        <p className="jsub mt-1">
          Plan de trading, observations de marché, règles perso — tout ce qui n’est pas rattaché à un trade.
        </p>
      </div>

      {error ? <div className="notice notice-error mt-4">{error}</div> : null}

      {/* Création rapide. */}
      <form action={createNote} className="card jnote-new mt-6">
        <h3 className="acct-rules-title">Nouvelle note</h3>
        <Input id="title" name="title" label="Titre" placeholder="Ex : Plan de la semaine" width="lg" />
        <div className="mt-4">
          <Textarea id="body" name="body" label="Contenu" rows={4} placeholder="Écris librement…" />
        </div>
        <div className="mt-4"><Button type="submit">Créer la note</Button></div>
      </form>

      {/* Liste. */}
      <div className="card mt-6">
        <h3 className="acct-rules-title">Mes notes</h3>
        {notes.length === 0 ? (
          <div className="acct2-empty">
            <NotebookPen aria-hidden="true" style={{ opacity: 0.5 }} /> Aucune note pour l’instant.
          </div>
        ) : (
          <div className="data-list mt-3" role="table" style={{ ['--cols' as string]: COLS_NOTES }}>
            <div className="data-head" role="row">
              <span role="columnheader">Note</span>
              <span role="columnheader">Modifiée</span>
              <span role="columnheader"></span>
            </div>
            {notes.map((n) => (
              <div key={n.id} className="data-row" role="row">
                <Link href={`/app/notebook/${n.id}`} role="cell" data-label="Note" className="jnote-title">
                  {n.pinned ? <Pin aria-label="Épinglée" className="jnote-pin" /> : null}
                  {n.title || <span className="jnote-untitled">Sans titre</span>}
                </Link>
                <span role="cell" data-label="Modifiée" className="num">{fmtDate(n.updated_at)}</span>
                <span role="cell" className="data-actions">
                  <Link href={`/app/notebook/${n.id}`} className="btn btn-ghost btn-sm">Ouvrir</Link>
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
