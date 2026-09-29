'use client';

import React from 'react';
import { useAudioSettings } from './context';
import type { AudioMode } from './settings';

const MODE_LABELS: Record<AudioMode, string> = {
  off: 'Off (raw mic)',
  krisp: 'Krisp (AI noise cancellation)',
  custom: 'Gate + High-pass (custom)',
};

export function AudioControls() {
  const { settings, setMode, setHpf, setGate, reset } = useAudioSettings();
  const [showAdvanced, setShowAdvanced] = React.useState(false);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        padding: '12px',
        borderRadius: '8px',
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.1)',
        marginTop: '8px',
        width: '100%',
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span style={{ fontSize: '13px', fontWeight: 600, opacity: 0.9 }}>
          Audio Processing
        </span>
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          style={{
            background: 'none',
            border: 'none',
            color: 'rgba(255,255,255,0.6)',
            cursor: 'pointer',
            fontSize: '12px',
            padding: '2px 6px',
          }}
        >
          {showAdvanced ? 'Hide' : 'Settings'}
        </button>
      </div>

      {/* mode selector */}
      <label
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
          fontSize: '12px',
          opacity: 0.9,
        }}
      >
        Mode
        <select
          value={settings.mode}
          onChange={(e) => setMode(e.target.value as AudioMode)}
          style={{
            background: 'rgba(255,255,255,0.1)',
            color: 'inherit',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: '4px',
            padding: '6px 8px',
            fontSize: '13px',
          }}
        >
          {(Object.keys(MODE_LABELS) as AudioMode[]).map((mode) => (
            <option key={mode} value={mode} style={{ color: '#000' }}>
              {MODE_LABELS[mode]}
            </option>
          ))}
        </select>
      </label>

      {showAdvanced && settings.mode === 'custom' && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            paddingTop: '8px',
            borderTop: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          {/* high-pass filter */}
          <div>
            <label
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '12px',
                opacity: 0.9,
                marginBottom: '4px',
              }}
            >
              <span>
                <input
                  type="checkbox"
                  checked={settings.hpfEnabled}
                  onChange={(e) => setHpf(e.target.checked)}
                  style={{ marginRight: '6px' }}
                />
                High-pass filter
              </span>
              <span style={{ opacity: 0.7 }}>{settings.hpfCutoff} Hz</span>
            </label>
            {settings.hpfEnabled && (
              <input
                type="range"
                min={20}
                max={500}
                step={10}
                value={settings.hpfCutoff}
                onChange={(e) => setHpf(true, Number(e.target.value))}
                style={{ width: '100%' }}
              />
            )}
          </div>

          {/* noise gate */}
          <div>
            <label
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '12px',
                opacity: 0.9,
                marginBottom: '4px',
              }}
            >
              <span>
                <input
                  type="checkbox"
                  checked={settings.gateEnabled}
                  onChange={(e) => setGate(e.target.checked)}
                  style={{ marginRight: '6px' }}
                />
                Noise gate
              </span>
              <span style={{ opacity: 0.7 }}>{settings.gateThreshold} dB</span>
            </label>
            {settings.gateEnabled && (
              <>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '11px',
                    opacity: 0.6,
                    marginBottom: '2px',
                  }}
                >
                  <span>Threshold</span>
                  <span>{settings.gateThreshold} dB</span>
                </div>
                <input
                  type="range"
                  min={-80}
                  max={0}
                  step={1}
                  value={settings.gateThreshold}
                  onChange={(e) => setGate(true, Number(e.target.value))}
                  style={{ width: '100%', marginBottom: '8px' }}
                />
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '11px',
                    opacity: 0.6,
                    marginBottom: '2px',
                  }}
                >
                  <span>Release</span>
                  <span>{settings.gateRelease} ms</span>
                </div>
                <input
                  type="range"
                  min={50}
                  max={2000}
                  step={50}
                  value={settings.gateRelease}
                  onChange={(e) => setGate(true, undefined, Number(e.target.value))}
                  style={{ width: '100%' }}
                />
              </>
            )}
          </div>

          <button
            onClick={reset}
            style={{
              background: 'none',
              border: '1px solid rgba(255,255,255,0.2)',
              color: 'rgba(255,255,255,0.6)',
              borderRadius: '4px',
              padding: '4px 8px',
              fontSize: '11px',
              cursor: 'pointer',
              alignSelf: 'flex-start',
            }}
          >
            Reset to defaults
          </button>
        </div>
      )}
    </div>
  );
}
