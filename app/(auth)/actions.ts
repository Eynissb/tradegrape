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
  const fullName = String(formData.get('full_name') ?? '').trim();
  const referral = String(formData.get('referral_code') ?? '').trim();
  const marketing = formData.get('marketing') != null;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    // Métadonnées utilisateur : nom, opt-in marketing, code de parrainage capté
    // (le système de parrainage n'existe pas encore — on stocke pour plus tard).
    options: { data: { full_name: fullName, marketing_opt_in: marketing, referral_code: referral || null } },
  });

  if (error) {
    const params = new URLSearchParams({ error: error.message });
    redirect(`/signup?${params.toString()}`);
  }

  // Si l'utilisateur a coché l'opt-in marketing, on l'ajoute aussi à la liste
  // d'alertes (best-effort : ignoré si la migration 0016 n'est pas encore appliquée).
  if (marketing && email) {
    await supabase.rpc('record_email_signup', { p_email: email, p_locale: 'fr', p_source: 'signup' });
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
