// src/app/guards/auth.guard.ts
import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree, Router } from '@angular/router';
import { Observable } from 'rxjs';
import { map, take, tap } from 'rxjs/operators';
import { AuthService } from '../services/auth.service'; // Importer AuthService

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {

  constructor(private authService: AuthService, private router: Router) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot): Observable<boolean | UrlTree> { // Retourne un Observable

    return this.authService.user$.pipe(
      take(1),
      map(user => {
          const isLoggedIn = !!user && !user.isAnonymous;
          const isVerified = !!user?.emailVerified; // Vérifie si emailVerified est true

          // Autorisé seulement si connecté ET email vérifié
          return isLoggedIn && isVerified;
      }),
      tap(isAllowed => {
        if (!isAllowed) {
          console.log('AuthGuard: Access denied (not logged in or not verified), redirecting...');
          // Rediriger vers login ou une page spécifique si l'email n'est pas vérifié
          // Peut-être vérifier l'état pour choisir la redirection
          if (this.authService.getCurrentUserId() && !this.auth.currentUser?.emailVerified) {
             this.router.navigate(['/verify-email']); // Page de vérification
          } else {
             this.router.navigate(['/login']); // Page de connexion
          }
        }
      })
    );
  }
   // Injecter Auth pour vérifier emailVerified dans le tap si besoin
   private get auth() { return this.authService['auth']; } // Accès privé à l'instance Auth si nécessaire
}
