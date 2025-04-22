import { Component } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import {
  IonHeader, IonToolbar, IonButtons, IonBackButton, IonTitle, IonContent, IonCard,
  IonCardHeader, IonCardTitle, IonCardContent, IonList, IonItem, IonInput, IonIcon,
  IonGrid, IonRow, IonCol, IonButton, IonText, LoadingController, ToastController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { mailOutline, lockClosedOutline, logInOutline, personAddOutline, logoGoogle, arrowBackOutline } from 'ionicons/icons';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule, // Nécessaire pour [(ngModel)]
    RouterModule, // Nécessaire pour ion-back-button (defaultHref) et la navigation
    IonHeader, IonToolbar, IonButtons, IonBackButton, IonTitle, IonContent, IonCard,
    IonCardHeader, IonCardTitle, IonCardContent, IonList, IonItem, IonInput, IonIcon,
    IonGrid, IonRow, IonCol, IonButton, IonText
  ]
})
export class LoginPage {

  credentials = { email: '', password: '' };
  errorMessage: string | null = null;

  constructor(
    private authService: AuthService,
    private router: Router,
    private loadingCtrl: LoadingController,
    private toastCtrl: ToastController // Optionnel pour feedback
  ) {
    addIcons({ mailOutline, lockClosedOutline, logInOutline, personAddOutline, logoGoogle, arrowBackOutline });
  }

  async loginEmail() {
    this.errorMessage = null;
    const loading = await this.loadingCtrl.create({ message: 'Connexion...' });
    await loading.present();

    try {
      const user = await this.authService.signInWithEmail(this.credentials.email, this.credentials.password);
      await loading.dismiss();
      if (user) {
        this.router.navigate(['/home']); // Redirige vers l'accueil après succès
      } else {
        // Géré dans le catch normalement, mais sécurité
        this.errorMessage = "Échec de la connexion.";
      }
    } catch (error: any) {
      await loading.dismiss();
      this.errorMessage = error?.message || "Email ou mot de passe incorrect."; // Afficher l'erreur
      console.error(error);
    }
  }

  navigateToSignup() {
    this.router.navigate(['/signup']); // Navigue vers la nouvelle page
  }

  async loginGoogle() {
    this.errorMessage = null;
    const loading = await this.loadingCtrl.create({ message: 'Connexion avec Google...' });
    await loading.present();

    try {
      const user = await this.authService.signInWithGoogle();
      await loading.dismiss();
      if (user) {
        this.router.navigate(['/home']); // Redirige vers l'accueil après succès
      } else {
         // L'AuthService peut avoir affiché une alerte, on met un message générique
         this.errorMessage = "Échec de la connexion Google.";
      }
    } catch (error: any) {
      await loading.dismiss();
      this.errorMessage = error?.message || "Erreur lors de la connexion Google.";
      console.error(error);
    }
  }

  // Copié depuis HomePage, peut être mis dans un service helper si besoin
  async presentToast(message: string, color: string = 'primary', icon?: string) {
    const toast = await this.toastCtrl.create({
      message: message,
      duration: 3000,
      position: 'bottom',
      color: color,
      icon: icon,
      buttons: [ { text: 'OK', role: 'cancel' } ]
    });
    await toast.present();
  }

}