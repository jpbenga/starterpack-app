// src/app/app.routes.ts
import { Routes } from '@angular/router';
import { AuthGuard } from './guards/auth.guard'; // Importer le guard

export const routes: Routes = [
  {
    path: 'home',
    loadComponent: () => import('./home/home.page').then((m) => m.HomePage),
  },
  {
    path: 'login', // Exemple de page de connexion
    loadComponent: () => import('./login/login.page').then( m => m.LoginPage)
  },
  {
    path: 'mon-compte', // Page protégée
    loadComponent: () => import('./mon-compte/mon-compte.page').then( m => m.MonComptePage),
    canActivate: [AuthGuard] // Appliquer le guard ici
  },
  {
    path: 'bibliotheque', // Page protégée
    loadComponent: () => import('./bibliotheque/bibliotheque.page').then( m => m.BibliothequePage),
    canActivate: [AuthGuard] // Appliquer le guard ici
  },
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full',
  },
  {
    path: 'login',
    loadComponent: () => import('./login/login.page').then( m => m.LoginPage)
  },
  {
    path: 'signup',
    loadComponent: () => import('./signup/signup.page').then( m => m.SignupPage)
  },
  {
    path: 'mon-compte',
    loadComponent: () => import('./mon-compte/mon-compte.page').then( m => m.MonComptePage)
  },
  {
    path: 'bibliotheque',
    loadComponent: () => import('./bibliotheque/bibliotheque.page').then( m => m.BibliothequePage)
  },
  {
    path: 'signup',
    loadComponent: () => import('./signup/signup.page').then( m => m.SignupPage)
  },
  {
    path: 'verify-email',
    loadComponent: () => import('./verify-email/verify-email.page').then( m => m.VerifyEmailPage)
  },
  // ... autres routes ...
];