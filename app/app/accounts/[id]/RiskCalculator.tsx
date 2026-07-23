'use client';

import { useState } from 'react';
import { Calculator } from 'lucide-react';
import CardTitle from '@/components/ui/CardTitle';
import Select from '@/components/ui/Select';
import Input from '@/components/ui/Input';
import { money } from '@/app/app/_components/journal-ui';
import { INSTRUMENT_LIST, INSTRUMENTS, computeRiskSizing, type RiskBudget } from '@/lib/journal/instruments';

/**
 * « Avec ton budget restant, tu peux prendre X contrats avec un stop de Y
 * ticks. » Le budget (min du daily loss restant et de la marge avant plancher)
 * est calculé côté serveur par `riskBudget` ; ici, seulement l'interaction et
 * l'appel au calcul pur `computeRiskSizing`.
 */
export default function RiskCalculator({
  budget,
  currency,
}: {
  budget: RiskBudget;
  currency: string;
}) {
  const [root, setRoot] = useState(INSTRUMENT_LIST[0].root);
  const [stop, setStop] = useState('');

  const instrument = INSTRUMENTS[root];
  const stopTicks = Number(stop.replace(',', '.'));
  const sizing =
    Number.isFinite(stopTicks) && stopTicks > 0
      ? computeRiskSizing({ budget: budget.amount, tickValue: instrument.tickValue, stopTicks })
      : null;

  const limitLabel =
    budget.limitedBy === 'daily' ? 'ta perte journalière restante' : 'ta marge avant le plancher';

  return (
    <div className="card jrisk">
      <CardTitle icon={Calculator}>Risque avant trade</CardTitle>

      <p className="jsub jrisk-budget">
        Budget de risque : <strong className="num">{money(budget.amount, currency)}</strong>
        <span className="jrisk-limit"> — borné par {limitLabel}</span>
      </p>

      <div className="jrisk-inputs">
        <Select
          label="Instrument"
          value={root}
          onChange={setRoot}
          width="md"
          options={INSTRUMENT_LIST.map((i) => ({
            value: i.root,
            label: `${i.root} · ${i.label}${i.micro ? ' (micro)' : ''}`,
          }))}
        />
        <Input
          id="stop_ticks"
          label="Stop (ticks)"
          type="number"
          min="1"
          step="1"
          width="sm"
          mono
          value={stop}
          onChange={(e) => setStop(e.target.value)}
          placeholder="ex : 40"
          hint={`1 tick = ${money(instrument.tickValue, currency)} / contrat`}
        />
      </div>

      {budget.amount <= 0 ? (
        <p className="jrisk-none">Aucun budget de risque : le compte n’a plus de marge. Ne prends pas ce trade.</p>
      ) : sizing ? (
        <div className="jrisk-out">
          <div className="jrisk-max">
            <span className="jrisk-max-k num">{sizing.maxContracts}</span>
            <span className="jrisk-max-l">contrat{sizing.maxContracts > 1 ? 's' : ''} maximum</span>
          </div>
          <p className="jsub">
            À {money(sizing.riskPerContract, currency)} de risque par contrat, tu engages{' '}
            <span className="num">{money(sizing.riskAtMax, currency)}</span> sur {money(budget.amount, currency)} disponibles.
            {sizing.maxContracts === 0 ? ' Un seul contrat dépasse déjà ton budget à ce stop.' : ''}
          </p>
        </div>
      ) : (
        <p className="jsub">Saisis un stop en ticks pour voir combien de contrats tu peux tenir.</p>
      )}
    </div>
  );
}
