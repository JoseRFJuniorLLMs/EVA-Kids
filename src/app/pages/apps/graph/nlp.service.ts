import { Injectable } from '@angular/core';
import { DataService } from './data.service';
import * as tf from '@tensorflow/tfjs';
import * as use from '@tensorflow-models/universal-sentence-encoder';

@Injectable({
  providedIn: 'root'
})
export class NlpService {
  private model: any = null;
  private modelLoading: Promise<void> | null = null;

  constructor(private dataService: DataService) {
    this.modelLoading = this.loadModel();
  }

  async loadModel(): Promise<void> {
    try {
      // Tentar WebGL primeiro, fallback para CPU
      try {
        await tf.setBackend('webgl');
      } catch {
        await tf.setBackend('cpu');
      }
      await tf.ready();
      this.model = await use.load();
    } catch (error) {
      this.model = null;
    }
  }

  private async ensureModel(): Promise<boolean> {
    if (this.model) return true;
    if (this.modelLoading) {
      await this.modelLoading;
    }
    return this.model !== null;
  }

  async getEmbeddings(sentences: string[]): Promise<tf.Tensor2D | null> {
    const ready = await this.ensureModel();
    if (!ready || sentences.length === 0) return null;
    return this.model.embed(sentences) as Promise<tf.Tensor2D>;
  }

  cosineSimilarity(vecA: tf.Tensor1D, vecB: tf.Tensor1D): number {
    return tf.tidy(() => {
      const dotProduct = tf.sum(tf.mul(vecA, vecB));
      const magnitudeA = tf.norm(vecA);
      const magnitudeB = tf.norm(vecB);
      const magnitude = tf.mul(magnitudeA, magnitudeB);
      const similarity = tf.div(dotProduct, magnitude);
      return similarity.dataSync()[0];
    });
  }

  async calculateSimilarities(sentences: string[]): Promise<number[][]> {
    if (sentences.length === 0) return [];

    const embeddings = await this.getEmbeddings(sentences);

    // Fallback: se o modelo não carregou, retorna matriz zerada
    if (!embeddings) {
      return this.fallbackSimilarities(sentences);
    }

    try {
      const numSentences = embeddings.shape[0];
      const similarities: number[][] = [];

      for (let i = 0; i < numSentences; i++) {
        const row: number[] = [];
        for (let j = 0; j < numSentences; j++) {
          if (i === j) {
            row.push(1.0);
          } else if (j < i) {
            // Já calculado - usar simetria
            row.push(similarities[j][i]);
          } else {
            // Usar tf.tidy para auto-dispose dos tensors intermediários
            const similarity = tf.tidy(() => {
              const vecA = embeddings.slice([i, 0], [1, -1]).reshape([-1]) as tf.Tensor1D;
              const vecB = embeddings.slice([j, 0], [1, -1]).reshape([-1]) as tf.Tensor1D;
              return this.cosineSimilarity(vecA, vecB);
            });
            row.push(similarity);
          }
        }
        similarities.push(row);
      }

      return similarities;
    } finally {
      // Sempre dispose do tensor de embeddings
      embeddings.dispose();
    }
  }

  /**
   * Fallback: calcula similaridade baseada em palavras comuns
   * quando o TensorFlow não está disponível
   */
  private fallbackSimilarities(sentences: string[]): number[][] {
    const tokenized = sentences.map(s =>
      new Set(s.toLowerCase().split(/\W+/).filter(Boolean))
    );

    const similarities: number[][] = [];
    for (let i = 0; i < sentences.length; i++) {
      const row: number[] = [];
      for (let j = 0; j < sentences.length; j++) {
        if (i === j) {
          row.push(1.0);
        } else if (j < i) {
          row.push(similarities[j][i]);
        } else {
          // Jaccard similarity
          const intersection = new Set([...tokenized[i]].filter(x => tokenized[j].has(x)));
          const union = new Set([...tokenized[i], ...tokenized[j]]);
          row.push(union.size > 0 ? intersection.size / union.size : 0);
        }
      }
      similarities.push(row);
    }
    return similarities;
  }

  getPrimeToTargetMapping(): { [key: string]: string } {
    return this.dataService.getPrimeToTargetMapping();
  }

  getColorMapping(): { [key: string]: string } {
    return this.dataService.getColorMapping();
  }
}
