import { ChangeDetectionStrategy, ChangeDetectorRef, Component } from '@angular/core';
import { ReactiveFormsModule, UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { fadeInUp400ms } from '@vex/animations/fade-in-up.animation';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { NgIf } from '@angular/common';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { AuthService } from '../login/auth.service';


@Component({
  selector: 'vex-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss'],
  animations: [fadeInUp400ms],
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatTooltipModule,
    NgIf,
    MatIconModule,
    MatCheckboxModule,
    RouterLink
  ]
})
export class RegisterComponent {
  form: UntypedFormGroup = this.fb.group({
    name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
    passwordConfirm: ['', Validators.required]
  });

  inputType = 'password';
  visible = false;

  constructor(
    private router: Router,
    private fb: UntypedFormBuilder,
    private cd: ChangeDetectorRef,
    private snackbar: MatSnackBar,
    private authService: AuthService
  ) {}

  async send() {
    if (this.form.valid) {
      const { name, email, password, passwordConfirm } = this.form.value;
      if (password !== passwordConfirm) {
        this.snackbar.open('Passwords do not match', 'Close', { duration: 3000 });
        return;
      }
      try {
        await this.authService.register(email, password, { name });
        this.snackbar.open('Registration successful!', 'Close', { duration: 3000 });
        this.router.navigate(['/dashboards/analytics']);
      } catch (error) {
        this.snackbar.open('Registration failed. Please try again.', 'Close', { duration: 5000 });
      }
    } else {
      this.snackbar.open('Please fill out the form correctly.', 'Close', { duration: 3000 });
    }
  }

  toggleVisibility() {
    if (this.visible) {
      this.inputType = 'password';
      this.visible = false;
    } else {
      this.inputType = 'text';
      this.visible = true;
    }
    this.cd.markForCheck();
  }
}
