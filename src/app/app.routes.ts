import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    title: 'Home · Pendragon Sandbox',
    loadComponent: () => import('./pages/home/home').then((m) => m.Home),
  },
  {
    path: 'samhladh',
    title: 'Samhladh Invocations · Pendragon Sandbox',
    loadComponent: () => import('./pages/samhladh/samhladh').then((m) => m.SamhladhPage),
  },
  {
    path: 'dice',
    title: 'Dice Tray · Pendragon Sandbox',
    loadComponent: () => import('./pages/dice-tray/dice-tray').then((m) => m.DiceTrayPage),
  },
  {
    path: 'coat-of-arms',
    title: 'Coat of Arms · Pendragon Sandbox',
    loadComponent: () => import('./pages/coat-of-arms/coat-of-arms').then((m) => m.CoatOfArmsPage),
    canDeactivate: [(page: { confirmLeave(): boolean }) => page.confirmLeave()],
  },
  {
    path: 'coat-of-arms/gallery',
    title: 'Coat of Arms Gallery · Pendragon Sandbox',
    loadComponent: () =>
      import('./pages/coat-of-arms/gallery/coat-of-arms-gallery').then(
        (m) => m.CoatOfArmsGalleryPage,
      ),
  },
  { path: '**', redirectTo: '' },
];
