// pcm-processor.js - AudioWorklet for EVA-Mind PCM16 streaming
class PCMProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.port.onmessage = (event) => {
      // Reserved for future commands from main thread
    };
  }

  process(inputs, outputs, parameters) {
    try {
      const input = inputs[0];
      if (input && input.length > 0) {
        const inputChannel = input[0];
        if (inputChannel && inputChannel.length > 0) {
          // Convert Float32 to Int16 (PCM16)
          const pcm16 = new Int16Array(inputChannel.length);
          for (let i = 0; i < inputChannel.length; i++) {
            const s = Math.max(-1, Math.min(1, inputChannel[i]));
            pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
          }

          // Send PCM16 buffer to main thread
          this.port.postMessage(pcm16.buffer, [pcm16.buffer]);
        }
      }
    } catch {
      // Continue processing even on error
    }

    return true;
  }
}

registerProcessor('pcm-processor', PCMProcessor);
