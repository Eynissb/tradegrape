'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

/** Ne garde que les redirections internes, pour éviter les open redirects. */
function safeRedirect(value: FormDataEntryValue | null): string {
  const v = typeof value === 'string' ? value : '';
  return v.startsWith('/') && !v.startsWith('//') ? v : '/app';
}

export async function login(formData: FormData) {
  const email = String(formData.get('email') ?? '');
  const password = String(formData.get('password') ?? '');
  const next = safeRedirect(formData.get('redirect'));

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    const params = new URLSearchParams({ error: error.message, redirect: next });
    redirect(`/login?${params.toString()}`);
  }

  revalidatePath('/', 'layout');
  redirect(next);
}

export async function signup(formData: FormData) {
  const email = String(formData.get('email') ?? '');
  const password = String(formData.get('password') ?? '');

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) {
    const params = new URLSearchParams({ error: error.message });
    redirect(`/signup?${params.toString()}`);
  }

  // Selon la config Supabase, une confirmation par email peut être requise :
  // pas de session renvoyée → on renvoie vers /login avec un message.
  if (!data.session) {
    const params = new URLSearchParams({
      message: 'Compte créé — confirme ton adresse email pour te connecter.',
    });
    redirect(`/login?${params.toString()}`);
  }

  revalidatePath('/', 'layout');
  redirect('/app');
}

export async function signout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath('/', 'layout');
  redirect('/login');
}
