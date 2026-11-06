import { Routes } from '@angular/router';
import { MovieCatalogComponent } from './components/movie-catalog.component';

export const MOVIES_ROUTES: Routes = [
  {
    path: '',
    component: MovieCatalogComponent,
  },
];
