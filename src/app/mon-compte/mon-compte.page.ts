import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import {
  IonHeader, IonToolbar, IonButtons, IonBackButton, IonTitle, IonContent, IonCard,
  IonCardHeader, IonCardTitle, IonCardContent, IonList, IonItem, IonIcon, IonLabel,
  IonButton
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { mailOutline, logOutOutline, idCardOutline, shieldCheckmarkOutline } from 'ionicons/icons';
import { AuthService } from '../services/auth.service'; // Ajustez chemin

@Component({
  selector: 'app-mon-compte',
  templateUrl: './mon-compte.page.html',
  styleUrls: ['./mon-compte.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    IonHeader, IonToolbar, IonButtons, IonBackButton, IonTitle, IonContent, IonCard,
    IonCardHeader, IonCardTitle, IonCardContent, IonList, IonItem, IonIcon, IonLabel,
    IonButton
  ]
})
export class MonComptePage {

  constructor(
    public authService: AuthService, // Public pour accès direct user$ dans le template
    private router: Router
  ) {
    addIcons({ mailOutline, logOutOutline, idCardOutline, shieldCheckmarkOutline });
  }

  async logout() {
    await this.authService.signOutUser();
    // Rediriger vers la page de connexion après déconnexion depuis le compte
    this.router.navigate(['/login'], { replaceUrl: true });
  }
}