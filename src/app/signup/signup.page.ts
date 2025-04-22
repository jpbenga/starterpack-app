import { Component } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import {
  IonHeader, IonToolbar, IonButtons, IonBackButton, IonTitle, IonContent, IonCard,
  IonCardHeader, IonCardTitle, IonCardContent, IonList, IonItem, IonInput, IonIcon,
  IonButton, IonText, LoadingController, ToastController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { mailOutline, lockClosedOutline, personAddOutline, arrowBackOutline } from 'ionicons/icons';
import { AuthService } from '../services/auth.service'; // Ajustez le chemin si besoin

@Component({
  selector: 'app-signup',
  templateUrl: './signup.page.html',
  styleUrls: ['./signup.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    IonHeader, IonToolbar, IonButtons, IonBackButton, IonTitle, IonContent, IonCard,
    IonCardHeader, IonCardTitle, IonCardContent, IonList, IonItem, IonInput, IonIcon,
    IonButton, IonText
  ]
})
export class SignupPage {

  credentials = { email: '', password: '' };
  errorMessage: string | null = null;

  constructor(
    private authService: AuthService,
    private router: Router,
    private loadingCtrl: LoadingController,
    private toastCtrl: ToastController
  ) {
    addIcons({ mailOutline, lockClosedOutline, personAddOutline, arrowBackOutline });
  }

  async signupEmail() {
    this.errorMessage = null;
    const loading = await this.loadingCtrl.create({ message: 'Création du compte...' });
    await loading.present();

    try {
      const user = await this.authService.signUpWithEmail(this.credentials.email, this.credentials.password);
      await loading.dismiss();
      if (user) {
        await this.presentToast('Inscription réussie ! Vous êtes connecté.', 'success');
        this.router.navigate(['/home']); // Redirige vers l'accueil après succès
      } else {
        this.errorMessage = "Échec de l'inscription."; // Au cas où le service ne lèverait pas d'erreur mais ne retournerait pas d'utilisateur
      }
    } catch (error: any) {
      await loading.dismiss();
      this.errorMessage = error?.message || "Erreur lors de l'inscription.";
      console.error(error);
       // Note: L'AuthService peut déjà afficher des alertes pour les erreurs communes
    }
  }

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