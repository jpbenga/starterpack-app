import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import {
  IonHeader, IonToolbar, IonButtons, IonBackButton, IonTitle, IonContent, IonCard,
  IonCardHeader, IonCardTitle, IonCardContent, IonList, IonItem, IonIcon, IonLabel,
  IonButton, Platform, ToastController, IonCardSubtitle, IonText // Ajouter ToastController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { mailOutline, logOutOutline, idCardOutline, shieldCheckmarkOutline, libraryOutline, arrowBackOutline, bugOutline, starOutline } from 'ionicons/icons'; // Ajouter bugOutline, starOutline
import { AuthService } from '../services/auth.service';
import { DebugService } from '../services/debug.service'; // <<< Importer DebugService
import { environment } from '../../environments/environment'; // <<< Importer environment
import { AdMob, BannerAdOptions, BannerAdSize, BannerAdPosition, BannerAdPluginEvents, AdLoadInfo } from '@capacitor-community/admob';
import { Subscription } from 'rxjs';

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
    IonButton, IonCardSubtitle, IonText
  ]
})
export class MonComptePage implements OnInit, OnDestroy {

  isPremium = false;
  private authSubscription: Subscription | null = null;
  private premiumStatusSubscription: Subscription | null = null; // Pour suivre isPremium$
  public readonly isDevelopmentMode = !environment.production; // <<< Rendre accessible au template

  constructor(
    public authService: AuthService, // Déjà public
    private debugService: DebugService, // <<< Injecter DebugService
    private router: Router,
    private platform: Platform,
    private toastCtrl: ToastController // Injecter ToastController si DebugService ne l'a pas déjà
  ) {
    addIcons({ mailOutline, logOutOutline, idCardOutline, shieldCheckmarkOutline, libraryOutline, arrowBackOutline, bugOutline, starOutline }); // Ajouter les nouvelles icônes
  }

  ngOnInit() {
    // S'abonner à isPremium$ pour mettre à jour la variable locale et gérer la bannière
    this.premiumStatusSubscription = this.authService.isPremium$.subscribe(isPremium => {
        this.isPremium = isPremium;
        console.log('MonComptePage: User premium status updated:', this.isPremium);
        if (!this.isPremium) {
            this.showBannerAd(); // Montrer la bannière si non premium
        } else {
            this.hideAndRemoveBanner(); // Cacher si devient premium
        }
    });
  }

  ngOnDestroy() {
     this.authSubscription?.unsubscribe(); // Si jamais réutilisé
     this.premiumStatusSubscription?.unsubscribe();
     this.hideAndRemoveBanner();
  }

  ionViewWillEnter() {
     console.log('ionViewWillEnter MonComptePage, isPremium:', this.isPremium);
     // Rafraîchir les claims au cas où
     this.authService.forceClaimRefresh();
     // La logique de la bannière est maintenant dans l'abonnement ngOnInit
  }

  ionViewWillLeave() {
    console.log('ionViewWillLeave MonComptePage');
    this.hideAndRemoveBanner();
  }

  // <<< Nouvelle méthode pour appeler le service de debug >>>
  async simulatePremiumToggle() {
    if (!this.isDevelopmentMode) return; // Sécurité supplémentaire

    // Vérifier l'état actuel pour décider si on accorde ou si on tente de retirer (non implémenté côté backend)
    // Pour l'instant, on ne fait qu'accorder
    if (!this.isPremium) {
        console.log("MonComptePage: Triggering premium simulation...");
        await this.debugService.grantPremiumForDevelopment();
        // Le rafraîchissement des claims est déjà géré dans le DebugService
    } else {
        // Logique pour retirer le premium (nécessiterait une autre fonction Cloud)
        console.log("MonComptePage: Premium already active (simulation removal not implemented).");
        await this.presentToast('Premium déjà actif (simulation). Retrait non implémenté.', 'medium', 'starOutline');
    }
  }

  async showBannerAd() {
     // Vérification ajoutée pour s'assurer qu'on ne montre pas si premium
     if (this.isPremium) {
        console.log('MonComptePage: Skipping banner ad because user is premium.');
        return;
     }
     const adUnitId = this.platform.is('ios') ? 'ca-app-pub-3940256099942544/2934735716' : 'ca-app-pub-3940256099942544/6300978111';
     const options: BannerAdOptions = {
         adId: adUnitId,
         adSize: BannerAdSize.ADAPTIVE_BANNER,
         position: BannerAdPosition.BOTTOM_CENTER,
         margin: 0,
         isTesting: true,
     };

     try {
         console.log('MonComptePage: Attempting to show banner ad');
         // Supprimer les listeners ici pour éviter les duplications à chaque showBanner
         // AdMob.removeAllListeners(); // Peut être trop agressif si d'autres listeners existent
         await AdMob.showBanner(options);
         console.log('MonCompte banner ad should be visible');
     } catch (err) {
         console.error('MonCompte: Error showing banner ad', err);
     }
  }

  async hideAndRemoveBanner() {
     await AdMob.hideBanner().catch(err => console.error('MonCompte: Error hiding banner', err));
     await AdMob.removeBanner().catch(err => console.error('MonCompte: Error removing banner', err));
  }

  async logout() {
    await this.authService.signOutUser();
    this.router.navigate(['/login'], { replaceUrl: true });
  }

  // Helper Toast (si nécessaire, DebugService a déjà le sien)
  async presentToast(message: string, color: string = 'primary', icon?: string) {
    const toast = await this.toastCtrl.create({ message: message, duration: 3500, position: 'bottom', color: color, icon: icon, buttons: [ { text: 'OK', role: 'cancel' } ] });
    await toast.present();
  }
}
