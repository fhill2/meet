export type AudioMode = 'off' | 'krisp' | 'custom';

export interface AudioSettings {
  mode: AudioMode;
  hpfEnabled: boolean;
  hpfCutoff: number; // Hz (20-500)
  gateEnabled: boolean;
  gateThreshold: number; // dB (-80 to 0)
  gateRelease: number; // ms (50-2000)
  gateAttack: number; // ms (1-100)
}

export const DEFAULT_SETTINGS: AudioSettings = {
  mode: 'krisp',
  hpfEnabled: true,
  hpfCutoff: 80,
  gateEnabled: true,
  gateThreshold: -45,
  gateRelease: 200,
  gateAttack: 5,
};

const STORAGE_KEY = 'meet-audio-settings';

export function loadSettings(): AudioSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    // corrupted or unavailable
  }
  return DEFAULT_SETTINGS;
}

export function saveSettings(settings: AudioSettings): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // storage unavailable
  }
}
