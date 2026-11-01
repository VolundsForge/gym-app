import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import type { GymBackup } from '@/lib/backup';
import { hideWorkoutTimerNotification, requestTimerPermissions } from '@/lib/workout-notification';
import {
  loadHasOpenedApp,
  loadProfile,
  loadProgressionNudgesEnabled,
  loadProgressionSessionThreshold,
  loadTimerEnabled,
  loadWeightUnit,
  saveHasOpenedApp,
  saveProfile,
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
  displayName: string;
  setDisplayName: (name: string) => void;
  openedAppBefore: boolean;
  timerEnabled: boolean;
  setTimerEnabled: (enabled: boolean) => void;
  weightUnit: WeightUnit;
  setWeightUnit: (unit: WeightUnit) => void;
  progressionNudgesEnabled: boolean;
  setProgressionNudgesEnabled: (enabled: boolean) => void;
  progressionSessionThreshold: number;
  setProgressionSessionThreshold: (value: number) => void;
  restoreFromBackup: (backup: GymBackup) => Promise<void>;
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

/** Stays false for the first session even after we persist that the app has been opened. */
let openedAppThisSession = false;

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [displayName, setDisplayNameState] = useState('');
  const [openedAppBefore, setOpenedAppBefore] = useState(false);
  const [timerEnabled, setTimerState] = useState(false);
  const [weightUnit, setWeightUnitState] = useState<WeightUnit>('kg');
  const [progressionNudgesEnabled, setProgressionNudgesState] = useState(true);
  const [progressionSessionThreshold, setProgressionThresholdState] = useState(
    PROGRESSION_SESSION_THRESHOLD
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [
        storedProfile,
        storedOpened,
        storedTimer,
        storedUnit,
        storedNudges,
        storedThreshold,
      ] = await Promise.all([
        loadProfile(),
        loadHasOpenedApp(),
        loadTimerEnabled(),
        loadWeightUnit(),
        loadProgressionNudgesEnabled(),
        loadProgressionSessionThreshold(),
      ]);
      if (cancelled) return;
      setDisplayNameState(storedProfile.name);
      setOpenedAppBefore(storedOpened && !openedAppThisSession);
      openedAppThisSession = true;
      if (!storedOpened) {
        void saveHasOpenedApp();
      }
      setTimerState(storedTimer);
      setWeightUnitState(storedUnit);
      setProgressionNudgesState(storedNudges);
      setProgressionThresholdState(storedThreshold);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setDisplayName = useCallback((name: string) => {
    const next = name.trim();
    setDisplayNameState(next);
    void saveProfile({ name: next });
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

  const restoreFromBackup = useCallback(async (backup: GymBackup) => {
    const name = backup.profile.name.trim();
    const threshold = clampProgressionThreshold(
      backup.settings.progressionSessionThreshold
    );
    setDisplayNameState(name);
    setTimerState(backup.settings.timerEnabled);
    setWeightUnitState(backup.settings.weightUnit);
    setProgressionNudgesState(backup.settings.progressionNudgesEnabled);
    setProgressionThresholdState(threshold);
    setOpenedAppBefore(true);
    await Promise.all([
      saveProfile({ name }),
      saveTimerEnabled(backup.settings.timerEnabled),
      saveWeightUnit(backup.settings.weightUnit),
      saveProgressionNudgesEnabled(backup.settings.progressionNudgesEnabled),
      saveProgressionSessionThreshold(threshold),
      saveHasOpenedApp(),
    ]);
  }, []);

  const value = useMemo(
    () => ({
      displayName,
      setDisplayName,
      openedAppBefore,
      timerEnabled,
      setTimerEnabled,
      weightUnit,
      setWeightUnit,
      progressionNudgesEnabled,
      setProgressionNudgesEnabled,
      progressionSessionThreshold,
      setProgressionSessionThreshold,
      restoreFromBackup,
    }),
    [
      displayName,
      setDisplayName,
      openedAppBefore,
      timerEnabled,
      setTimerEnabled,
      weightUnit,
      setWeightUnit,
      progressionNudgesEnabled,
      setProgressionNudgesEnabled,
      progressionSessionThreshold,
      setProgressionSessionThreshold,
      restoreFromBackup,
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
