'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, PencilLine, Upload, X, ChevronLeft } from 'lucide-react';
import Select from '@/components/ui/Select';
import { buttonClasses } from '@/components/ui/Button';
import EntryForms from './accounts/[id]/EntryForms';
import ImportTradesClient from './accounts/[id]/import/ImportTradesClient';

interface Acc {
  id: string;
  label: string;
  currency: string;
}

/**
 * Bouton « + Ajouter un trade » + modal (réf. Edgely). TOUT le système de saisie
 * vit dans le popup : on choisit le compte (si plusieurs) puis « Trade manuel »
 * ouvre le vrai formulaire `EntryForms` DANS le modal — pas de redirection avant
 * l'envoi. L'import CSV, plus lourd, ouvre sa page dédiée.
 */
export default function AddTradeModal({ accounts, today }: { accounts: Acc[]; today: string }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<'menu' | 'manual' | 'csv'>('menu');
  const [acc, setAcc] = useState(accounts[0]?.id ?? '');

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open]);

  function openModal() {
    setStep('menu');
    setAcc(accounts[0]?.id ?? '');
    setOpen(true);
  }

  const selected = accounts.find((a) => a.id === acc) ?? accounts[0];
  const target = selected?.id ?? '';

  return (
    <>
      <button type="button" className={buttonClasses()} onClick={openModal}>
        <Plus size={16} aria-hidden="true" />
        Ajouter un trade
      </button>

      {open ? (
        <div className="modal-overlay" onClick={() => setOpen(false)}>
          <div
            className={`modal lg-glass addtrade${step !== 'menu' ? ' addtrade--wide' : ''}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="addtrade-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                {step !== 'menu' ? (
                  <button type="button" className="addtrade-back" onClick={() => setStep('menu')}>
                    <ChevronLeft size={16} aria-hidden="true" /> Retour
                  </button>
                ) : null}
                <h2 className="modal-title" id="addtrade-title">
                  {step === 'csv' ? 'Importer un CSV' : 'Ajouter un trade'}
                </h2>
                <p className="addtrade-sub">
                  {step !== 'menu' && selected ? `Compte : ${selected.label}` : 'Choisis comment ajouter ton trade.'}
                </p>
              </div>
              <button type="button" className="modal-close" onClick={() => setOpen(false)} aria-label="Fermer">
                <X aria-hidden="true" />
              </button>
            </div>

            {accounts.length === 0 ? (
              <div className="addtrade-empty">
                <p>Ajoute d’abord un compte : un trade appartient toujours à un compte.</p>
                <Link href="/app/accounts/new" className={buttonClasses()} onClick={() => setOpen(false)}>
                  + Ajouter un compte
                </Link>
              </div>
            ) : step === 'manual' ? (
              <div className="addtrade-manual">
                <EntryForms accountId={target} currency={selected?.currency ?? 'USD'} today={today} defaultShowTags />
              </div>
            ) : step === 'csv' ? (
              <div className="addtrade-manual addtrade-csv">
                <ImportTradesClient accountId={target} currency={selected?.currency ?? 'USD'} />
              </div>
            ) : (
              <div className="addtrade-body">
                {accounts.length > 1 ? (
                  <div className="addtrade-acc">
                    <Select
                      label="Sur quel compte ?"
                      value={acc}
                      onChange={setAcc}
                      options={accounts.map((a) => ({ value: a.id, label: a.label }))}
                    />
                  </div>
                ) : null}

                <button type="button" className="addtrade-opt" onClick={() => setStep('manual')}>
                  <span className="addtrade-opt-ic"><PencilLine aria-hidden="true" /></span>
                  <span className="addtrade-opt-txt">
                    <span className="addtrade-opt-t">Trade manuel</span>
                    <span className="addtrade-opt-d">Saisie rapide (P&L du jour) ou trade détaillé — directement ici.</span>
                  </span>
                </button>

                <button type="button" className="addtrade-opt" onClick={() => setStep('csv')}>
                  <span className="addtrade-opt-ic"><Upload aria-hidden="true" /></span>
                  <span className="addtrade-opt-txt">
                    <span className="addtrade-opt-t">Importer un CSV</span>
                    <span className="addtrade-opt-d">Depuis Tradovate, NinjaTrader ou Rithmic — directement ici.</span>
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
