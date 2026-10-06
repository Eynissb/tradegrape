'use client';

/**
 * Liste de filtre en CASES À COCHER — même idiome que `SideFirms` (prop firm /
 * plateforme) mais sans logo : une ligne = case + libellé. Uniformise tous les
 * filtres du comparateur sur le système checkbox (réutilise les styles `.cmp-sidef`).
 *
 * `single` : comportement radio (une seule valeur active à la fois) pour les
 * filtres à valeur unique (split, fréquence) — la ligne cochée se décoche au reclic.
 */
export default function CheckList({
  items,
  selected,
  onToggle,
}: {
  items: { value: string; label: string }[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <div className="cmp-sidef-list cmp-checklist">
      {items.map((it) => {
        const on = selected.includes(it.value);
        return (
          <label key={it.value} className={`cmp-sidef${on ? ' is-on' : ''}`}>
            <input type="checkbox" checked={on} onChange={() => onToggle(it.value)} />
            <span className="cmp-sidef-box">
              <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2.5 8.5 6 12l7.5-8" /></svg>
            </span>
            <span className="cmp-sidef-name">{it.label}</span>
          </label>
        );
      })}
    </div>
  );
}
