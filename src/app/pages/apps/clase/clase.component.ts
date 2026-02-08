import { Component, CUSTOM_ELEMENTS_SCHEMA, AfterViewInit, OnDestroy, OnInit } from '@angular/core';
import { PdfService } from './pdf.service';
import { CommonModule } from '@angular/common';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatCardModule } from '@angular/material/card';
import { MatExpansionModule } from '@angular/material/expansion';
import { NgxExtendedPdfViewerModule } from 'ngx-extended-pdf-viewer';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { UnifiedVoiceService } from 'src/app/core/services/voice/unified-voice.service';
import { VexLayoutService } from '@vex/services/vex-layout.service';
import screenfull from 'screenfull';
import { MatDialog } from '@angular/material/dialog';
import { DialogZettelComponent } from './dialog.component';

interface Ebook {
  title: string;
  author: string;
  path: string;
  cover: string;
  pageCount: number;
}

@Component({
  selector: 'clase',
  templateUrl: './clase.component.html',
  styleUrls: ['./clase.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    MatSnackBarModule,
    MatCardModule,
    MatExpansionModule,
    NgxExtendedPdfViewerModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class ClaseComponent implements AfterViewInit, OnDestroy, OnInit {
  private destroy$ = new Subject<void>();
  selectedEbook: Ebook | null = null;
  ebookCompletionStatus: { [key: string]: boolean } = {};
  isDialogOpen: boolean = false;

  constructor(
    public pdfLoaderService: PdfService,
    private voiceService: UnifiedVoiceService,
    private layoutService: VexLayoutService,
    public dialog: MatDialog
  ) {}

  ngOnInit() {
    this.voiceService.usePreset('book');

    this.pdfLoaderService.ebooks$.pipe(takeUntil(this.destroy$)).subscribe(ebooks => {
      this.pdfLoaderService.getEbooks().pipe(takeUntil(this.destroy$)).subscribe(ebooks => {
        ebooks.forEach(ebook => {
          this.pdfLoaderService.getCompletionStatus(ebook.title).pipe(takeUntil(this.destroy$)).subscribe(status => {
            this.ebookCompletionStatus[ebook.title] = status;
          });
        });
      });
    });
  }

  selectEbook(ebook: Ebook): void {
    this.selectedEbook = ebook;
    this.pdfLoaderService.getCurrentPage(ebook.title).subscribe(page => {
      this.pdfLoaderService.currentPage = page;
      this.pdfLoaderService.updateCurrentPage('display-area');
    });

    // Verificar o estado de conclusão
    this.pdfLoaderService.getCompletionStatus(ebook.title).subscribe(status => {
      this.ebookCompletionStatus[ebook.title] = status;
    });

    // Adiciona o evento mouseup apenas quando um eBook é selecionado
    document.addEventListener('mouseup', this.handleMouseUp.bind(this));
  }

  toggleCompletion(ebookId: string): void {
    const currentStatus = this.ebookCompletionStatus[ebookId] || false;
    this.pdfLoaderService.markAsCompleted(ebookId, !currentStatus).then(() => {
      this.ebookCompletionStatus[ebookId] = !currentStatus;
    });
  }

  isEbookCompleted(ebookId: string): boolean {
    return this.ebookCompletionStatus[ebookId] || false;
  }

  ngAfterViewInit() {
    if (screenfull.isEnabled) {
      screenfull.request();
      this.layoutService.collapseSidenav();
    }
  }

  handleMouseUp() {
    const selection = window.getSelection();
    if (selection && selection.toString().length > 0) {
      this.confirmCopyText();
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();

    document.removeEventListener('mouseup', this.handleMouseUp.bind(this));
  }

  confirmCopyText(): void {
    if (this.isDialogOpen) {
      return; // Evita abrir múltiplos diálogos
    }
    const selection = window.getSelection();
    if (selection) {
      const selectedText = selection.toString();
      if (selectedText.length > 0) {
        this.isDialogOpen = true; // Marca o diálogo como aberto
  
        // Copia o texto para a área de transferência
        const textarea = document.createElement('textarea');
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        textarea.value = selectedText;
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
  
        // Abre o diálogo e passa o texto selecionado
        const dialogRef = this.dialog.open(DialogZettelComponent, {
          width: '600px',
          data: { text: selectedText }
        });
  
        dialogRef.afterClosed().subscribe(() => {
          this.isDialogOpen = false; // Marca o diálogo como fechado
        });
      }
    }
  }
  
  }// fim


