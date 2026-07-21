import Link from 'next/link';
import Button, { buttonClasses } from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Checkbox from '@/components/ui/Checkbox';
import UISelect from '@/components/ui/Select';
import { saveOffer } from './actions';

export interface OfferValues {
  id?: string;
  plan_id?: string | null;
  account_size?: number | null;
  price?: number | null;
  price_regular?: number | null;
  activation_fee?: number | null;
  is_recurring?: boolean | null;
  currency?: string | null;
  vat_included?: boolean | null;
  drawdown_type?: string | null;
  drawdown_amount?: number | null;
  profit_target?: number | null;
  daily_loss_limit?: number | null;
  consistency_pct?: number | null;
  min_trading_days?: number | null;
  max_minis?: number | null;
  max_micros?: number | null;
  funded_drawdown_type?: string | null;
  funded_daily_loss?: number | null;
  funded_consistency_pct?: number | null;
  funded_max_minis?: number | null;
  funded_max_micros?: number | null;
  profit_split?: number | null;
  payout_model?: string | null;
  payout_buffer?: number | null;
  payout_min_amount?: number | null;
  payout_frequency_days?: number | null;
  payout_min_days?: number | null;
  payout_daily_threshold?: number | null;
  payout_method?: string | null;
  platforms?: string[] | null;
  is_published?: boolean | null;
}

const DRAWDOWN = ['EOD', 'TRAIL', 'STATIC'] as const;
const PAYOUT_MODELS = [
  'fixed_cap',
  'pct_profit',
  'progressive',
  'buffer_then_free',
  'unlimited',
] as const;

function val(value: string | number | null | undefined): string {
  return value === null || value === undefined ? '' : String(value);
}

function Text({
  name,
  label,
  value,
  type = 'text',
  required = false,
  step,
  placeholder,
}: {
  name: string;
  label: string;
  value?: string | number | null;
  type?: string;
  required?: boolean;
  step?: string;
  placeholder?: string;
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
      defaultValue={val(value)}
    />
  );
}

function Select({
  name,
  label,
  value,
  options,
  allowEmpty = false,
}: {
  name: string;
  label: string;
  value?: string | null;
  options: readonly string[];
  allowEmpty?: boolean;
}) {
  return (
    <UISelect
      name={name}
      label={label}
      defaultValue={value ?? (allowEmpty ? '' : options[0])}
      options={[
        ...(allowEmpty ? [{ value: '', label: '—' }] : []),
        ...options.map((o) => ({ value: o, label: o })),
      ]}
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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="admin-section">
      <legend>{title}</legend>
      <div className="admin-grid">{children}</div>
    </fieldset>
  );
}

export default function OfferForm({
  offer,
  planId,
}: {
  offer?: OfferValues;
  planId?: string;
}) {
  const isEdit = !!offer?.id;
  const parentPlan = offer?.plan_id ?? planId ?? '';

  return (
    <form action={saveOffer} className="flex flex-col gap-6 ds-form-wide">
      {isEdit ? <input type="hidden" name="id" value={offer!.id} /> : null}
      <input type="hidden" name="plan_id" value={parentPlan} />

      <Section title="Taille & prix">
        <Text name="account_size" label="Taille de compte" value={offer?.account_size} type="number" step="0.01" required placeholder="50000" />
        <Text name="price" label="Prix" value={offer?.price} type="number" step="0.01" required placeholder="165" />
        <Text name="price_regular" label="Prix barré" value={offer?.price_regular} type="number" step="0.01" />
        <Text name="activation_fee" label="Frais d'activation" value={offer?.activation_fee} type="number" step="0.01" />
        <Text name="currency" label="Devise" value={offer?.currency ?? 'USD'} placeholder="USD" />
        <Check name="is_recurring" label="Abonnement récurrent" checked={offer?.is_recurring ?? true} />
        <Check name="vat_included" label="Prix TTC (TVA incluse)" checked={offer?.vat_included} />
      </Section>

      <Section title="Règles d'évaluation">
        <Select name="drawdown_type" label="Type de drawdown *" value={offer?.drawdown_type ?? 'EOD'} options={DRAWDOWN} />
        <Text name="drawdown_amount" label="Montant drawdown" value={offer?.drawdown_amount} type="number" step="0.01" required placeholder="2000" />
        <Text name="profit_target" label="Objectif de profit" value={offer?.profit_target} type="number" step="0.01" />
        <Text name="daily_loss_limit" label="Perte journalière max" value={offer?.daily_loss_limit} type="number" step="0.01" />
        <Text name="consistency_pct" label="Cohérence (%)" value={offer?.consistency_pct} type="number" step="0.01" />
        <Text name="min_trading_days" label="Jours de trading min" value={offer?.min_trading_days} type="number" />
        <Text name="max_minis" label="Contrats minis max" value={offer?.max_minis} type="number" />
        <Text name="max_micros" label="Contrats micros max" value={offer?.max_micros} type="number" />
      </Section>

      <Section title="Compte financé">
        <Select name="funded_drawdown_type" label="Drawdown funded" value={offer?.funded_drawdown_type} options={DRAWDOWN} allowEmpty />
        <Text name="funded_daily_loss" label="Perte journalière funded" value={offer?.funded_daily_loss} type="number" step="0.01" />
        <Text name="funded_consistency_pct" label="Cohérence funded (%)" value={offer?.funded_consistency_pct} type="number" step="0.01" />
        <Text name="funded_max_minis" label="Minis max (funded)" value={offer?.funded_max_minis} type="number" />
        <Text name="funded_max_micros" label="Micros max (funded)" value={offer?.funded_max_micros} type="number" />
        <Text name="profit_split" label="Profit split (%)" value={offer?.profit_split} type="number" step="0.01" placeholder="90" />
      </Section>

      <Section title="Payout">
        <Select name="payout_model" label="Modèle de payout" value={offer?.payout_model} options={PAYOUT_MODELS} allowEmpty />
        <Text name="payout_buffer" label="Buffer (solde min)" value={offer?.payout_buffer} type="number" step="0.01" />
        <Text name="payout_min_amount" label="Retrait minimum" value={offer?.payout_min_amount} type="number" step="0.01" />
        <Text name="payout_frequency_days" label="Fréquence (jours)" value={offer?.payout_frequency_days} type="number" />
        <Text name="payout_min_days" label="Jours de profit requis" value={offer?.payout_min_days} type="number" />
        <Text name="payout_daily_threshold" label="Seuil journalier" value={offer?.payout_daily_threshold} type="number" step="0.01" />
        <Text name="payout_method" label="Méthode de paiement" value={offer?.payout_method} placeholder="Rise, Workmarket…" />
      </Section>

      <Section title="Plateformes & publication">
        <Text name="platforms" label="Plateformes (slugs, séparés par virgule)" value={offer?.platforms?.join(', ')} placeholder="tradovate, ninjatrader" />
        <Check name="is_published" label="Publiée (visible public)" checked={offer?.is_published} />
      </Section>

      <div className="flex items-center gap-3">
        <Button type="submit">{isEdit ? 'Enregistrer' : 'Créer l’offre'}</Button>
        <Link
          href={parentPlan ? `/admin/plans/${parentPlan}` : '/admin/firms'}
          className={buttonClasses({ variant: 'ghost' })}
        >
          Annuler
        </Link>
      </div>
    </form>
  );
}
