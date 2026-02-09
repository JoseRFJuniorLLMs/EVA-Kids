// pcm-processor.js - AudioWorklet for EVA-Mind PCM16 streaming
class PCMProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.port.onmessage = (event) => {
      // Reserved for future commands from main thread
    };
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    if (input.length > 0) {
      const inputChannel = input[0];
      if (inputChannel) {
        // Convert Float32 to Int16 (PCM16)
        const pcm16 = new Int16Array(inputChannel.length);
        for (let i = 0; i < inputChannel.length; i++) {
          const s = inputChannel[i];
          pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }

        // Send PCM16 buffer to main thread
        this.port.postMessage(pcm16.buffer, [pcm16.buffer]);
      }
    }

    return true;
  }
}

registerProcessor('pcm-processor', PCMProcessor);
