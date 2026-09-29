import type { AudioProcessorOptions } from 'livekit-client';
import { createGateWorkletUrl } from './gate-worklet';
import type { AudioSettings } from './settings';

/**
 * Custom audio processor: mic → high-pass → noise gate → output.
 * Implements the TrackProcessor shape from livekit-client (the
 * `implements` clause is omitted — the interface is @experimental
 * and has generic contravariance issues; the class is cast at the
 * call site instead).
 */
export class GateHighPassProcessor {
  name = 'gate-hpf';

  private audioContext?: AudioContext;
  private sourceNode?: MediaStreamAudioSourceNode;
  private filterNode?: BiquadFilterNode;
  private gateNode?: AudioWorkletNode;
  private destNode?: MediaStreamAudioDestinationNode;
  private settingsGetter: () => AudioSettings;

  processedTrack?: MediaStreamTrack;
  private blobUrl?: string;

  constructor(settingsGetter: () => AudioSettings) {
    this.settingsGetter = settingsGetter;
  }

  async init(opts: AudioProcessorOptions): Promise<void> {
    const { track, audioContext } = opts;
    this.audioContext = audioContext;

    // load the gate worklet via Blob URL
    this.blobUrl = createGateWorkletUrl();
    await audioContext.audioWorklet.addModule(this.blobUrl);

    // build the chain: source → high-pass → gate → destination
    this.sourceNode = audioContext.createMediaStreamSource(
      new MediaStream([track]),
    );

    this.filterNode = audioContext.createBiquadFilter();
    this.filterNode.type = 'highpass';
    this.filterNode.frequency.value = this.settingsGetter().hpfCutoff;
    this.filterNode.Q.value = 0.707;

    this.gateNode = new AudioWorkletNode(audioContext, 'noise-gate');
    this.sendGateParams();

    this.destNode = audioContext.createMediaStreamDestination();

    // wire the chain
    this.sourceNode.connect(this.filterNode);
    this.filterNode.connect(this.gateNode);
    this.gateNode.connect(this.destNode);

    this.processedTrack = this.destNode.stream.getAudioTracks()[0];
  }

  async destroy(): Promise<void> {
    try {
      this.sourceNode?.disconnect();
      this.filterNode?.disconnect();
      this.gateNode?.disconnect();
      this.destNode?.disconnect();
    } catch {
      // nodes already disconnected
    }
    if (this.blobUrl) {
      URL.revokeObjectURL(this.blobUrl);
    }
    this.sourceNode = undefined;
    this.filterNode = undefined;
    this.gateNode = undefined;
    this.destNode = undefined;
    this.processedTrack = undefined;
  }

  /** Called by the UI when settings change — updates nodes in real-time. */
  updateSettings(): void {
    const settings = this.settingsGetter();

    if (this.filterNode) {
      this.filterNode.frequency.value = settings.hpfCutoff;
    }

    this.sendGateParams();
  }

  /** Query the gate state (for VU meter). Returns a promise. */
  queryGateState(): Promise<{ rms: number; gateOpen: boolean }> {
    return new Promise((resolve) => {
      if (!this.gateNode) {
        resolve({ rms: 0, gateOpen: false });
        return;
      }
      const timeout = setTimeout(() => resolve({ rms: 0, gateOpen: false }), 100);
      this.gateNode.port.onmessage = (event) => {
        if (event.data.type === 'state') {
          clearTimeout(timeout);
          resolve({ rms: event.data.rms, gateOpen: event.data.gateOpen });
        }
      };
      this.gateNode.port.postMessage({ type: 'query' });
    });
  }

  private sendGateParams(): void {
    if (!this.gateNode) return;
    const settings = this.settingsGetter();
    this.gateNode.port.postMessage({
      type: 'params',
      threshold: settings.gateThreshold,
      attackMs: settings.gateAttack,
      releaseMs: settings.gateRelease,
      enabled: settings.gateEnabled,
    });
  }
}
