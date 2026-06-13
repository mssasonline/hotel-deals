'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/authContext';
import { supabase } from '@/lib/supabase';
import { saveLoginRedirect } from '@/lib/auth';

interface Props {
  hotelId: number;
  initialFavorited?: boolean;
  onUnfavorite?: () => void;
}

export default function FavoriteButton({ hotelId, initialFavorited, onUnfavorite }: Props) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [isFavorited, setIsFavorited] = useState(initialFavorited ?? false);
  const [toggling, setToggling] = useState(false);
  const [ready, setReady] = useState(initialFavorited !== undefined);

  useEffect(() => {
    if (initialFavorited !== undefined) return;
    if (loading) return;
    if (!user) {
      setReady(true);
      return;
    }
    supabase
      .from('favorites')
      .select('hotel_id')
      .eq('user_id', user.id)
      .eq('hotel_id', hotelId)
      .maybeSingle()
      .then(({ data }) => {
        setIsFavorited(!!data);
        setReady(true);
      });
  }, [user, loading, hotelId, initialFavorited]);

  if (!ready) return <div className="w-8 h-8" />;

  async function handleToggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      saveLoginRedirect(window.location.pathname);
      router.push('/login');
      return;
    }

    if (toggling) return;
    setToggling(true);

    if (isFavorited) {
      const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('user_id', user.id)
        .eq('hotel_id', hotelId);
      if (!error) {
        setIsFavorited(false);
        onUnfavorite?.();
      }
    } else {
      const { error } = await supabase
        .from('favorites')
        .upsert(
          { user_id: user.id, hotel_id: hotelId },
          { onConflict: 'user_id,hotel_id' }
        );
      if (!error) setIsFavorited(true);
    }

    setToggling(false);
  }

  return (
    <button
      onClick={handleToggle}
      disabled={toggling}
      aria-label={isFavorited ? 'Remove from favorites' : 'Save to favorites'}
      className="w-8 h-8 rounded-full bg-white/90 hover:bg-white flex items-center justify-center shadow-sm transition-all duration-150 disabled:opacity-60"
    >
      {isFavorited ? (
        <svg className="w-4 h-4 text-red-500" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
        </svg>
      ) : (
        <svg className="w-4 h-4 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
        </svg>
      )}
    </button>
  );
}
