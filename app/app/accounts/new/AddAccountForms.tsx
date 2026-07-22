'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createAccount, createManualAccount } from '@/app/app/actions';
import Button, { buttonClasses } from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Tabs from '@/components/ui/Tabs';

export interface OfferOption {
  id: string;
  account_size: number;
  currency: string | null;
  drawdown_type: string;
  plan: { name: string; firm: { name: string } } | null;
}

/** Nom suggéré à partir d'une offre : « Topstep 50K — Éval ». */
function suggestLabel(o: OfferOption): string {
  const firm = o.plan?.firm?.name ?? 'Compte';
  const sizeK = Math.round(Number(o.account_size) / 1000);
  return `${firm} ${sizeK}K — Éval`;
}

export default function AddAccountForms({ offers }: { offers: OfferOption[] }) {
  const [path, setPath] = useState<'catalog' | 'manual'>('catalog');
  const [labelValue, setLabelValue] = useState('');
  const [offerId, setOfferId] = useState('');
  const catalog = path === 'catalog';

  const offerOptions = offers.map((o) => ({
    value: o.id,
    label: `${o.plan?.firm?.name ?? 'Autres'} · ${o.plan?.name} · ${Number(o.account_size).toLocaleString('fr-FR')} ${o.currency ?? 'USD'} · ${o.drawdown_type}`,
  }));

  function onOfferChange(id: string) {
    setOfferId(id);
    const o = offers.find((x) => x.id === id);
    if (o) setLabelValue(suggestLabel(o));
  }

  return (
    <div className="mt-6 flex flex-col gap-5 ds-form">
      <Tabs
        tabs={[
          { id: 'catalog', label: 'Choisir une offre du catalogue' },
          { id: 'manual', label: 'Ma firm n’est pas listée' },
        ]}
        active={path}
        onChange={(id) => setPath(id as 'catalog' | 'manual')}
        ariaLabel="Type de compte"
      />

      {catalog ? (
        offers.length === 0 ? (
          <div className="card empty">
            <p className="empty-title">Aucune offre publiée dans le comparateur pour l’instant.</p>
            <p className="empty-desc">Utilise « Ma firm n’est pas listée » pour saisir tes règles à la main.</p>
          </div>
        ) : (
          <form action={createAccount} className="card flex flex-col gap-4">
            <p style={{ color: 'var(--text-2)', fontSize: '.9rem', margin: 0 }}>
              Recommandé : les règles (drawdown, objectif, cohérence, payout) sont
              pré-remplies depuis l’offre.
            </p>
            <Select
              name="offer_id"
              label="Offre"
              required
              placeholder="Choisis une offre…"
              value={offerId}
              onChange={onOfferChange}
              options={offerOptions}
            />
            <Input
              id="label"
              name="label"
              label="Nom du compte"
              required
              value={labelValue}
              onChange={(e) => setLabelValue(e.target.value)}
              placeholder="Ex : Topstep 50K — Éval"
              hint="Choisis une offre pour pré-remplir un nom."
            />
            <div className="flex items-center gap-3">
              <Button type="submit">Ajouter le compte</Button>
              <Link href="/app" className={buttonClasses({ variant: 'ghost' })}>Annuler</Link>
            </div>
          </form>
        )
      ) : (
        <form action={createManualAccount} className="card flex flex-col gap-4">
          <p style={{ color: 'var(--text-2)', fontSize: '.9rem', margin: 0 }}>
            Saisis les règles de ta firm. Elles sont figées sur ce compte et le moteur les
            applique à l’identique.
          </p>

          <div className="jentry-grid">
            <Input id="firm_name" name="firm_name" label="Nom de la firm" required placeholder="Ex : Alpha Futures" />
            <Input id="label" name="label" label="Nom du compte" required placeholder="Ex : Alpha 50K — Éval" />
            <Input id="account_size" name="account_size" label="Taille du compte" type="number" step="0.01" required placeholder="50000" mono />
            <Input id="currency" name="currency" label="Devise" defaultValue="USD" />
            <Select
              name="drawdown_type"
              label="Type de drawdown *"
              defaultValue="EOD"
              options={[
                { value: 'EOD', label: 'EOD' },
                { value: 'TRAIL', label: 'TRAIL' },
                { value: 'STATIC', label: 'STATIC' },
              ]}
            />
            <Input id="drawdown_amount" name="drawdown_amount" label="Montant drawdown *" type="number" step="0.01" required placeholder="2000" mono />
            <Input id="profit_target" name="profit_target" label="Objectif de profit" type="number" step="0.01" placeholder="3000" mono />
            <Input id="daily_loss_limit" name="daily_loss_limit" label="Perte journalière max" type="number" step="0.01" placeholder="1000" mono />
            <Input id="consistency_pct" name="consistency_pct" label="Cohérence (%)" type="number" step="0.01" placeholder="50" mono />
            <Input id="min_trading_days" name="min_trading_days" label="Jours minimum" type="number" step="1" placeholder="1" mono />
          </div>

          <details className="jdetails">
            <summary>Règles de payout (optionnel)</summary>
            <div className="jentry-grid mt-3">
              <Input id="payout_buffer" name="payout_buffer" label="Buffer (solde min)" type="number" step="0.01" mono />
              <Input id="payout_min_amount" name="payout_min_amount" label="Retrait minimum" type="number" step="0.01" mono />
              <Input id="payout_min_days" name="payout_min_days" label="Jours de profit requis" type="number" step="1" mono />
              <Input id="payout_daily_threshold" name="payout_daily_threshold" label="Seuil journalier" type="number" step="0.01" mono />
              <Input id="funded_consistency_pct" name="funded_consistency_pct" label="Cohérence funded (%)" type="number" step="0.01" mono />
            </div>
          </details>

          <div className="flex items-center gap-3">
            <Button type="submit">Créer le compte</Button>
            <Link href="/app" className={buttonClasses({ variant: 'ghost' })}>Annuler</Link>
          </div>
        </form>
      )}
    </div>
  );
}
