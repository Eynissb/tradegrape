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
    // Neutre : le violet entrerait en conflit avec l'accent de marque, réservé
    // aux états actifs. Émotion et Erreur gardent leurs teintes sémantiques.
    key: 'setup',
    label: 'Setup',
    color: 'var(--ink3)',
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

/**
 * Catalogue des setups prédéfinis (famille 'setup'). Le playbook (B8) documente
 * ces setups et rien d'autre : une définition référence toujours l'un d'eux par
 * `tagKey`, ce qui garantit le lien vers la ventilation « Par setup ».
 * - `key`    : clé nue, ex "breakout" (utilisée dans l'URL /app/playbook/[setup])
 * - `tagKey` : clé de tag complète, ex "setup:breakout" (clé des buckets bySetup)
 */
export const SETUP_TAGS: readonly { key: string; label: string; tagKey: string }[] =
  (TAG_FAMILIES.find((f) => f.key === 'setup')?.tags ?? []).map((t) => ({
    key: t.key,
    label: t.label,
    tagKey: `setup:${t.key}`,
  }));

/** Vrai si `key` (nue) désigne un setup prédéfini. */
export function isSetupKey(key: string): boolean {
  return SETUP_TAGS.some((t) => t.key === key);
}
