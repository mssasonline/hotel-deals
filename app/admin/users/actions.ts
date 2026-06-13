'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase-admin';
import { createSupabaseServerClient } from '@/lib/supabase-server';

type Result = { error?: string; success?: boolean };

async function requireAdmin(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') throw new Error('Forbidden');
}

export async function generatePasswordResetLink(
  userId: string,
): Promise<{ link?: string; error?: string }> {
  try { await requireAdmin(); } catch (e) { return { error: (e as Error).message }; }

  const adminClient = createAdminClient();

  // Get the user's email from auth.users via admin API
  const { data: userData, error: userError } = await adminClient.auth.admin.getUserById(userId);
  if (userError || !userData.user?.email) {
    return { error: 'User not found or has no email' };
  }

  const { data, error } = await adminClient.auth.admin.generateLink({
    type: 'recovery',
    email: userData.user.email,
    options: { redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? ''}/reset-password` },
  });

  if (error) return { error: error.message };

  const link = (data as { properties?: { action_link?: string } })?.properties?.action_link;
  if (!link) return { error: 'Failed to generate link' };

  return { link };
}

export async function setUserStatus(
  userId: string,
  status: 'active' | 'suspended',
): Promise<Result> {
  try { await requireAdmin(); } catch (e) { return { error: (e as Error).message }; }

  const adminClient = createAdminClient();
  const { error } = await adminClient
    .from('profiles')
    .update({ status })
    .eq('id', userId)
    .eq('role', 'user');

  if (error) return { error: error.message };
  revalidatePath('/admin/users');
  return { success: true };
}
