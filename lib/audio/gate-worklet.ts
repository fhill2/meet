/**
 * Noise gate AudioWorkletProcessor.
 *
 * Loaded via a Blob URL (see processor.ts). Parameters are received
 * via port.postMessage and stored on `this.params` — read on every
 * process() call for real-time adjustment without restart.
 *
 * Gate behaviour:
 * - Computes RMS of each 128-sample block
 * - If RMS >= threshold (in dB), the gate is "open" — pass audio
 * - If RMS < threshold, the gate "closes" after the release time
 * - While closing, applies a linear ramp to zero over the release
 *   period (prevents clicks)
 * - While opening, ramps up over the attack period
 */

const GATE_WORKLET_SRC = `
class NoiseGateProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.params = {
      threshold: Math.pow(10, -45 / 20), // linear amplitude
      attackSamples: Math.round((5 / 1000) * sampleRate),
      releaseSamples: Math.round((200 / 1000) * sampleRate),
      enabled: true,
    };
    this.gate = 0; // 0 = fully closed, 1 = fully open
    this.holdCounter = 0;
    this.rms = 0;

    this.port.onmessage = (event) => {
      const data = event.data;
      if (data.type === 'params') {
        if (data.threshold !== undefined) {
          // dB to linear amplitude
          this.params.threshold = Math.pow(10, data.threshold / 20);
        }
        if (data.attackMs !== undefined) {
          this.params.attackSamples = Math.max(1, Math.round((data.attackMs / 1000) * sampleRate));
        }
        if (data.releaseMs !== undefined) {
          this.params.releaseSamples = Math.max(1, Math.round((data.releaseMs / 1000) * sampleRate));
        }
        if (data.enabled !== undefined) {
          this.params.enabled = data.enabled;
        }
      } else if (data.type === 'query') {
        // respond with current state (for VU meter)
        this.port.postMessage({
          type: 'state',
          rms: this.rms,
          gateOpen: this.gate > 0.5,
          gate: this.gate,
        });
      }
    };
  }

  process(inputs, outputs) {
    const input = inputs[0];
    const output = outputs[0];

    if (!input || input.length === 0) {
      return true;
    }

    if (!this.params.enabled) {
      // bypass: copy input to output
      for (let ch = 0; ch < input.length; ch++) {
        output[ch].set(input[ch]);
      }
      return true;
    }

    const numChannels = Math.min(input.length, output.length);
    const blockSize = input[0].length;

    // compute RMS across all channels
    let sumSq = 0;
    for (let ch = 0; ch < numChannels; ch++) {
      const data = input[ch];
      for (let i = 0; i < blockSize; i++) {
        sumSq += data[i] * data[i];
      }
    }
    this.rms = Math.sqrt(sumSq / (numChannels * blockSize));

    // gate state machine
    if (this.rms >= this.params.threshold) {
      // signal above threshold: open the gate
      this.holdCounter = this.params.releaseSamples;
      if (this.gate < 1) {
        // ramp open over attack time
        const step = blockSize / this.params.attackSamples;
        this.gate = Math.min(1, this.gate + step);
      }
    } else {
      // signal below threshold
      if (this.holdCounter > 0) {
        // still in hold period — keep gate open
        this.holdCounter -= blockSize;
      } else if (this.gate > 0) {
        // ramp closed over release time
        const step = blockSize / this.params.releaseSamples;
        this.gate = Math.max(0, this.gate - step);
      }
    }

    // apply gate gain
    if (this.gate >= 1) {
      // fully open: copy directly
      for (let ch = 0; ch < numChannels; ch++) {
        output[ch].set(input[ch]);
      }
    } else if (this.gate <= 0) {
      // fully closed: silence
      for (let ch = 0; ch < numChannels; ch++) {
        output[ch].fill(0);
      }
    } else {
      // ramping: apply gain
      for (let ch = 0; ch < numChannels; ch++) {
        const inData = input[ch];
        const outData = output[ch];
        for (let i = 0; i < blockSize; i++) {
          outData[i] = inData[i] * this.gate;
        }
      }
    }

    return true;
  }
}

registerProcessor('noise-gate', NoiseGateProcessor);
`;

export function createGateWorkletUrl(): string {
  const blob = new Blob([GATE_WORKLET_SRC], { type: 'application/javascript' });
  return URL.createObjectURL(blob);
}
