import { Injectable } from '@angular/core';
import { Auth, authState, signInWithPopup, GoogleAuthProvider, signInAnonymously, signOut, User, signInWithEmailAndPassword, createUserWithEmailAndPassword, linkWithCredential, EmailAuthProvider, sendEmailVerification, getIdTokenResult } from '@angular/fire/auth';
import { Observable, of, BehaviorSubject } from 'rxjs';
import { switchMap, take, tap, shareReplay, map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  readonly user$: Observable<User | null> = authState(this.auth);
  private anonymousUserId: string | null = null;

  private _isPremiumSubject = new BehaviorSubject<boolean>(false);
  public readonly isPremium$: Observable<boolean>;

  constructor(private auth: Auth) {
    this.user$.pipe(take(1)).subscribe(user => {
        if (user?.isAnonymous) {
            this.anonymousUserId = user.uid;
            console.log('AuthService: Anonymous user detected:', this.anonymousUserId);
        }
    });

    this.isPremium$ = this.user$.pipe(
      switchMap(user => {
        if (user) {
          return getIdTokenResult(user, true).then(idTokenResult => {
            const isPremium = idTokenResult?.claims['premium'] === true;
            this._isPremiumSubject.next(isPremium);
            console.log('User claims:', idTokenResult?.claims);
            return isPremium;
          }).catch(error => {
            console.error('Error getting ID token result:', error);
            this._isPremiumSubject.next(false);
            return false;
          });
        } else {
          this._isPremiumSubject.next(false);
          return of(false);
        }
      }),
      shareReplay(1)
    );

    this.isPremium$.subscribe();
  }

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

  // --- Méthode signInWithGoogle modifiée ---
  async signInWithGoogle(): Promise<User | null> {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({
      prompt: 'select_account' // Force l'affichage du sélecteur de compte
    });
    try {
        const userCredential = await signInWithPopup(this.auth, provider);
        if (this.anonymousUserId && this.auth.currentUser && !this.auth.currentUser.isAnonymous) {
            console.log('Signed in with Google. Previous anonymous ID:', this.anonymousUserId);
            this.anonymousUserId = null;
        } else if (!this.anonymousUserId && userCredential.user) {
             this.forceClaimRefresh();
        }
        return userCredential.user;
    } catch (error: any) {
        console.error("Google sign-in error", error);
         if (error.code === 'auth/account-exists-with-different-credential') {
             alert("Un compte existe déjà avec cet email via une autre méthode de connexion.");
         }
        return null;
    }
  }
  // --- Fin de la méthode modifiée ---

   async signInWithEmail(email: string, password: string): Promise<User | null> {
       try {
           const userCredential = await signInWithEmailAndPassword(this.auth, email, password);
           this.anonymousUserId = null;
           console.log('Signed in with email');
           this.forceClaimRefresh();
           return userCredential.user;
       } catch (error) {
           console.error("Email sign-in error", error);
           alert("Email ou mot de passe incorrect.");
           return null;
       }
   }

    async signUpWithEmail(email: string, password: string): Promise<User | null> {
        const currentUser = this.auth.currentUser;
        try {
            if (currentUser && currentUser.isAnonymous) {
                const credential = EmailAuthProvider.credential(email, password);
                const userCredential = await linkWithCredential(currentUser, credential);
                console.log('Anonymous account linked with email');
                this.anonymousUserId = null;
                this.forceClaimRefresh();
                 if (userCredential.user && !userCredential.user.emailVerified) {
                    try {
                        await sendEmailVerification(userCredential.user);
                        console.log('Verification email sent after linking.');
                    } catch (verificationError) {
                        console.error('Error sending verification email after linking', verificationError);
                    }
                }
                return userCredential.user;
            } else {
                const userCredential = await createUserWithEmailAndPassword(this.auth, email, password);
                console.log('Signed up with email');
                if (userCredential?.user) {
                    try {
                        await sendEmailVerification(userCredential.user);
                        console.log('Verification email sent.');
                    } catch (verificationError) {
                        console.error('Error sending verification email', verificationError);
                    }
                }
                this.anonymousUserId = null;
                this.forceClaimRefresh();
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

  async signOutUser(): Promise<void> {
    try {
      await signOut(this.auth);
      this.anonymousUserId = null;
      this._isPremiumSubject.next(false);
      console.log('User signed out.');
    } catch (error) {
      console.error("Sign out error", error);
    }
  }

  getCurrentUserId(): string | null {
      return this.auth.currentUser?.uid || null;
  }

  async forceClaimRefresh(): Promise<boolean> {
    const user = this.auth.currentUser;
    if (user) {
      try {
        const idTokenResult = await getIdTokenResult(user, true);
        const isPremium = idTokenResult?.claims['premium'] === true;
        this._isPremiumSubject.next(isPremium);
        console.log('Claims refreshed:', idTokenResult?.claims);
        return isPremium;
      } catch (error) {
        console.error('Error forcing claim refresh:', error);
        this._isPremiumSubject.next(false);
        return false;
      }
    }
    if (this._isPremiumSubject.value !== false) {
        this._isPremiumSubject.next(false);
    }
    return false;
  }
}
