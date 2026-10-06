'use client';

import { useState } from 'react';

/**
 * Code promo copiable en un clic (§6). La ligne entière est un <Link> : on
 * `stopPropagation` pour copier sans naviguer. `role=button` sur un <span> plutôt
 * qu'un <button> imbriqué dans le <a> (nesting invalide).
 */
export default function CopyCode({ code, label }: { code: string; label: string }) {
  const [copied, setCopied] = useState(false);

  const copy = (e: { preventDefault: () => void; stopPropagation: () => void }) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard
      ?.writeText(code)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1400);
      })
      .catch(() => {});
  };

  return (
    <span
      role="button"
      tabIndex={0}
      className={`term-copycode${copied ? ' is-copied' : ''}`}
      onClick={copy}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') copy(e);
      }}
      aria-label={`${label} : ${code}`}
      title={label}
    >
      <code>{code}</code>
      <svg className="term-copycode-ic term-copycode-ic--copy" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="9" y="9" width="11" height="11" rx="2" stroke="currentColor" strokeWidth="2" />
        <path d="M5 15V5a2 2 0 0 1 2-2h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <svg className="term-copycode-ic term-copycode-ic--done" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M5 12l4.5 4.5L19 7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}
