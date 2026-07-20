import Link from 'next/link';
import FirmForm from '../FirmForm';

export const metadata = { title: 'Nouvelle firm — Admin Tradegrape' };

export default async function NewFirm({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="admin-page">
      <nav className="admin-crumb">
        <Link href="/admin/firms" className="link-accent">
          Firms
        </Link>{' '}
        / Nouvelle
      </nav>
      <h1 className="admin-h1">Nouvelle firm</h1>

      {error ? <div className="notice notice-error mt-4">{error}</div> : null}

      <div className="mt-6">
        <FirmForm />
      </div>
    </div>
  );
}
