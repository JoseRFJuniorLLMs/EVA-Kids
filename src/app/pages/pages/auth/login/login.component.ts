import { ChangeDetectionStrategy, ChangeDetectorRef, Component, HostListener, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { fadeInUp400ms } from '@vex/animations/fade-in-up.animation';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatButtonModule } from '@angular/material/button';
import { NgIf, CommonModule } from '@angular/common';  // Importando CommonModule
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { AuthService } from './auth.service';

@Component({
  selector: 'vex-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [fadeInUp400ms],
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    NgIf,
    CommonModule,  // Adicionando CommonModule aqui
    MatButtonModule,
    MatTooltipModule,
    MatIconModule,
    MatCheckboxModule,
    RouterLink
  ]
})
export class LoginComponent implements OnInit {
  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required]
  });

  inputType = 'password';
  visible = false;

  randomImage: string | undefined;
  images: string[] = [
    'assets/img/game/frag.png',
    'assets/img/game/frag2.png',
    'assets/img/game/frag3.png',
    'assets/img/game/frag4.png',
    'assets/img/game/frag5.png',
    'assets/img/game/frag6.png',
    'assets/img/game/frag7.png',
    'assets/img/game/frag8.png',
    'assets/img/game/frag9.png',
    'assets/img/game/frag10.png',
    'assets/img/game/frag11.png',
    'assets/img/game/fraj.png',
    'assets/img/game/fraj2.png',
    'assets/img/game/fraj3.png',
    'assets/img/game/fraj4.png',
    'assets/img/game/fraj5.png',
    'assets/img/game/fraj6.png',
    'assets/img/game/fraj7.png',
    'assets/img/game/fraj8.png',
    'assets/img/game/fraj9.png',
    'assets/img/game/fraj10.png',
    'assets/img/game/fraj11.png'
  ];

  constructor(
    private router: Router,
    private fb: FormBuilder,
    private cd: ChangeDetectorRef,
    private snackbar: MatSnackBar,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.randomImage = this.getRandomImage();
  }

  getRandomImage(): string {
    const randomIndex = Math.floor(Math.random() * this.images.length);
    return this.images[randomIndex];
  }

  getBackgroundStyle(): { [klass: string]: any } {
    return {
      'background-image': `url(${this.randomImage})`
    };
  }

  async send() {
    if (this.form.valid) {
      const { email, password } = this.form.value;
      try {
        await this.authService.login(email!, password!);
        this.snackbar.open('Login successful!', 'Close', { duration: 3000 });
        // O redirecionamento é tratado no AuthService após o login bem-sucedido
      } catch (error) {
        this.snackbar.open('Login failed. Please check your credentials and try again.', 'Close', { duration: 5000 });
      }
    } else {
      this.snackbar.open('Please enter a valid email and password.', 'Close', { duration: 3000 });
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

  @HostListener('document:keydown.enter', ['$event'])
  handleEnterKey(event: KeyboardEvent) {
    this.send();
  }
  
}
