import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCardModule } from '@angular/material/card';
import { MatListModule } from '@angular/material/list';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { Observable } from 'rxjs';
import { StudentService } from '../student.service';
import { Student } from 'src/app/model/student/student';
import { EditStudentDialogComponent } from './edit-student-dialog.component';
import { DeleteStudentDialogComponent } from './delete-student-dialog.component';
import { MatBadgeModule } from '@angular/material/badge';
import { AuthService } from 'src/app/pages/pages/auth/login/auth.service';

@Component({
  selector: 'app-student',
  templateUrl: './student.component.html',
  styleUrls: ['./student.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatButtonToggleModule,
    MatCardModule,
    MatListModule,
    MatDialogModule,
    MatBadgeModule
  ]
})
export class StudentComponent implements OnInit {
  student$!: Observable<Student | null>;
  students$!: Observable<Student[]>;
  selectedStudent: Student | null = null;

  constructor(
    public dialog: MatDialog,
    private studentService: StudentService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.student$ = this.studentService.getStudentData();
    this.students$ = this.studentService.getStudents();
  }

  addStudent(student: Student) {
    this.studentService.addStudentData(student).then(() => {
    }).catch(() => {});
  }

  async updateStudent(student: Student) {
    try {
      const uid = this.authService.getUID();
      if (uid) {
        student._id = uid.toString();
        await this.studentService.updateStudentData(student);
      }
    } catch (error) {
    }
  }

  deleteStudent(id: string) {
    if (id) {
      this.studentService.deleteStudentData(id).then(() => {
      }).catch(() => {});
    }
  }

  openEditDialog(student: Student) {
    const dialogRef = this.dialog.open(EditStudentDialogComponent, {
      width: '80vw',
      height: '80vw',
      data: { ...student }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.updateStudent(result);
      }
    });
  }

  openDeleteDialog(id: string) {
    const dialogRef = this.dialog.open(DeleteStudentDialogComponent, {
      width: '300px',
      data: { id }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.deleteStudent(id);
      }
    });
  }

  selectStudent(student: Student) {
    this.selectedStudent = student;
  }

  clearSelection() {
    this.selectedStudent = null;
  }
}
