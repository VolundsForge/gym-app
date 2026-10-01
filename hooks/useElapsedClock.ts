import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { formatElapsedClock } from '@/lib/stats';

export function useElapsedClock(startedAt: string | undefined, enabled: boolean): string | null {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!enabled || !startedAt) return;

    const tick = () => setNow(Date.now());
    tick();
    const id = setInterval(tick, 1000);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') tick();
    });

    return () => {
      clearInterval(id);
      sub.remove();
    };
  }, [enabled, startedAt]);

  if (!enabled || !startedAt) return null;
  return formatElapsedClock(startedAt, now);
}
