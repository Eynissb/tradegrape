/**
 * Catalogue des styles de trading évalués par firm (`firm_style_rules`).
 * Source unique partagée par l'admin (saisie) et le futur filtre comparateur
 * (« compatible avec mon style »). Le `rule_key` est libre en base, mais on
 * fige ici la liste qui alimente les filtres : ajouter un style = une ligne ici.
 */

export const STYLE_RULE_KEYS: readonly { key: string; label: string; help: string }[] = [
  { key: 'scalping', label: 'Scalping', help: 'Trades très courts, quelques ticks.' },
  { key: 'microscalping', label: 'Micro-scalping', help: 'Positions de quelques secondes.' },
  { key: 'bots', label: 'Bots / automatisation', help: 'Exécution algorithmique, semi-auto.' },
  { key: 'hft', label: 'HFT', help: 'Haute fréquence.' },
  { key: 'dca', label: 'DCA / moyenne à la baisse', help: 'Ajout sur position perdante.' },
  { key: 'news', label: 'Trading sur news', help: 'Positions autour des annonces éco.' },
  { key: 'bonds', label: 'Obligations (bonds)', help: 'ZB, ZN, ZF…' },
];

/** Positions possibles — l'enum DB `rule_stance`. Ordre = du plus permissif au plus strict. */
export const STANCES: readonly { value: string; label: string; tone: 'ok' | 'warn' | 'danger' }[] = [
  { value: 'allowed', label: 'Autorisé', tone: 'ok' },
  { value: 'monitored', label: 'Surveillé', tone: 'warn' },
  { value: 'restricted', label: 'Restreint', tone: 'warn' },
  { value: 'forbidden', label: 'Interdit', tone: 'danger' },
];

const STANCE_LABELS = new Map(STANCES.map((s) => [s.value, s.label]));
export function stanceLabel(value: string): string {
  return STANCE_LABELS.get(value) ?? value;
}
