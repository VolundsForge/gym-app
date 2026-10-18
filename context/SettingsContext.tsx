import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { hideWorkoutTimerNotification, requestTimerPermissions } from '@/lib/workout-notification';
import {
  loadProgressionNudgesEnabled,
  loadProgressionSessionThreshold,
  loadTimerEnabled,
  loadWeightUnit,
  saveProgressionNudgesEnabled,
  saveProgressionSessionThreshold,
  saveTimerEnabled,
  saveWeightUnit,
} from '@/lib/storage';
import {
  clampProgressionThreshold,
  PROGRESSION_SESSION_THRESHOLD,
} from '@/lib/suggestions';
import type { WeightUnit } from '@/lib/weight';

type SettingsContextValue = {
  timerEnabled: boolean;
  setTimerEnabled: (enabled: boolean) => void;
  weightUnit: WeightUnit;
  setWeightUnit: (unit: WeightUnit) => void;
  progressionNudgesEnabled: boolean;
  setProgressionNudgesEnabled: (enabled: boolean) => void;
  progressionSessionThreshold: number;
  setProgressionSessionThreshold: (value: number) => void;
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [timerEnabled, setTimerState] = useState(false);
  const [weightUnit, setWeightUnitState] = useState<WeightUnit>('kg');
  const [progressionNudgesEnabled, setProgressionNudgesState] = useState(true);
  const [progressionSessionThreshold, setProgressionThresholdState] = useState(
    PROGRESSION_SESSION_THRESHOLD
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [storedTimer, storedUnit, storedNudges, storedThreshold] =
        await Promise.all([
          loadTimerEnabled(),
          loadWeightUnit(),
          loadProgressionNudgesEnabled(),
          loadProgressionSessionThreshold(),
        ]);
      if (cancelled) return;
      setTimerState(storedTimer);
      setWeightUnitState(storedUnit);
      setProgressionNudgesState(storedNudges);
      setProgressionThresholdState(storedThreshold);
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

  const setWeightUnit = useCallback((unit: WeightUnit) => {
    setWeightUnitState(unit);
    void saveWeightUnit(unit);
  }, []);

  const setProgressionNudgesEnabled = useCallback((enabled: boolean) => {
    setProgressionNudgesState(enabled);
    void saveProgressionNudgesEnabled(enabled);
  }, []);

  const setProgressionSessionThreshold = useCallback((value: number) => {
    const next = clampProgressionThreshold(value);
    setProgressionThresholdState(next);
    void saveProgressionSessionThreshold(next);
  }, []);

  const value = useMemo(
    () => ({
      timerEnabled,
      setTimerEnabled,
      weightUnit,
      setWeightUnit,
      progressionNudgesEnabled,
      setProgressionNudgesEnabled,
      progressionSessionThreshold,
      setProgressionSessionThreshold,
    }),
    [
      timerEnabled,
      setTimerEnabled,
      weightUnit,
      setWeightUnit,
      progressionNudgesEnabled,
      setProgressionNudgesEnabled,
      progressionSessionThreshold,
      setProgressionSessionThreshold,
    ]
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
