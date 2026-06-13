import { supabase } from './supabase';

export async function createNotification(
  user_id: string,
  title: string,
  message: string
): Promise<void> {
  await supabase.from('notifications').insert({ user_id, title, message });
}
