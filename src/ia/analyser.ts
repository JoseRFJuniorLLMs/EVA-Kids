/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Audio Analyser class for visualizations
 * Wraps the Web Audio API AnalyserNode to provide
 * frequency data for visual effects
 */
export class Analyser {
  private analyser: AnalyserNode;
  public data: Uint8Array;

  constructor(node: AudioNode) {
    const ctx = node.context;
    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 256;
    this.data = new Uint8Array(this.analyser.frequencyBinCount);
    node.connect(this.analyser);
  }

  update() {
    this.analyser.getByteFrequencyData(this.data);
  }

  getAverageFrequency(): number {
    const sum = this.data.reduce((a, b) => a + b, 0);
    return sum / this.data.length;
  }

  getFrequencyAtIndex(index: number): number {
    return this.data[index] || 0;
  }
}
