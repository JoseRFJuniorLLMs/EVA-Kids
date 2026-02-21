import { Component, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import nlp from 'compromise';

interface PartOfSpeech {
  color: string;
  symbol: string;
}

interface AnalyzedWord {
  word: string;
  type: string;
}

@Component({
  selector: 'app-grammar-analyzer',
  templateUrl: './grammar-analyzer.component.html',
  styleUrls: ['./grammar-analyzer.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatTooltipModule
  ]
})
export class GrammarAnalyzerComponent {
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  
  text: string = '';
  fileName: string = '';
  isAnalyzed: boolean = false;
  analyzedText: AnalyzedWord[] = [];

  partsOfSpeech: { [key: string]: PartOfSpeech } = {
    Noun: { color: '#9932CC', symbol: 'n.' },
    Verb: { color: '#FF4500', symbol: 'v.' },
    Adjective: { color: '#32CD32', symbol: 'adj.' },
    Adverb: { color: '#9932CC', symbol: 'adv.' },
    Determiner: { color: '#1E90FF', symbol: 'det.' },
    Preposition: { color: '#FFA500', symbol: 'prep.' },
    Conjunction: { color: '#FF69B4', symbol: 'conj.' },
    Pronoun: { color: '#20B2AA', symbol: 'pron.' },
    Other: { color: '#000000', symbol: '' }
  };

  onFileSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      this.fileName = file.name;
      const reader = new FileReader();
      reader.onload = (e: ProgressEvent<FileReader>) => {
        this.text = e.target?.result as string;
        this.isAnalyzed = false;
        this.analyzedText = [];
      };
      reader.readAsText(file);
    }
  }

  performAnalysis(): void {
    if (!this.text) return;

    const doc = nlp(this.text);

    this.analyzedText = doc.terms().json().map((item: any) => {
      const term = item.terms?.[0] || {};
      const word = term.text || item.text || '';
      const tags = term.tags ? Object.keys(term.tags) : [];
      const type = this.determineWordType(tags);
      return { word, type };
    });

    this.isAnalyzed = true;
  }

  resetAnalysis(): void {
    this.text = '';
    this.fileName = '';
    this.isAnalyzed = false;
    this.analyzedText = [];
    if (this.fileInput) {
      this.fileInput.nativeElement.value = '';
    }
  }

  determineWordType(tags: string[]): string {
    const possibleTypes = ['Noun', 'Verb', 'Adjective', 'Adverb', 'Determiner', 'Preposition', 'Conjunction', 'Pronoun'];
    for (const type of possibleTypes) {
      if (tags.includes(type)) return type;
    }
    return 'Other';
  }

  getPartOfSpeech(type: string): PartOfSpeech {
    return this.partsOfSpeech[type] || this.partsOfSpeech['Other'];
  }
}
