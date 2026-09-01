import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { aplicarTemaCacheado } from './app/core/perfil.service';

aplicarTemaCacheado();

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));
