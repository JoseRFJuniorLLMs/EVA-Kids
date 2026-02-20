import { Component, OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { VexBreadcrumbsComponent } from '@vex/components/vex-breadcrumbs/vex-breadcrumbs.component';
import { VexSecondaryToolbarComponent } from '@vex/components/vex-secondary-toolbar/vex-secondary-toolbar.component';
import { MatTabsModule } from '@angular/material/tabs';
import { VexPageLayoutContentDirective } from '@vex/components/vex-page-layout/vex-page-layout-content.directive';
import { VexPageLayoutHeaderDirective } from '@vex/components/vex-page-layout/vex-page-layout-header.directive';
import { VexPageLayoutComponent } from '@vex/components/vex-page-layout/vex-page-layout.component';

import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { VexLayoutService } from '@vex/services/vex-layout.service';
import { FormsModule } from '@angular/forms';
import { MatBottomSheetModule } from '@angular/material/bottom-sheet';
import { MatCardModule } from '@angular/material/card';
import { MatListModule } from '@angular/material/list';

import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import {
  MatSnackBar,
  MatSnackBarHorizontalPosition,
  MatSnackBarVerticalPosition
} from '@angular/material/snack-bar';

import { MatTooltipModule } from '@angular/material/tooltip';
import screenfull from 'screenfull';

import { MatToolbarModule } from '@angular/material/toolbar';

// Interface para descrever a estrutura da resposta da API
interface ResponseData {
  choices?: { message: { content: string } }[];
}
@Component({
  selector: 'vex-share-bottom-gpt4',
  templateUrl: './share-bottom-gpt4.component.html',
  styleUrls: ['./share-bottom-gpt4.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatBottomSheetModule,
    MatListModule,
    VexSecondaryToolbarComponent,
    VexBreadcrumbsComponent,
    MatButtonModule,
    MatIconModule,
    MatTabsModule,
    VexPageLayoutContentDirective,
    VexPageLayoutHeaderDirective,
    VexPageLayoutComponent,
    MatCardModule,
    MatTooltipModule,
    MatInputModule,
    MatFormFieldModule,
    MatToolbarModule
  ]
})
export class ShareBottomGpt4Component implements OnInit {
  durationInSeconds = 130;
  horizontalPosition: MatSnackBarHorizontalPosition = 'end';
  verticalPosition: MatSnackBarVerticalPosition = 'bottom';

  questionAnswerList: any[] = [];
  questionText: any = '';
  chatMessage: any;
  isLoading = false;
  errorText = '';
  data: any;

  constructor(
    private http: HttpClient,
    private _snackBar: MatSnackBar,
    private layoutService: VexLayoutService
  ) {}

  openSnackBar(message: string) {
    this._snackBar.open(message, 'Save Notes', {
      horizontalPosition: this.horizontalPosition,
      verticalPosition: this.verticalPosition,
      duration: this.durationInSeconds * 1000
    });
  }

  ngOnInit(): void {
    if (screenfull.isEnabled) {
      screenfull.request();
      this.layoutService.collapseSidenav();
    }
  }

  async questionToOpenAI(question: string) {
    this.openSnackBar('Funcionalidade migrada para Gemini AI');
  }
}
