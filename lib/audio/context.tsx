'use client';

import React from 'react';
import type { AudioSettings, AudioMode } from './settings';
import { loadSettings, saveSettings, DEFAULT_SETTINGS } from './settings';

export interface AudioContext2 {
  settings: AudioSettings;
  setMode: (mode: AudioMode) => void;
  setHpf: (enabled: boolean, cutoff?: number) => void;
  setGate: (enabled: boolean, threshold?: number, release?: number) => void;
  reset: () => void;
}

const Ctx = React.createContext<AudioContext2 | null>(null);

export function AudioSettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = React.useState<AudioSettings>(DEFAULT_SETTINGS);

  // load persisted settings on mount (client-side only)
  React.useEffect(() => {
    setSettings(loadSettings());
  }, []);

  // persist on every change
  React.useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  const value = React.useMemo<AudioContext2>(
    () => ({
      settings,
      setMode: (mode) => setSettings((s) => ({ ...s, mode })),
      setHpf: (enabled, cutoff) =>
        setSettings((s) => ({
          ...s,
          hpfEnabled: enabled,
          ...(cutoff !== undefined && { hpfCutoff: cutoff }),
        })),
      setGate: (enabled, threshold, release) =>
        setSettings((s) => ({
          ...s,
          gateEnabled: enabled,
          ...(threshold !== undefined && { gateThreshold: threshold }),
          ...(release !== undefined && { gateRelease: release }),
        })),
      reset: () => setSettings(DEFAULT_SETTINGS),
    }),
    [settings],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAudioSettings(): AudioContext2 {
  const ctx = React.useContext(Ctx);
  if (!ctx) throw new Error('useAudioSettings must be used within AudioSettingsProvider');
  return ctx;
}
