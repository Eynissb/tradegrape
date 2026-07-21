import Link from 'next/link';
import Button, { buttonClasses } from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Checkbox from '@/components/ui/Checkbox';
import Select from '@/components/ui/Select';
import { saveFirm } from './actions';

/** Sous-ensemble des colonnes firms éditées dans ce formulaire. */
export interface FirmValues {
  id?: string;
  slug?: string | null;
  name?: string | null;
  market_type?: string | null;
  logo_url?: string | null;
  website_url?: string | null;
  support_url?: string | null;
  discord_url?: string | null;
  affiliate_url?: string | null;
  default_url?: string | null;
  affiliate_active?: boolean | null;
  commission_note?: string | null;
  founded_year?: number | null;
  country?: string | null;
  hq_city?: string | null;
  trustpilot_rating?: number | null;
  trustpilot_count?: number | null;
  trustpilot_url?: string | null;
  health_score?: number | null;
  max_funded_accounts?: number | null;
  max_eval_accounts?: number | null;
  inactivity_days?: number | null;
  restricted_countries?: string[] | null;
  collects_eu_vat?: boolean | null;
  daily_flat_time?: string | null;
  overnight_allowed?: boolean | null;
  weekend_allowed?: boolean | null;
  is_active?: boolean | null;
  is_published?: boolean | null;
  sort_order?: number | null;
}

function v(value: string | number | null | undefined): string {
  return value === null || value === undefined ? '' : String(value);
}

function Text({
  name,
  label,
  value,
  type = 'text',
  required = false,
  placeholder,
  step,
}: {
  name: string;
  label: string;
  value?: string | number | null;
  type?: string;
  required?: boolean;
  placeholder?: string;
  step?: string;
}) {
  return (
    <Input
      id={name}
      name={name}
      label={label}
      type={type}
      step={step}
      required={required}
      placeholder={placeholder}
      defaultValue={v(value)}
    />
  );
}

function Check({
  name,
  label,
  checked,
}: {
  name: string;
  label: string;
  checked?: boolean | null;
}) {
  return <Checkbox name={name} label={label} defaultChecked={!!checked} />;
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="admin-section">
      <legend>{title}</legend>
      <div className="admin-grid">{children}</div>
    </fieldset>
  );
}

export default function FirmForm({ firm }: { firm?: FirmValues }) {
  const isEdit = !!firm?.id;

  return (
    <form action={saveFirm} className="flex flex-col gap-6 ds-form-wide">
      {isEdit ? <input type="hidden" name="id" value={firm!.id} /> : null}

      <Section title="Identité">
        <Text name="name" label="Nom" value={firm?.name} required placeholder="TopStep" />
        <Text name="slug" label="Slug" value={firm?.slug} required placeholder="topstep" />
        <Select
          name="market_type"
          label="Marché"
          defaultValue={firm?.market_type ?? 'futures'}
          options={[
            { value: 'futures', label: 'Futures' },
            { value: 'forex', label: 'Forex' },
            { value: 'crypto', label: 'Crypto' },
          ]}
        />
        <Text name="founded_year" label="Année de création" value={firm?.founded_year} type="number" />
        <Text name="country" label="Pays" value={firm?.country} placeholder="US" />
        <Text name="hq_city" label="Ville (siège)" value={firm?.hq_city} placeholder="Chicago" />
        <Text name="logo_url" label="Logo URL" value={firm?.logo_url} type="url" />
      </Section>

      <Section title="Liens & affiliation">
        <Text name="website_url" label="Site web" value={firm?.website_url} type="url" />
        <Text name="discord_url" label="Discord" value={firm?.discord_url} type="url" />
        <Text name="support_url" label="Support" value={firm?.support_url} type="url" />
        <Text name="affiliate_url" label="Lien affilié" value={firm?.affiliate_url} type="url" />
        <Text name="default_url" label="Lien par défaut (fallback)" value={firm?.default_url} type="url" />
        <Text name="commission_note" label="Note commission (interne)" value={firm?.commission_note} />
        <Check name="affiliate_active" label="Affiliation active" checked={firm?.affiliate_active} />
      </Section>

      <Section title="Confiance">
        <Text name="trustpilot_rating" label="Note Trustpilot" value={firm?.trustpilot_rating} type="number" step="0.01" />
        <Text name="trustpilot_count" label="Avis Trustpilot" value={firm?.trustpilot_count} type="number" />
        <Text name="trustpilot_url" label="URL Trustpilot" value={firm?.trustpilot_url} type="url" />
        <Text name="health_score" label="Health score (0–100)" value={firm?.health_score} type="number" />
      </Section>

      <Section title="Règles firm">
        <Text name="max_funded_accounts" label="Comptes funded max" value={firm?.max_funded_accounts} type="number" />
        <Text name="max_eval_accounts" label="Comptes éval max" value={firm?.max_eval_accounts} type="number" />
        <Text name="inactivity_days" label="Inactivité (jours)" value={firm?.inactivity_days} type="number" />
        <Text
          name="restricted_countries"
          label="Pays restreints (séparés par virgule)"
          value={firm?.restricted_countries?.join(', ')}
          placeholder="US, CA"
        />
        <Check name="collects_eu_vat" label="Applique la TVA UE" checked={firm?.collects_eu_vat} />
      </Section>

      <Section title="Horaires">
        <Text name="daily_flat_time" label="Clôture forcée" value={firm?.daily_flat_time} placeholder="22:45 Europe/Paris" />
        <Check name="overnight_allowed" label="Overnight autorisé" checked={firm?.overnight_allowed} />
        <Check name="weekend_allowed" label="Weekend autorisé" checked={firm?.weekend_allowed} />
      </Section>

      <Section title="Publication">
        <Text name="sort_order" label="Ordre de tri" value={firm?.sort_order} type="number" />
        <Check name="is_active" label="Active" checked={firm?.is_active ?? true} />
        <Check name="is_published" label="Publiée (visible public)" checked={firm?.is_published} />
      </Section>

      <div className="flex items-center gap-3">
        <Button type="submit">{isEdit ? 'Enregistrer' : 'Créer la firm'}</Button>
        <Link href="/admin/firms" className={buttonClasses({ variant: 'ghost' })}>
          Annuler
        </Link>
      </div>
    </form>
  );
}
