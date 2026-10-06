import SignupForm from '../SignupForm';

export const metadata = { title: 'Créer un compte — Tradegrape' };

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return <SignupForm error={error} />;
}
