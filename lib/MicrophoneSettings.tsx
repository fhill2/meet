import React from 'react';
import { useKrispNoiseFilter } from '@livekit/components-react/krisp';
import { TrackToggle } from '@livekit/components-react';
import { MediaDeviceMenu } from '@livekit/components-react';
import { Track } from 'livekit-client';
import { isLowPowerDevice } from './client-utils';
import { useAudioSettings } from './audio/context';
import { AudioControls } from './audio/AudioControls';

export function MicrophoneSettings() {
  const { isNoiseFilterEnabled, setNoiseFilterEnabled, isNoiseFilterPending } = useKrispNoiseFilter(
    {
      filterOptions: {
        bufferOverflowMs: 100,
        bufferDropMs: 200,
        quality: isLowPowerDevice() ? 'low' : 'medium',
        onBufferDrop: () => {
          console.warn(
            'krisp buffer dropped, noise filter versions >= 0.3.2 will automatically disable the filter',
          );
        },
      },
    },
  );

  const { settings, setMode } = useAudioSettings();

  React.useEffect(() => {
    // enable Krisp by default on non-low power devices,
    // unless the user selected a different mode
    if (settings.mode === 'krisp') {
      setNoiseFilterEnabled(!isLowPowerDevice());
    } else if (settings.mode === 'custom' || settings.mode === 'off') {
      setNoiseFilterEnabled(false);
    }
  }, [settings.mode]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        width: '100%',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          gap: '10px',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <section className="lk-button-group">
          <TrackToggle source={Track.Source.Microphone}>Microphone</TrackToggle>
          <div className="lk-button-group-menu">
            <MediaDeviceMenu kind="audioinput" />
          </div>
        </section>

        <button
          className="lk-button"
          onClick={() => {
            // cycle: off -> krisp -> custom -> off
            const next =
              settings.mode === 'off' ? 'krisp' : settings.mode === 'krisp' ? 'custom' : 'off';
            setMode(next);
            setNoiseFilterEnabled(next === 'krisp');
          }}
          disabled={isNoiseFilterPending && settings.mode === 'krisp'}
          aria-pressed={settings.mode !== 'off'}
          title={`Mode: ${settings.mode}`}
        >
          {settings.mode === 'off'
            ? 'Enable Noise Cancellation'
            : settings.mode === 'krisp'
              ? 'Switch to Gate+HPF'
              : 'Disable Noise Cancellation'}
        </button>
      </div>

      <AudioControls />
    </div>
  );
}
