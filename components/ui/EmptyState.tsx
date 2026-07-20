import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

export interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  /** Le CTA invite toujours à agir. */
  action?: ReactNode;
}

export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="empty">
      <div className="empty-icon lg-spec">
        <Icon aria-hidden="true" />
      </div>
      <h3 className="empty-title">{title}</h3>
      {description ? <p className="empty-desc">{description}</p> : null}
      {action}
    </div>
  );
}
