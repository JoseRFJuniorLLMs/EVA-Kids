import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnInit,
  ViewChild,
  ViewEncapsulation
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatExpansionModule } from '@angular/material/expansion';

import { MatBadgeModule } from '@angular/material/badge';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import {
  MatSnackBar,
  MatSnackBarHorizontalPosition,
  MatSnackBarVerticalPosition
} from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';

import ePub from 'epubjs';
import WaveSurfer from 'wavesurfer.js';

// Interface para descrever a estrutura da resposta da API
interface ResponseData {
  choices?: { message: { content: string } }[];
}

interface Ebook {
  title: string;
  author: string;
  path: string;
  cover: string;
  pageCount: number;
}

@Component({
  selector: 'book',
  templateUrl: 'book.html',
  styleUrls: ['book.scss'],
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [
    MatBadgeModule,
    MatCardModule,
    MatIconModule,
    MatSelectModule,
    FormsModule,
    MatTooltipModule,
    CommonModule,
    MatExpansionModule
  ]
})
export class AudioBooksComponent {

  ebooks: Ebook[] = [];
  

} //fim
