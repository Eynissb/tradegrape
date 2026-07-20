/**
 * Tags prédéfinis du journal, en 3 familles (setup, émotion, erreur).
 * Stockés dans `trades.tags` sous la forme "famille:clé".
 */

export interface TagFamily {
  key: 'setup' | 'emotion' | 'erreur';
  label: string;
  color: string; // variable CSS d'accent pour la famille
  tags: { key: string; label: string }[];
}

export const TAG_FAMILIES: readonly TagFamily[] = [
  {
    key: 'setup',
    label: 'Setup',
    color: 'var(--c2)',
    tags: [
      { key: 'breakout', label: 'Breakout' },
      { key: 'pullback', label: 'Pullback' },
      { key: 'range', label: 'Range' },
      { key: 'reversal', label: 'Reversal' },
      { key: 'trend', label: 'Suivi de tendance' },
      { key: 'news', label: 'News' },
      { key: 'scalp', label: 'Scalp' },
    ],
  },
  {
    key: 'emotion',
    label: 'Émotion',
    color: 'var(--amber)',
    tags: [
      { key: 'discipline', label: 'Discipliné' },
      { key: 'confiant', label: 'Confiant' },
      { key: 'hesitation', label: 'Hésitation' },
      { key: 'fomo', label: 'FOMO' },
      { key: 'revenge', label: 'Revenge trade' },
      { key: 'stresse', label: 'Stressé' },
    ],
  },
  {
    key: 'erreur',
    label: 'Erreur',
    color: 'var(--red)',
    tags: [
      { key: 'sans_stop', label: 'Sans stop' },
      { key: 'surtrading', label: 'Sur-trading' },
      { key: 'taille', label: 'Taille trop grosse' },
      { key: 'contre_tendance', label: 'Contre-tendance' },
      { key: 'sortie_tot', label: 'Sortie trop tôt' },
      { key: 'plan_non_suivi', label: 'Plan non suivi' },
    ],
  },
];

const TAG_LABELS = new Map<string, string>(
  TAG_FAMILIES.flatMap((f) =>
    f.tags.map((t) => [`${f.key}:${t.key}`, t.label] as const),
  ),
);

/** Libellé lisible d'un tag "famille:clé", ou la valeur brute en repli. */
export function tagLabel(value: string): string {
  return TAG_LABELS.get(value) ?? value;
}
