import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { hideWorkoutTimerNotification, requestTimerPermissions } from '@/lib/workout-notification';
import { loadTimerEnabled, saveTimerEnabled } from '@/lib/storage';

type SettingsContextValue = {
  timerEnabled: boolean;
  setTimerEnabled: (enabled: boolean) => void;
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [timerEnabled, setTimerState] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const stored = await loadTimerEnabled();
      if (!cancelled) setTimerState(stored);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setTimerEnabled = useCallback((enabled: boolean) => {
    setTimerState(enabled);
    void saveTimerEnabled(enabled);
    if (enabled) {
      void requestTimerPermissions();
    } else {
      void hideWorkoutTimerNotification();
    }
  }, []);

  const value = useMemo(
    () => ({ timerEnabled, setTimerEnabled }),
    [timerEnabled, setTimerEnabled]
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) {
    throw new Error('useSettings must be used within SettingsProvider');
  }
  return ctx;
}
