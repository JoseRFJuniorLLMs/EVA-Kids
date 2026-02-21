import { Component, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { NoteCollection } from '../../note/note-collection';
import { DataListService } from './data-list.service';

@Component({
  selector: 'note-view-page',
  templateUrl: './note-dialog.component.html',
  styleUrls: ['./note-dialog.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule
  ]
})
export class NoteDialogComponent implements OnInit {
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

  goBack(): void {
    this.location.back();
  }
}
