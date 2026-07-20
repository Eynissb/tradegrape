'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface PaginationProps {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
  siblingCount?: number;
}

/** Construit la liste de pages avec ellipses ("…"). */
function buildRange(page: number, total: number, sibling: number): (number | 'dots')[] {
  const range: (number | 'dots')[] = [];
  const first = 1;
  const last = total;
  const left = Math.max(first, page - sibling);
  const right = Math.min(last, page + sibling);

  range.push(first);
  if (left > first + 1) range.push('dots');
  for (let p = left; p <= right; p++) {
    if (p !== first && p !== last) range.push(p);
  }
  if (right < last - 1) range.push('dots');
  if (last !== first) range.push(last);
  return range;
}

export default function Pagination({
  page,
  totalPages,
  onChange,
  siblingCount = 1,
}: PaginationProps) {
  if (totalPages <= 1) return null;
  const pages = buildRange(page, totalPages, siblingCount);

  return (
    <nav className="pagination" aria-label="Pagination">
      <button
        type="button"
        className="page-btn"
        aria-label="Page précédente"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
      >
        <ChevronLeft aria-hidden="true" />
      </button>
      {pages.map((p, i) =>
        p === 'dots' ? (
          <span key={`dots-${i}`} className="page-ellipsis" aria-hidden="true">
            …
          </span>
        ) : (
          <button
            key={p}
            type="button"
            className={cn('page-btn')}
            aria-current={p === page ? 'page' : undefined}
            onClick={() => onChange(p)}
          >
            {p}
          </button>
        ),
      )}
      <button
        type="button"
        className="page-btn"
        aria-label="Page suivante"
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
      >
        <ChevronRight aria-hidden="true" />
      </button>
    </nav>
  );
}
