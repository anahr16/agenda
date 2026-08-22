import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  modo = signal<'login' | 'registro'>('login');
  email = '';
  password = '';
  error = signal<string | null>(null);
  cargando = signal(false);

  constructor(private auth: AuthService, private router: Router) {}

  alternarModo(): void {
    this.modo.set(this.modo() === 'login' ? 'registro' : 'login');
    this.error.set(null);
  }

  enviar(): void {
    this.error.set(null);
    this.cargando.set(true);

    const accion =
      this.modo() === 'login'
        ? this.auth.login(this.email, this.password)
        : this.auth.registrar(this.email, this.password);

    accion.subscribe({
      next: () => {
        if (this.modo() === 'registro') {
          this.modo.set('login');
          this.cargando.set(false);
          this.error.set('Usuario creado. Ahora inicia sesion.');
          return;
        }
        this.cargando.set(false);
        this.router.navigateByUrl('/agenda');
      },
      error: (err) => {
        this.cargando.set(false);
        this.error.set(err.error?.error || 'Ocurrio un error, intenta de nuevo.');
      },
    });
  }
}
