import { Routes } from '@angular/router';
import { ShowtimeCalendarComponent } from './components/showtime-calendar.component';

export const SHOWTIMES_ROUTES: Routes = [
  {
    path: '',
    component: ShowtimeCalendarComponent,
  },
];
