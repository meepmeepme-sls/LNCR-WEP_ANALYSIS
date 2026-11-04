import { useState, useEffect } from 'react';

const STORAGE_KEY = 'lncr_wep_page_views_v1';
const GLOBAL_COUNTER_API = 'https://countapi.mileshilliard.com/api/v1/hit/lncr_combat_robotics_wep_v1';
const DEFAULT_INITIAL_VIEWS = 1;

export function usePageViews() {
  const [views, setViews] = useState<number>(() => {
    if (typeof window === 'undefined') return DEFAULT_INITIAL_VIEWS;
    try {
      // Clear legacy demo view key if present
      const old = localStorage.getItem('lncr_page_views');
      if (old && parseInt(old, 10) >= 40000) {
        localStorage.removeItem('lncr_page_views');
      }
    } catch {}

    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return DEFAULT_INITIAL_VIEWS;
    const parsed = parseInt(saved, 10);
    return isNaN(parsed) || parsed >= 40000 ? DEFAULT_INITIAL_VIEWS : parsed;
  });
  const [isCloudflare, setIsCloudflare] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let mounted = true;

    async function recordPageView() {
      // 1. Attempt Cloudflare Pages Function endpoint
      try {
        const res = await fetch('/api/views', {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });

        if (res.ok) {
          const data = await res.json();
          if (data && typeof data.count === 'number' && mounted) {
            if ((data.source === 'cloudflare-kv' || data.source === 'global-shared') && data.count < 40000) {
              setViews(data.count);
              setIsCloudflare(data.source === 'cloudflare-kv');
              localStorage.setItem(STORAGE_KEY, data.count.toString());
              setLoading(false);
              return;
            }
          }
        }
      } catch {
        // Fall through to direct global counter
      }

      // 2. Direct Global Counter fallback: ensures real-time global total across all users even without Cloudflare KV
      try {
        const globalRes = await fetch(GLOBAL_COUNTER_API, {
          method: 'GET',
        });

        if (globalRes.ok) {
          const gData = await globalRes.json();
          if (gData && typeof gData.value === 'number' && mounted) {
            setViews(gData.value);
            setIsCloudflare(false);
            localStorage.setItem(STORAGE_KEY, gData.value.toString());
            setLoading(false);
            return;
          }
        }
      } catch {
        // Fall through to offline local increment
      }

      // 3. Local fallback increment only when completely offline
      if (mounted) {
        const localCurrent = parseInt(localStorage.getItem(STORAGE_KEY) || '0', 10);
        const incremented = (isNaN(localCurrent) || localCurrent >= 40000 ? 0 : localCurrent) + 1;
        setViews(incremented);
        localStorage.setItem(STORAGE_KEY, incremented.toString());
        setLoading(false);
      }
    }

    recordPageView();

    return () => {
      mounted = false;
    };
  }, []);

  // Format count to 6 digits with leading zeros for the retro odometer display
  const formattedDigits = views.toString().padStart(6, '0').slice(-6).split('');

  return {
    views,
    formattedDigits,
    isCloudflare,
    loading,
  };
}
