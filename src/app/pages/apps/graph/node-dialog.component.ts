/**
 * Node Dialog Component - Detalhes da Palavra
 *
 * Mostra informacoes sobre a palavra selecionada de forma
 * amigavel para criancas, com opcao de ouvir a pronuncia.
 */

import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatButtonModule } from '@angular/material/button';

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
export class NodeDialogComponent {
  isSpeaking = false;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    private dialogRef: MatDialogRef<NodeDialogComponent>
  ) {}

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
      this.isSpeaking = true;
      this.data.speakWord(this.data.node.label);
      // Simular fim da fala
      setTimeout(() => {
        this.isSpeaking = false;
      }, 2000);
    }
  }

  /**
   * Fecha o dialogo
   */
  close(): void {
    this.dialogRef.close();
  }
}
