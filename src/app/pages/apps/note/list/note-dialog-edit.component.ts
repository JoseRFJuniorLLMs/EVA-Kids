import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatBadgeModule } from '@angular/material/badge';
import { NoteCollection } from '../../note/note-collection';
import { NoteService } from '../note.service';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'note-dialog-edit',
  templateUrl: './note-dialog-edit.component.html',
  styleUrls: ['./note-dialog-edit.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatDialogModule ,
    MatTooltipModule,
    MatBadgeModule,
    MatIconModule
  ]
})
export class NoteDialogEditComponent {
  constructor(
    public dialogRef: MatDialogRef<NoteDialogEditComponent>,
    @Inject(MAT_DIALOG_DATA) public data: NoteCollection,
    private noteService: NoteService 
  ) {}

  onNoClick(): void {
    this.dialogRef.close();
  }

  update(): void {
    if (this.data._id) {
      this.noteService.updateNote(this.data._id, this.data).then(
        () => {
          this.dialogRef.close(this.data); 
          this.dialogRef.close();
        },
        () => {}
      );
    }
  }


}//fim
