import LoginForm from '../LoginForm';

export const metadata = { title: 'Connexion — Tradegrape' };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string; redirect?: string }>;
}) {
  const { error, message, redirect } = await searchParams;
  return <LoginForm error={error} message={message} redirect={redirect} />;
}
