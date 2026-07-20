'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createAccount, createManualAccount } from '@/app/app/actions';

export interface OfferOption {
  id: string;
  account_size: number;
  currency: string | null;
  drawdown_type: string;
  plan: { name: string; firm: { name: string } } | null;
}

export default function AddAccountForms({ offers }: { offers: OfferOption[] }) {
  const [path, setPath] = useState<'catalog' | 'manual'>('catalog');
  const catalog = path === 'catalog';

  // Regroupe les offres par firm pour l'optgroup.
  const byFirm = new Map<string, OfferOption[]>();
  for (const o of offers) {
    const firm = o.plan?.firm?.name ?? 'Autres';
    const list = byFirm.get(firm) ?? [];
    list.push(o);
    byFirm.set(firm, list);
  }

  return (
    <div className="mt-6">
      <div className="jentry-tabs">
        <button
          type="button"
          className={catalog ? 'is-active' : ''}
          onClick={() => setPath('catalog')}
        >
          Choisir une offre du catalogue
        </button>
        <button
          type="button"
          className={!catalog ? 'is-active' : ''}
          onClick={() => setPath('manual')}
        >
          Ma firm n’est pas listée
        </button>
      </div>

      {catalog ? (
        offers.length === 0 ? (
          <div className="glass jempty mt-5">
            <p>Aucune offre publiée dans le comparateur pour l’instant.</p>
            <p className="jsub mt-2">
              Utilise « Ma firm n’est pas listée » pour saisir tes règles à la main.
            </p>
          </div>
        ) : (
          <form action={createAccount} className="glass jform mt-5">
            <p className="jsub" style={{ marginTop: -2 }}>
              Recommandé : les règles (drawdown, objectif, cohérence, payout) sont
              pré-remplies depuis l’offre.
            </p>
            <div className="field">
              <label htmlFor="offer_id">Offre</label>
              <select className="input" id="offer_id" name="offer_id" required defaultValue="">
                <option value="" disabled>
                  Choisis une offre…
                </option>
                {[...byFirm.entries()].map(([firm, list]) => (
                  <optgroup key={firm} label={firm}>
                    {list.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.plan?.name} · {Number(o.account_size).toLocaleString('fr-FR')}{' '}
                        {o.currency ?? 'USD'} · {o.drawdown_type}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="label">Libellé (optionnel)</label>
              <input className="input" id="label" name="label" placeholder="Mon éval Topstep #2" />
            </div>
            <div className="flex items-center gap-3">
              <button type="submit" className="btn-grad">
                Ajouter le compte
              </button>
              <Link href="/app" className="btn-ghost">
                Annuler
              </Link>
            </div>
          </form>
        )
      ) : (
        <form action={createManualAccount} className="glass jform mt-5">
          <p className="jsub" style={{ marginTop: -2 }}>
            Saisis les règles de ta firm. Elles sont figées sur ce compte et le moteur les
            applique à l’identique.
          </p>

          <div className="jentry-grid">
            <div className="field">
              <label htmlFor="firm_name">Nom de la firm *</label>
              <input className="input" id="firm_name" name="firm_name" required placeholder="Ex : Alpha Futures" />
            </div>
            <div className="field">
              <label htmlFor="label">Libellé (optionnel)</label>
              <input className="input" id="label" name="label" placeholder="Mon éval #1" />
            </div>
            <div className="field">
              <label htmlFor="account_size">Taille du compte *</label>
              <input className="input" id="account_size" name="account_size" type="number" step="0.01" required placeholder="50000" />
            </div>
            <div className="field">
              <label htmlFor="currency">Devise</label>
              <input className="input" id="currency" name="currency" defaultValue="USD" />
            </div>
            <div className="field">
              <label htmlFor="drawdown_type">Type de drawdown *</label>
              <select className="input" id="drawdown_type" name="drawdown_type" defaultValue="EOD">
                <option value="EOD">EOD</option>
                <option value="TRAIL">TRAIL</option>
                <option value="STATIC">STATIC</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="drawdown_amount">Montant drawdown *</label>
              <input className="input" id="drawdown_amount" name="drawdown_amount" type="number" step="0.01" required placeholder="2000" />
            </div>
            <div className="field">
              <label htmlFor="profit_target">Objectif de profit</label>
              <input className="input" id="profit_target" name="profit_target" type="number" step="0.01" placeholder="3000" />
            </div>
            <div className="field">
              <label htmlFor="daily_loss_limit">Perte journalière max</label>
              <input className="input" id="daily_loss_limit" name="daily_loss_limit" type="number" step="0.01" placeholder="1000" />
            </div>
            <div className="field">
              <label htmlFor="consistency_pct">Cohérence (%)</label>
              <input className="input" id="consistency_pct" name="consistency_pct" type="number" step="0.01" placeholder="50" />
            </div>
            <div className="field">
              <label htmlFor="min_trading_days">Jours minimum</label>
              <input className="input" id="min_trading_days" name="min_trading_days" type="number" step="1" placeholder="1" />
            </div>
          </div>

          <details className="jdetails">
            <summary>Règles de payout (optionnel)</summary>
            <div className="jentry-grid mt-3">
              <div className="field">
                <label htmlFor="payout_buffer">Buffer (solde min)</label>
                <input className="input" id="payout_buffer" name="payout_buffer" type="number" step="0.01" />
              </div>
              <div className="field">
                <label htmlFor="payout_min_amount">Retrait minimum</label>
                <input className="input" id="payout_min_amount" name="payout_min_amount" type="number" step="0.01" />
              </div>
              <div className="field">
                <label htmlFor="payout_min_days">Jours de profit requis</label>
                <input className="input" id="payout_min_days" name="payout_min_days" type="number" step="1" />
              </div>
              <div className="field">
                <label htmlFor="payout_daily_threshold">Seuil journalier</label>
                <input className="input" id="payout_daily_threshold" name="payout_daily_threshold" type="number" step="0.01" />
              </div>
              <div className="field">
                <label htmlFor="funded_consistency_pct">Cohérence funded (%)</label>
                <input className="input" id="funded_consistency_pct" name="funded_consistency_pct" type="number" step="0.01" />
              </div>
            </div>
          </details>

          <div className="flex items-center gap-3">
            <button type="submit" className="btn-grad">
              Créer le compte
            </button>
            <Link href="/app" className="btn-ghost">
              Annuler
            </Link>
          </div>
        </form>
      )}
    </div>
  );
}
