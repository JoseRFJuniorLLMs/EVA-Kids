import { Component, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { NoteCollection } from '../../note/note-collection';
import { DataListService } from './data-list.service';

@Component({
  selector: 'note-edit-page',
  templateUrl: './note-dialog-edit.component.html',
  styleUrls: ['./note-dialog-edit.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatTooltipModule,
    MatIconModule,
    MatCheckboxModule
  ]
})
export class NoteDialogEditComponent implements OnInit {
  data: NoteCollection | null = null;
  loading = true;

  constructor(
    private route: ActivatedRoute,
    private dataService: DataListService,
    private location: Location
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.dataService.getNoteById(id).subscribe({
        next: (note) => {
          this.data = note;
          this.loading = false;
        },
        error: () => {
          this.loading = false;
        }
      });
    }
  }

  update(): void {
    if (this.data?._id) {
      this.dataService.updateNote(this.data._id, this.data).then(
        () => {
          this.location.back();
        },
        () => {}
      );
    }
  }

  goBack(): void {
    this.location.back();
  }
}
