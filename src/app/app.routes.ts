import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    title: 'Home · RPG World',
    loadComponent: () => import('./pages/home/home').then((m) => m.Home),
  },
  { path: '**', redirectTo: '' },
];
