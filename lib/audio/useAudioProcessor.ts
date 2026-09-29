'use client';

import React from 'react';
import type { Room, LocalAudioTrack } from 'livekit-client';
import { Track, RoomEvent } from 'livekit-client';
import { GateHighPassProcessor } from './processor';
import { loadSettings } from './settings';

/**
 * Watches the local audio track and applies/removes the custom
 * GateHighPassProcessor based on the audio mode setting. Manages
 * the processor lifecycle: create on enable, destroy on disable or
 * mode switch. Forwards parameter updates in real-time.
 */
export function useAudioProcessor(room: Room) {
  const processorRef = React.useRef<GateHighPassProcessor | null>(null);
  const trackRef = React.useRef<LocalAudioTrack | null>(null);

  const applyProcessor = React.useCallback(async () => {
    const settings = loadSettings();
    const track = room.localParticipant.getTrackPublication(
      Track.Source.Microphone,
    )?.track;
    const audioTrack = track as LocalAudioTrack | undefined;

    if (!audioTrack || audioTrack.kind !== 'audio') return;

    if (settings.mode === 'custom') {
      // remove existing processor first (only one allowed)
      if (processorRef.current) {
        await audioTrack.setProcessor(undefined as never).catch(() => {});
        await processorRef.current.destroy();
        processorRef.current = null;
      }

      // create and apply the custom processor
      const processor = new GateHighPassProcessor(() => loadSettings());
      await audioTrack.setProcessor(processor as never);
      processorRef.current = processor;
      trackRef.current = audioTrack;
    } else {
      // remove custom processor if present
      if (processorRef.current) {
        await audioTrack.setProcessor(undefined as never).catch(() => {});
        await processorRef.current.destroy();
        processorRef.current = null;
        trackRef.current = null;
      }
    }
  }, [room]);

  // apply when the room's local audio track changes
  React.useEffect(() => {
    const handleTrackPublished = () => {
      applyProcessor();
    };
    room.on(RoomEvent.LocalTrackPublished, handleTrackPublished);
    return () => {
      room.off(RoomEvent.LocalTrackPublished, handleTrackPublished);
    };
  }, [room, applyProcessor]);

  // initial apply (in case the track was published before this hook mounted)
  React.useEffect(() => {
    applyProcessor();
  }, [applyProcessor]);

  // cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (processorRef.current) {
        processorRef.current.destroy();
        processorRef.current = null;
      }
    };
  }, []);

  return {
    refresh: applyProcessor,
    updateSettings: React.useCallback(() => {
      processorRef.current?.updateSettings();
    }, []),
  };
}
