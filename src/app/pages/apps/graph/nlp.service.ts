import { Injectable } from '@angular/core';
import { DataService } from './data.service';
import * as tf from '@tensorflow/tfjs';
import * as use from '@tensorflow-models/universal-sentence-encoder';
import type { UniversalSentenceEncoder } from '@tensorflow-models/universal-sentence-encoder';

const MAX_BATCH_SIZE = 100;
const DEFAULT_SIMILARITY_THRESHOLD = 0.5;

@Injectable({
  providedIn: 'root'
})
export class NlpService {
  private model: UniversalSentenceEncoder | null = null;
  private modelLoading: Promise<void> | null = null;

  constructor(private dataService: DataService) {
    this.modelLoading = this.loadModel();
  }

  async loadModel(): Promise<void> {
    try {
      try {
        await tf.setBackend('webgl');
      } catch {
        await tf.setBackend('cpu');
      }
      await tf.ready();
      this.model = await use.load();
    } catch {
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
    return this.model!.embed(sentences) as Promise<tf.Tensor2D>;
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

  /**
   * Calcula similaridades entre frases com limite de batch.
   * Para datasets grandes (>MAX_BATCH_SIZE), processa apenas os primeiros N.
   */
  async calculateSimilarities(sentences: string[], threshold = DEFAULT_SIMILARITY_THRESHOLD): Promise<number[][]> {
    if (sentences.length === 0) return [];

    // Limitar tamanho do batch para evitar O(n^2) explosivo
    const batch = sentences.length > MAX_BATCH_SIZE
      ? sentences.slice(0, MAX_BATCH_SIZE)
      : sentences;

    const embeddings = await this.getEmbeddings(batch);

    if (!embeddings) {
      return this.fallbackSimilarities(batch);
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
            row.push(similarities[j][i]);
          } else {
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

      // Preencher linhas extras com zeros se truncado
      for (let i = batch.length; i < sentences.length; i++) {
        similarities.push(new Array(sentences.length).fill(0));
      }

      return similarities;
    } finally {
      embeddings.dispose();
    }
  }

  /**
   * Fallback: similaridade Jaccard por palavras comuns
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
