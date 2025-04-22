// src/app/services/auth.service.ts
import { Injectable } from '@angular/core';
import { Auth, authState, signInWithPopup, GoogleAuthProvider, signInAnonymously, signOut, User, signInWithEmailAndPassword, createUserWithEmailAndPassword, linkWithCredential, EmailAuthProvider, sendEmailVerification  } from '@angular/fire/auth';
import { Observable, of } from 'rxjs';
import { switchMap, take, tap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  readonly user$: Observable<User | null> = authState(this.auth); // Observable de l'état d'authentification
  private anonymousUserId: string | null = null; // Pour garder une trace si besoin

  constructor(private auth: Auth) {
    // Optionnel: garder l'UID anonyme en mémoire
    this.user$.pipe(take(1)).subscribe(user => {
        if (user?.isAnonymous) {
            this.anonymousUserId = user.uid;
            console.log('AuthService: Anonymous user detected:', this.anonymousUserId);
        }
    });
  }

  // Connexion/Inscription Anonyme (si non connecté)
  async signInAnonymouslyIfNeeded(): Promise<User | null> {
    if (!this.auth.currentUser) {
      try {
        const userCredential = await signInAnonymously(this.auth);
        this.anonymousUserId = userCredential.user.uid;
        console.log('Signed in anonymously:', this.anonymousUserId);
        return userCredential.user;
      } catch (error) {
        console.error("Anonymous sign-in error", error);
        return null;
      }
    }
    return this.auth.currentUser;
  }

  // Connexion Google
  async signInWithGoogle(): Promise<User | null> {
    const provider = new GoogleAuthProvider();
    try {
        const userCredential = await signInWithPopup(this.auth, provider);

        // Tenter de lier si l'utilisateur était anonyme avant
        if (this.anonymousUserId && this.auth.currentUser && !this.auth.currentUser.isAnonymous) {
            // Note : La liaison directe après popup peut être complexe.
            // Une approche est de détecter si l'email existe déjà (erreur)
            // ou de gérer la liaison explicitement.
            // Pour simplifier ici, on loggue juste.
             console.log('Signed in with Google. Previous anonymous ID:', this.anonymousUserId);
             this.anonymousUserId = null; // Réinitialiser l'ID anonyme après liaison/connexion
        }
        return userCredential.user;
    } catch (error: any) {
        // Gérer les erreurs spécifiques (ex: compte existe déjà avec autre provider)
        console.error("Google sign-in error", error);
         if (error.code === 'auth/account-exists-with-different-credential') {
             // Tenter de lier ? Ou demander à l'utilisateur de se connecter autrement ?
             alert("Un compte existe déjà avec cet email via une autre méthode de connexion.");
         }
        return null;
    }
  }

   // Connexion Email/Mot de passe
   async signInWithEmail(email: string, password: string): Promise<User | null> {
       try {
           const userCredential = await signInWithEmailAndPassword(this.auth, email, password);
           this.anonymousUserId = null; // Réinitialiser
           console.log('Signed in with email');
           return userCredential.user;
       } catch (error) {
           console.error("Email sign-in error", error);
           alert("Email ou mot de passe incorrect."); // Message simple
           return null;
       }
   }

    // Inscription Email/Mot de passe
    async signUpWithEmail(email: string, password: string): Promise<User | null> {
        const currentUser = this.auth.currentUser;
        try {
            if (currentUser && currentUser.isAnonymous) {
                // Lier le compte anonyme au nouveau compte Email/Password
                const credential = EmailAuthProvider.credential(email, password);
                const userCredential = await linkWithCredential(currentUser, credential);
                console.log('Anonymous account linked with email');
                this.anonymousUserId = null; // Réinitialiser
                return userCredential.user;
            } else {
                // Créer un nouveau compte directement
                const userCredential = await createUserWithEmailAndPassword(this.auth, email, password);
                console.log('Signed up with email');
                if (userCredential?.user) {
                  try {
                      await sendEmailVerification(userCredential.user);
                      console.log('Verification email sent.');
                  } catch (verificationError) {
                      console.error('Error sending verification email', verificationError);
                      // Optionnel: Informer l'utilisateur que l'email n'a pas pu être envoyé
                      // mais l'inscription a quand même réussi à ce stade.
                  }
              }
                this.anonymousUserId = null; // Réinitialiser
                return userCredential.user;
            }
        } catch (error: any) {
            console.error("Email sign-up/link error", error);
             if (error.code === 'auth/email-already-in-use') {
                 alert("Cet email est déjà utilisé par un autre compte.");
             } else {
                 alert("Erreur lors de l'inscription.");
             }
            return null;
        }
    }

  // Déconnexion
  async signOutUser(): Promise<void> {
    try {
        await signOut(this.auth);
        this.anonymousUserId = null; // Réinitialiser
        console.log('User signed out.');
        // Optionnel : Forcer une connexion anonyme après déconnexion ?
        // await this.signInAnonymouslyIfNeeded();
    } catch (error) {
        console.error("Sign out error", error);
    }
  }

  // Obtenir l'UID actuel (anonyme ou connecté)
  getCurrentUserId(): string | null {
      return this.auth.currentUser?.uid || null;
  }
}