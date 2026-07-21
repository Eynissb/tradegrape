import type { LucideIcon } from 'lucide-react';

export type RuleTone = 'ok' | 'warn' | 'danger' | 'brand';

/** Bloc de règle façon « Goal Overview » : titre+icône, badge d'état, colonnes requis/actuel. */
export default function RuleBlock({
  icon: Icon,
  title,
  badge,
  cols,
}: {
  icon: LucideIcon;
  title: string;
  badge: { tone: RuleTone; label: string };
  cols: { label: string; value: string; color?: string }[];
}) {
  return (
    <div className="rule-block">
      <div className="rule-block-head">
        <span className="rule-ic" aria-hidden="true"><Icon /></span>
        <span className="rule-title">{title}</span>
        <span className={`rbadge is-${badge.tone}`}>{badge.label}</span>
      </div>
      <div className="rule-cols">
        {cols.map((c, i) => (
          <div key={i} className="rule-col">
            <span className="rule-col-l">{c.label}</span>
            <span className="rule-col-v" style={c.color ? { color: c.color } : undefined}>{c.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
