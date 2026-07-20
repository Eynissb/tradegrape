import { redirect } from 'next/navigation';

/* Helpers de parsing formData → types DB, partagés par les server actions admin. */

export function str(fd: FormData, key: string): string | null {
  const val = fd.get(key);
  const s = typeof val === 'string' ? val.trim() : '';
  return s === '' ? null : s;
}

export function req(fd: FormData, key: string): string {
  return str(fd, key) ?? '';
}

export function num(fd: FormData, key: string): number | null {
  const s = str(fd, key);
  if (s === null) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export function bool(fd: FormData, key: string): boolean {
  return fd.get(key) === 'on';
}

export function arr(
  fd: FormData,
  key: string,
  { upper = false }: { upper?: boolean } = {},
): string[] {
  const s = str(fd, key);
  if (s === null) return [];
  return s
    .split(',')
    .map((x) => (upper ? x.trim().toUpperCase() : x.trim()))
    .filter(Boolean);
}

/** Redirige vers `basePath` en propageant un message d'erreur lisible. */
export function backWithError(basePath: string, message: string): never {
  const sep = basePath.includes('?') ? '&' : '?';
  redirect(`${basePath}${sep}error=${encodeURIComponent(message)}`);
}
