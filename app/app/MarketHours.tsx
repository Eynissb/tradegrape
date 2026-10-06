'use client';

import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';

/**
 * Widget « Horaires des marchés » — horloge live des grandes places (réf. Edgely).
 * Calculé côté client depuis l'horloge, fuseaux réels ; ouvert/fermé selon l'heure
 * locale de chaque place et les jours ouvrés. Rien de figé ni de faux.
 */
const MARKETS: { name: string; tz: string; open: [number, number]; close: [number, number] }[] = [
  { name: 'New York', tz: 'America/New_York', open: [9, 30], close: [16, 0] },
  { name: 'Londres', tz: 'Europe/London', open: [8, 0], close: [16, 30] },
  { name: 'Francfort', tz: 'Europe/Berlin', open: [9, 0], close: [17, 30] },
  { name: 'Tokyo', tz: 'Asia/Tokyo', open: [9, 0], close: [15, 0] },
];

const f2 = (n: number): string => (n < 10 ? `0${n}` : `${n}`);
const hhmm = (t: [number, number]): string => `${f2(t[0])}:${f2(t[1])}`;

function partsInTz(tz: string): { min: number; label: string; weekend: boolean } {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: tz,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    weekday: 'short',
  }).formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  let h = parseInt(get('hour'), 10);
  if (h === 24) h = 0; // certains environnements renvoient « 24 » à minuit
  const m = parseInt(get('minute'), 10);
  const wd = get('weekday');
  return { min: h * 60 + m, label: `${f2(h)}:${f2(m)}`, weekend: wd === 'Sat' || wd === 'Sun' };
}

export default function MarketHours() {
  const [mounted, setMounted] = useState(false);
  const [, setTick] = useState(0);

  useEffect(() => {
    setMounted(true);
    const id = setInterval(() => setTick((t) => t + 1), 15000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="card mkt">
      <div className="mkt-head">
        <Clock aria-hidden="true" />
        <span>Horaires des marchés</span>
      </div>
      <div className="mkt-list">
        {MARKETS.map((mk) => {
          const p = mounted ? partsInTz(mk.tz) : null;
          const openMin = mk.open[0] * 60 + mk.open[1];
          const closeMin = mk.close[0] * 60 + mk.close[1];
          const open = p ? !p.weekend && p.min >= openMin && p.min < closeMin : false;
          return (
            <div key={mk.name} className="mkt-item">
              <span className={`mkt-dot${open ? ' is-open' : ''}`} />
              <span className="mkt-name">{mk.name}</span>
              <span className="mkt-time num">{p ? p.label : '—'}</span>
              <span className={`mkt-status${open ? ' is-open' : ''}`}>{!mounted ? '' : open ? 'Ouvert' : 'Fermé'}</span>
              <span className="mkt-sub">{!mounted ? '' : open ? `Ferme ${hhmm(mk.close)}` : `Ouvre ${hhmm(mk.open)}`}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
