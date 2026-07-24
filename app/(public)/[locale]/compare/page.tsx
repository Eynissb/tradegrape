import { notFound } from 'next/navigation';
import ComparatorPage, { comparatorMetadata } from '@/app/(public)/_comparator/ComparatorPage';

/** Route canonique EN. Même implémentation, URL propre à la langue. */
export const revalidate = 3600;

/** Seul `/en/compare` existe : `/fr/compare` doit 404. */
export function generateStaticParams() {
  return [{ locale: 'en' }];
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (locale !== 'en') return {};
  return comparatorMetadata('en');
}

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (locale !== 'en') notFound();
  return <ComparatorPage locale="en" />;
}
