import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

/** Titre de bloc avec icône en carré arrondi (signature visuelle du dashboard). */
export default function CardTitle({
  icon: Icon,
  children,
  right,
}: {
  icon: LucideIcon;
  children: ReactNode;
  right?: ReactNode;
}) {
  return (
    <div className="ctitle">
      <span className="ctitle-ic" aria-hidden="true"><Icon /></span>
      <h3 className="ctitle-h">{children}</h3>
      {right ? <span className="ctitle-right">{right}</span> : null}
    </div>
  );
}
