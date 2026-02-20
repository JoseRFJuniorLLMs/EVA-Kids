/**
 * Node Dialog Component - Detalhes da Palavra
 *
 * Mostra informacoes sobre a palavra selecionada de forma
 * amigavel para criancas, com opcao de ouvir a pronuncia.
 */

import { CommonModule } from '@angular/common';
import { Component, Inject, OnInit, OnDestroy } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatButtonModule } from '@angular/material/button';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-node-dialog',
  templateUrl: './node-dialog.component.html',
  styleUrls: ['./node-dialog.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatIconModule,
    MatTooltipModule,
    MatButtonModule
  ]
})
export class NodeDialogComponent implements OnInit, OnDestroy {
  isSpeaking = false;
  private audioSub?: Subscription;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    private dialogRef: MatDialogRef<NodeDialogComponent>
  ) {}

  ngOnInit(): void {
    if (this.data.audioState$) {
      this.audioSub = this.data.audioState$.subscribe((state: string) => {
        this.isSpeaking = state === 'speaking';
      });
    }
  }

  ngOnDestroy(): void {
    this.audioSub?.unsubscribe();
  }

  /**
   * Retorna a palavra alvo relacionada (se houver)
   */
  get relatedWord(): string | null {
    if (!this.data.primeToTarget || !this.data.node?.label) return null;
    const word = this.data.node.label.toLowerCase();
    return this.data.primeToTarget[word] || null;
  }

  /**
   * Fala a palavra usando a funcao passada pelo componente pai
   */
  speakWord(): void {
    if (this.data.speakWord && this.data.node?.label) {
      this.data.speakWord(this.data.node.label);
    }
  }

  /**
   * Fecha o dialogo
   */
  close(): void {
    this.dialogRef.close();
  }
}
