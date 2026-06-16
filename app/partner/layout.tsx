import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export const metadata: Metadata = {
  title: 'Partner Portal — SelectedRoom',
  description: 'Hotel partner management dashboard for SelectedRoom.',
};

export default async function PartnerLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, status')
    .eq('id', user.id)
    .single();

  const role = profile?.role as string | undefined;
  if (role !== 'admin' && role !== 'partner') {
    redirect('/');
  }

  if ((profile as { status?: string } | null)?.status === 'suspended') {
    redirect('/suspended');
  }

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0">
        <TopBar />
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
