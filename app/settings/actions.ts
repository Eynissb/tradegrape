'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { bool, str } from '@/lib/admin/form';

const BASE = '/settings';
const LOCALES = ['fr', 'en'] as const;

function back(params: string): never {
  redirect(`${BASE}?${params}`);
}

/** Profil + préférences d'affichage + notifications. */
export async function saveProfile(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login?redirect=/settings');

  const displayName = str(formData, 'display_name');
  const locale = str(formData, 'locale');
  if (locale && !LOCALES.includes(locale as (typeof LOCALES)[number])) {
    back(`error=${encodeURIComponent('Langue invalide.')}`);
  }

  const { error } = await supabase
    .from('profiles')
    .update({
      display_name: displayName,
      locale: locale ?? 'fr',
      currency: str(formData, 'currency') ?? 'USD',
      date_format: str(formData, 'date_format') ?? 'DD/MM/YYYY',
      timezone: str(formData, 'timezone') ?? 'Europe/Paris',
      notif_rule_changes: bool(formData, 'notif_rule_changes'),
      notif_weekly: bool(formData, 'notif_weekly'),
    })
    .eq('id', user.id);
  if (error) back(`error=${encodeURIComponent(error.message)}`);

  revalidatePath(BASE);
  back('saved=profil');
}

/** Changement de mot de passe (self-service). */
export async function changePassword(formData: FormData) {
  const pw = str(formData, 'password');
  const confirm = str(formData, 'password_confirm');
  if (!pw || pw.length < 8) back(`error=${encodeURIComponent('Mot de passe : 8 caractères minimum.')}`);
  if (pw !== confirm) back(`error=${encodeURIComponent('Les mots de passe ne correspondent pas.')}`);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login?redirect=/settings');

  const { error } = await supabase.auth.updateUser({ password: pw! });
  if (error) back(`error=${encodeURIComponent(error.message)}`);
  back('saved=password');
}

/** Changement d'email (envoie un mail de confirmation via Supabase). */
export async function changeEmail(formData: FormData) {
  const email = str(formData, 'email');
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    back(`error=${encodeURIComponent('Adresse email invalide.')}`);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login?redirect=/settings');

  const { error } = await supabase.auth.updateUser({ email: email! });
  if (error) back(`error=${encodeURIComponent(error.message)}`);
  back('saved=email');
}
