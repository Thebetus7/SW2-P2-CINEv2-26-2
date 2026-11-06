import { Routes } from '@angular/router';
import { adminAuthGuard } from './core/guards/admin-auth.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'halls',
    pathMatch: 'full',
  },
  {
    path: 'halls',
    canActivate: [adminAuthGuard],
    loadChildren: () =>
      import('./features/halls/halls.routes').then((m) => m.HALLS_ROUTES),
  },
  {
    path: 'showtimes',
    canActivate: [adminAuthGuard],
    loadChildren: () =>
      import('./features/showtimes/showtimes.routes').then((m) => m.SHOWTIMES_ROUTES),
  },
  {
    path: 'movies',
    canActivate: [adminAuthGuard],
    loadChildren: () =>
      import('./features/movies/movies.routes').then((m) => m.MOVIES_ROUTES),
  },
  {
    path: 'local-ai',
    canActivate: [adminAuthGuard],
    loadComponent: () =>
      import('./features/local-ai/components/local-ai-chat.component').then(
        (m) => m.LocalAiChatComponent,
      ),
  },
  {
    path: 'audit-demo',
    canActivate: [adminAuthGuard],
    loadComponent: () =>
      import('./features/audit-demo/components/audit-demo.component').then(
        (m) => m.AuditDemoComponent,
      ),
  },
  {
    path: '**',
    redirectTo: 'halls',
  },
];
