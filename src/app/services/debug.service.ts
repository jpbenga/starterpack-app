import { Injectable, NgZone } from '@angular/core';
import { Functions, httpsCallable } from '@angular/fire/functions'; // Nouvelle API Functions
import { AuthService } from './auth.service'; // Assurez-vous que le chemin est correct
import { firstValueFrom } from 'rxjs';
import { take } from 'rxjs/operators';
import { ToastController } from '@ionic/angular/standalone'; // Pour les messages
import { environment } from '../../environments/environment'; // Pour vérifier si on est en dev

@Injectable({
  providedIn: 'root'
})
export class DebugService {

  constructor(
    private functions: Functions,
    private authService: AuthService,
    private toastCtrl: ToastController,
    private ngZone: NgZone
  ) {}

  /**
   * Appelle directement la fonction Cloud 'grantPremiumAccess'.
   * À n'utiliser QUE pour le développement et les tests.
   */
  async grantPremiumForDevelopment(): Promise<boolean> {
    // Sécurité : Vérifier si on est bien en mode développement
    if (environment.production) {
      console.warn('DebugService: Attempted to grant premium in production mode. Aborted.');
      await this.presentToast('Opération non autorisée en production.', 'danger');
      return false;
    }

    try {
      // Vérifier si l'utilisateur est connecté
      const user = await firstValueFrom(this.authService.user$.pipe(take(1)));
      if (!user) {
        console.error('DebugService: User not logged in.');
        await this.presentToast('Vous devez être connecté pour cette action.', 'warning');
        return false;
      }

      console.log('DebugService: Calling grantPremiumAccess cloud function (simulation)...');
      const callable = httpsCallable(this.functions, 'grantPremiumAccess');
      const result = await callable({}); // Aucun argument nécessaire pour cette fonction
      console.log('DebugService: grantPremiumAccess function result:', result.data);

      const data = result.data as { success?: boolean; message?: string };

      if (data.success) {
        console.log('DebugService: grantPremiumAccess function reported success.');
        // Important: Forcer le rafraîchissement des claims
        this.ngZone.run(async () => {
            await this.authService.forceClaimRefresh();
        });
        await this.presentToast('Accès Premium simulé avec succès !', 'success');
        return true;
      } else {
        console.error('DebugService: grantPremiumAccess function reported failure:', data.message);
        await this.presentToast(`Échec de la simulation : ${data.message || 'Erreur inconnue'}`, 'danger');
        return false;
      }
    } catch (error: any) {
      console.error('DebugService: Error calling grantPremiumAccess function:', error);
      await this.presentToast(`Erreur lors de l'appel : ${error.message || 'Erreur inconnue'}`, 'danger');
      return false;
    }
  }

  // Helper pour afficher des toasts (copié/adapté depuis HomePage)
  async presentToast(message: string, color: string = 'primary', icon?: string) {
    const toast = await this.toastCtrl.create({
        message: message,
        duration: 3500,
        position: 'bottom',
        color: color,
        icon: icon,
        buttons: [{ text: 'OK', role: 'cancel' }]
    });
    await toast.present();
  }
}
