import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { changeEmail, changePassword, saveProfile } from './actions';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Checkbox from '@/components/ui/Checkbox';
import Button, { buttonClasses } from '@/components/ui/Button';

export const metadata = { title: 'Mes préférences — Tradegrape' };

interface ProfileRow {
  display_name: string | null;
  email: string | null;
  locale: string;
  currency: string;
  date_format: string;
  timezone: string;
  notif_rule_changes: boolean;
  notif_weekly: boolean;
}

const SAVED: Record<string, string> = {
  profil: 'Préférences enregistrées.',
  password: 'Mot de passe mis à jour.',
  email: 'Vérifie ta boîte mail pour confirmer la nouvelle adresse.',
};

export default async function UserSettings({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const { error, saved } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login?redirect=/settings');

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, email, locale, currency, date_format, timezone, notif_rule_changes, notif_weekly')
    .eq('id', user.id)
    .single<ProfileRow>();

  const p: ProfileRow = profile ?? {
    display_name: null, email: user.email ?? null, locale: 'fr', currency: 'USD',
    date_format: 'DD/MM/YYYY', timezone: 'Europe/Paris', notif_rule_changes: true, notif_weekly: true,
  };

  return (
    <main className="ui jwrap jwrap-narrow">
      <nav className="jcrumb">
        <Link href="/app" className="link-accent">Mes comptes</Link>{' / '}Mes préférences
      </nav>
      <h1 className="jh1">Mes préférences</h1>
      <p className="jsub mt-1">Ce qui concerne ta personne — indépendant de chaque challenge. Les réglages d’un compte sont dans ses propres paramètres.</p>

      {error ? <div className="notice notice-error mt-4">{error}</div> : null}
      {saved ? <div className="notice notice-info mt-4">{SAVED[saved] ?? 'Enregistré.'}</div> : null}

      {/* Profil + affichage + notifications */}
      <form action={saveProfile} className="card ds-form mt-6">
        <h2 className="acct-rules-title">Profil & affichage</h2>
        <Input id="display_name" name="display_name" label="Nom affiché" defaultValue={p.display_name ?? ''} width="md" />
        <div className="admin-grid mt-4">
          <Select name="locale" label="Langue" defaultValue={p.locale} width="sm" options={[{ value: 'fr', label: 'Français' }, { value: 'en', label: 'English' }]} />
          <Select name="currency" label="Devise par défaut" defaultValue={p.currency} width="sm" options={[
            { value: 'USD', label: 'USD $' }, { value: 'EUR', label: 'EUR €' }, { value: 'GBP', label: 'GBP £' },
          ]} />
          <Select name="date_format" label="Format de date" defaultValue={p.date_format} width="sm" options={[
            { value: 'DD/MM/YYYY', label: 'JJ/MM/AAAA' }, { value: 'MM/DD/YYYY', label: 'MM/JJ/AAAA' }, { value: 'YYYY-MM-DD', label: 'AAAA-MM-JJ' },
          ]} />
          <Input id="timezone" name="timezone" label="Fuseau horaire" defaultValue={p.timezone} width="md" placeholder="Europe/Paris" />
        </div>

        <h3 className="acct-rules-title mt-6" style={{ fontSize: '.95rem' }}>Notifications</h3>
        <div className="flex flex-col gap-2">
          <Checkbox name="notif_rule_changes" label="Alertes de changement de règles" defaultChecked={p.notif_rule_changes} />
          <Checkbox name="notif_weekly" label="Résumé hebdomadaire" defaultChecked={p.notif_weekly} />
        </div>

        <div className="mt-5"><Button type="submit">Enregistrer</Button></div>
      </form>

      {/* Sécurité */}
      <div className="card ds-form mt-6">
        <h2 className="acct-rules-title">Sécurité</h2>

        <form action={changeEmail}>
          <Input id="email" name="email" label="Adresse email" type="email" defaultValue={p.email ?? ''} width="md" />
          <p className="jsub mt-1">Un email de confirmation est envoyé à la nouvelle adresse.</p>
          <div className="mt-3"><Button type="submit" variant="secondary" size="sm">Changer l’email</Button></div>
        </form>

        <form action={changePassword} className="mt-6" style={{ borderTop: '1px solid var(--border)', paddingTop: '1.2rem' }}>
          <div className="admin-grid">
            <Input id="password" name="password" label="Nouveau mot de passe" type="password" width="md" autoComplete="new-password" />
            <Input id="password_confirm" name="password_confirm" label="Confirmer" type="password" width="md" autoComplete="new-password" />
          </div>
          <div className="mt-3"><Button type="submit" variant="secondary" size="sm">Changer le mot de passe</Button></div>
        </form>
      </div>

      {/* Données personnelles (RGPD) */}
      <div className="card mt-6">
        <h2 className="acct-rules-title">Mes données</h2>
        <p className="jsub" style={{ marginBottom: '1rem' }}>
          Exporte l’intégralité de tes trades, tous comptes confondus, au format CSV.
        </p>
        <a href="/settings/export" className={buttonClasses({ variant: 'secondary', size: 'sm' })}>Exporter toutes mes données</a>
        <p className="jsub mt-4">
          Suppression du compte : écris-nous depuis cette adresse pour une suppression définitive
          (compte + données). L’effacement du compte d’authentification requiert une étape sécurisée
          côté serveur — bientôt en libre-service.
        </p>
      </div>

      <div className="mt-6">
        <Link href="/app" className={buttonClasses({ variant: 'ghost' })}>Retour à mes comptes</Link>
      </div>
    </main>
  );
}
