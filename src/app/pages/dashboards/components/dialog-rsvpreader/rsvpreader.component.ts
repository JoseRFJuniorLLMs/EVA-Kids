import { Component, OnInit, OnDestroy } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { CommonModule, Location } from '@angular/common';
import { Subscription } from 'rxjs';

import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatRippleModule } from '@angular/material/core';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DataListService } from 'src/app/pages/apps/note/list/data-list.service';

@Component({
  selector: 'rsvpreader',
  standalone: true,
  templateUrl: './rsvpreader.component.html',
  styleUrls: ['./rsvpreader.component.scss'],
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatRippleModule,
    MatTooltipModule,
    MatCardModule,
    MatToolbarModule,
    MatProgressBarModule,
    MatDividerModule,
  ]
})
export class RsvpreaderComponent implements OnInit, OnDestroy {
  words: string[] = [];
  currentWord = '';
  currentWordFormatted: SafeHtml | undefined;
  currentIndex = 0;
  readingInterval: any;
  intervalSpeed = 200;
  private notesSub: Subscription | null = null;

  constructor(
    private sanitizer: DomSanitizer,
    private dataService: DataListService,
    private location: Location
  ) {}

  ngOnInit() {
    this.notesSub = this.dataService.getNotes().subscribe(notes => {
      const combinedText = notes.map(n => n.description).filter(Boolean).join(' ');
      this.words = combinedText.split(' ').filter(Boolean);
    });
  }

  ngOnDestroy() {
    this.notesSub?.unsubscribe();
    this.stopReading();
  }

  startReading() {
    if (this.readingInterval) {
      return;
    }

    this.readingInterval = setInterval(() => {
      if (this.currentIndex < this.words.length) {
        const word = this.words[this.currentIndex++];
        this.currentWord = word;
        this.currentWordFormatted = this.formatWord(word);
      } else {
        this.stopReading();
      }
    }, this.intervalSpeed);
  }

  stopReading() {
    clearInterval(this.readingInterval);
    this.readingInterval = null;
    this.currentIndex = 0;
  }

  adjustSpeed(speed: number) {
    this.intervalSpeed = speed;
    if (this.readingInterval) {
      this.stopReading();
      this.startReading();
    }
  }

  formatWord(word: string): SafeHtml {
    if (word.length > 1) {
      const middleIndex = Math.floor(word.length / 2);
      const formattedWord = `${word.substring(0, middleIndex)}<span class="highlight">${word[middleIndex]}</span>${word.substring(middleIndex + 1)}`;
      return this.sanitizer.bypassSecurityTrustHtml(formattedWord);
    }
    return this.sanitizer.bypassSecurityTrustHtml(word);
  }

  goBack(): void {
    this.location.back();
  }
}
