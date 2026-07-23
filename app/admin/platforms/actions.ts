'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { backWithError, bool, req, str } from '@/lib/admin/form';

export async function createPlatform(formData: FormData) {
  const slug = req(formData, 'slug').toLowerCase();
  const name = req(formData, 'name');
  if (!slug || !name) backWithError('/admin/platforms', 'Slug et nom obligatoires.');

  const supabase = await createClient();
  const { error } = await supabase.from('platforms').insert({
    slug,
    name,
    is_datafeed: bool(formData, 'is_datafeed'),
    website_url: str(formData, 'website_url'),
  });
  if (error) backWithError('/admin/platforms', error.message);

  revalidatePath('/admin/platforms');
  redirect('/admin/platforms?saved=1');
}

export async function deletePlatform(formData: FormData) {
  const id = str(formData, 'id');
  if (!id) redirect('/admin/platforms');

  const supabase = await createClient();
  const { error } = await supabase.from('platforms').delete().eq('id', id);
  if (error) backWithError('/admin/platforms', error.message);

  revalidatePath('/admin/platforms');
  redirect('/admin/platforms?saved=del');
}
