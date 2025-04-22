import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { take } from 'rxjs/operators';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonIcon, IonText, IonButton,
  IonSpinner, IonButtons, LoadingController, ToastController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { mailUnreadOutline, sendOutline, refreshOutline, logOutOutline } from 'ionicons/icons';
import { AuthService } from '../services/auth.service'; // Ajustez si besoin
import { Auth, sendEmailVerification, User } from '@angular/fire/auth'; // Importer Auth et sendEmailVerification

@Component({
  selector: 'app-verify-email',
  templateUrl: './verify-email.page.html',
  styleUrls: ['./verify-email.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    IonHeader, IonToolbar, IonTitle, IonContent, IonIcon, IonText, IonButton,
    IonSpinner, IonButtons
  ]
})
export class VerifyEmailPage implements OnInit, OnDestroy {

  userEmail: string | null = null;
  isResending = false;
  resendDisabled = false;
  private userSubscription: Subscription | null = null;
  private currentUser: User | null = null;

  constructor(
    private authService: AuthService,
    private auth: Auth, // Injecter Auth directement pour reload/sendEmailVerification
    private router: Router,
    private loadingCtrl: LoadingController,
    private toastCtrl: ToastController
  ) {
    addIcons({ mailUnreadOutline, sendOutline, refreshOutline, logOutOutline });
  }

  ngOnInit() {
    this.userSubscription = this.authService.user$.subscribe(user => {
      this.currentUser = user; // Garder une référence à l'utilisateur actuel
      if (user) {
        this.userEmail = user.email;
        // Si l'utilisateur est déjà vérifié (ex: rechargement page après clic lien), rediriger
        if (user.emailVerified) {
          this.router.navigate(['/home'], { replaceUrl: true });
        }
      } else {
        // Si pas d'utilisateur, rediriger vers login
        this.router.navigate(['/login'], { replaceUrl: true });
      }
    });
  }

  ngOnDestroy() {
    // Se désabonner pour éviter les fuites mémoire
    this.userSubscription?.unsubscribe();
  }

  async resendVerificationEmail() {
    if (!this.currentUser || this.currentUser.emailVerified) {
      this.presentToast('Votre email est déjà vérifié ou vous n\'êtes pas connecté.', 'warning');
      return;
    }

    this.isResending = true;
    this.resendDisabled = true;

    try {
      await sendEmailVerification(this.currentUser);
      await this.presentToast('Email de vérification renvoyé ! Vérifiez votre boîte mail (y compris les spams).', 'success');
    } catch (error) {
      console.error("Error resending verification email", error);
      await this.presentToast('Erreur lors du renvoi de l\'email.', 'danger');
    } finally {
      this.isResending = false;
      // Réactiver le bouton après 60 secondes
      setTimeout(() => { this.resendDisabled = false; }, 60000);
    }
  }

  async checkVerificationStatus() {
    if (!this.currentUser) {
       this.presentToast('Utilisateur non trouvé.', 'danger');
       return;
    }

    const loading = await this.loadingCtrl.create({ message: 'Vérification du statut...' });
    await loading.present();

    try {
        await this.currentUser.reload(); // Force la mise à jour de l'état utilisateur depuis Firebase
        // Récupérer l'état frais après reload
        const freshUser = this.auth.currentUser;

        if (freshUser?.emailVerified) {
            await loading.dismiss();
            await this.presentToast('Email vérifié avec succès !', 'success');
            this.router.navigate(['/home'], { replaceUrl: true }); // Rediriger vers l'accueil
        } else {
            await loading.dismiss();
            await this.presentToast('Votre email n\'est pas encore vérifié. Veuillez cliquer sur le lien dans l\'email.', 'warning');
        }
    } catch (error) {
        await loading.dismiss();
        console.error("Error checking verification status", error);
        await this.presentToast('Erreur lors de la vérification du statut.', 'danger');
    }
  }

  async logout() {
    await this.authService.signOutUser();
    this.router.navigate(['/login'], { replaceUrl: true }); // Rediriger vers login après déconnexion
  }

  async presentToast(message: string, color: string = 'primary', icon?: string) {
    const toast = await this.toastCtrl.create({
      message: message,
      duration: 3500, // Durée légèrement augmentée
      position: 'bottom',
      color: color,
      icon: icon,
      buttons: [ { text: 'OK', role: 'cancel' } ]
    });
    await toast.present();
  }
}