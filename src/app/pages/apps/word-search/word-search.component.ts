import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Subject } from 'rxjs';
import { WordService } from './word.service';
import { UnifiedVoiceService } from 'src/app/core/services/voice/unified-voice.service';

interface Cell {
  letter: string;
  selected: boolean;
  found: boolean;
}

interface Word {
  text: string;
  found: boolean;
}

@Component({
  selector: 'app-word-search',
  standalone: true,
  imports: [CommonModule, MatCardModule, 
    MatChipsModule, MatButtonModule, MatTooltipModule, MatChipsModule 
  ],
  templateUrl: './word-search.component.html',
  styleUrls: ['./word-search.component.scss']
})
export class WordSearchComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  grid: Cell[][] = [];
  words: Word[] = [];
  gridSize = 20;
  currentSelection: string = '';
  score: number = 0;
  subtitle: string | null = null;

  constructor(private wordService: WordService, private voiceService: UnifiedVoiceService) {}

  ngOnInit() {
    this.voiceService.usePreset('simple');
    this.newGame();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();

    if (typeof speechSynthesis !== 'undefined') {
      speechSynthesis.cancel();
    }
  }

  newGame() {
    this.wordService.loadWords().subscribe(words => {
      this.words = words;
      this.generateGrid();
      this.placeWords();
      this.score = 0;
      this.currentSelection = '';
    });
  }

  generateGrid() {
    this.grid = Array(this.gridSize).fill(null).map(() =>
      Array(this.gridSize).fill(null).map(() => ({
        letter: '',
        selected: false,
        found: false
      }))
    );
  }

  placeWords() {
    const directions = [
      [0, 1],  // right
      [1, 0],  // down
      [1, 1],  // diagonal down-right
      [0, -1], // left
      [-1, 0], // up
      [-1, -1] // diagonal up-left
    ];

    for (const word of this.words) {
      let placed = false;
      while (!placed) {
        const direction = directions[Math.floor(Math.random() * directions.length)];
        const row = Math.floor(Math.random() * this.gridSize);
        const col = Math.floor(Math.random() * this.gridSize);

        if (this.canPlaceWord(word.text, row, col, direction)) {
          this.placeWord(word.text, row, col, direction);
          placed = true;
        }
      }
    }

    for (let i = 0; i < this.gridSize; i++) {
      for (let j = 0; j < this.gridSize; j++) {
        if (this.grid[i][j].letter === '') {
          this.grid[i][j].letter = String.fromCharCode(65 + Math.floor(Math.random() * 26));
        }
      }
    }
  }

  canPlaceWord(word: string, row: number, col: number, direction: number[]): boolean {
    const [dRow, dCol] = direction;
    for (let i = 0; i < word.length; i++) {
      const newRow = row + i * dRow;
      const newCol = col + i * dCol;
      if (newRow < 0 || newRow >= this.gridSize || newCol < 0 || newCol >= this.gridSize) {
        return false;
      }
      if (this.grid[newRow][newCol].letter !== '' && this.grid[newRow][newCol].letter !== word[i]) {
        return false;
      }
    }
    return true;
  }

  placeWord(word: string, row: number, col: number, direction: number[]) {
    const [dRow, dCol] = direction;
    for (let i = 0; i < word.length; i++) {
      const newRow = row + i * dRow;
      const newCol = col + i * dCol;
      this.grid[newRow][newCol].letter = word[i];
    }
  }

  toggleCellSelection(row: number, col: number) {
    const cell = this.grid[row][col];
    cell.selected = !cell.selected;
    
    if (cell.selected) {
      this.currentSelection += cell.letter;
    } else {
      this.currentSelection = this.currentSelection.replace(cell.letter, '');
    }

    this.checkWord();
  }

  checkWord() {
    const foundWord = this.words.find(word => 
      word.text === this.currentSelection && !word.found
    );

    if (foundWord) {
      foundWord.found = true;
      this.score++;
      this.grid.forEach(row => row.forEach(cell => {
        if (cell.selected) {
          cell.found = true;
          cell.selected = false;
        }
      }));
      this.displaySubtitle(foundWord.text);
      this.currentSelection = '';

      if (this.words.every(word => word.found)) {
        this.wordService.loadWords().subscribe(words => {
          if (words.length > 0) {
            this.words.push(...words);
            this.generateGrid();
            this.placeWords();
          } else {
            setTimeout(() => {
              alert(`Congratulations! You found all words. Your score: ${this.score}`);
              this.newGame();
            }, 500);
          }
        });
      }
    }
  }

  displaySubtitle(text: string) {
    this.subtitle = `${text} - Total Satoshi: ${this.score}`;
    this.voiceService.speak(text);
    setTimeout(() => this.subtitle = null, 2000);
  }
}
