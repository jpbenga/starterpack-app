// src/app/guards/auth.guard.ts
import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree, Router } from '@angular/router';
import { Observable } from 'rxjs';
import { map, take, tap } from 'rxjs/operators';
import { AuthService } from '../services/auth.service'; // Importer AuthService

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {

  constructor(private authService: AuthService, private router: Router) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {

    return this.authService.user$.pipe(
      take(1), // Prend la première valeur émise (état actuel)
      map(user => !!user && !user.isAnonymous), // Vérifie si l'utilisateur est connecté ET n'est PAS anonyme
      tap(isLoggedIn => {
        if (!isLoggedIn) {
          console.log('AuthGuard: Access denied, redirecting to login');
          // Redirige vers la page de connexion si non connecté (ou page d'accueil)
          this.router.navigate(['/login']); // Ajustez la route de redirection
        }
      })
    );
  }
}