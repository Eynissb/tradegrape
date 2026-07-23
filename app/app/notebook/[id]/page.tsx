import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import Button from '@/components/ui/Button';
import { updateNote, deleteNote } from '@/app/app/actions';

export const metadata = { title: 'Note — Tradegrape' };

interface NoteRow {
  id: string;
  title: string;
  body: string;
  pinned: boolean;
}

export default async function NoteEditPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const { id } = await params;
  const { saved, error } = await searchParams;

  const supabase = await createClient();
  const { data: note } = await supabase
    .from('journal_notes')
    .select('id, title, body, pinned')
    .eq('id', id)
    .maybeSingle<NoteRow>();
  if (!note) notFound();

  return (
    <main className="ui jwrap jwrap-narrow">
      <nav className="jcrumb">
        <Link href="/app/notebook" className="link-accent">Notebook</Link>{' / '}
        {note.title || 'Sans titre'}
      </nav>

      {saved ? <div className="notice notice-info mt-4">Note enregistrée.</div> : null}
      {error ? <div className="notice notice-error mt-4">{error}</div> : null}

      <form action={updateNote} className="card ds-form mt-6">
        <input type="hidden" name="id" value={note.id} />
        <Input id="title" name="title" label="Titre" defaultValue={note.title} width="lg" placeholder="Sans titre" />
        <div className="mt-4">
          <Textarea id="body" name="body" label="Contenu" rows={12} defaultValue={note.body} />
        </div>
        <label className="jnote-pin-toggle mt-4">
          <input type="checkbox" name="pinned" defaultChecked={note.pinned} className="checkbox" />
          Épingler en haut de la liste
        </label>
        <div className="mt-5"><Button type="submit">Enregistrer</Button></div>
      </form>

      {/* Suppression. */}
      <form action={deleteNote} className="jnote-delete mt-6">
        <input type="hidden" name="id" value={note.id} />
        <Button type="submit" variant="danger" size="sm">Supprimer la note</Button>
      </form>

      <div className="mt-6">
        <Link href="/app/notebook" className="link-accent">← Retour au notebook</Link>
      </div>
    </main>
  );
}
