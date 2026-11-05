import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    title: 'Home · Pendragon Sandbox',
    loadComponent: () => import('./pages/home/home').then((m) => m.Home),
  },
  { path: '**', redirectTo: '' },
];
