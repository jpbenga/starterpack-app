import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import {
  IonContent, IonImg, IonButton, IonHeader, IonToolbar, IonTitle, IonCard,
  IonCardHeader, IonCardContent, IonIcon, IonText, IonButtons, Platform,
  ToastController, LoadingController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  checkmarkDoneOutline, cloudUploadOutline, checkmarkCircleOutline, imageOutline,
  alertCircleOutline, logOutOutline, personCircleOutline, logInOutline,
  libraryOutline, giftOutline, refreshOutline, sendOutline, mailUnreadOutline,
  lockClosedOutline, personAddOutline, logoGoogle, arrowBackOutline, mailOutline,
  idCardOutline, shieldCheckmarkOutline, star
} from 'ionicons/icons';
import { ApiService } from '../services/api.service';
import { AuthService } from '../services/auth.service';
import {
  AdMob, AdOptions, BannerAdOptions, BannerAdSize, BannerAdPosition, InterstitialAdPluginEvents
} from '@capacitor-community/admob';
import { Subscription } from 'rxjs';
import { PluginListenerHandle } from '@capacitor/core';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    IonHeader, IonToolbar, IonTitle, IonContent, IonCard, IonCardHeader,
    IonCardContent, IonButton, IonIcon, IonImg, IonText, IonButtons,
  ],
})
export class HomePage implements OnInit, OnDestroy {
  thumbnail: string | null = null;
  selectedFile: File | null = null;
  isPremium = false;
  private premiumStatusSubscription: Subscription | null = null;
  private interstitialLoaded = false;
  private interstitialListeners: PluginListenerHandle[] = [];

  constructor(
    private toastCtrl: ToastController,
    private loadingCtrl: LoadingController,
    private apiService: ApiService,
    public authService: AuthService,
    private router: Router,
    private platform: Platform
  ) {
    addIcons({
      checkmarkDoneOutline, cloudUploadOutline, checkmarkCircleOutline, imageOutline,
      alertCircleOutline, logOutOutline, personCircleOutline, logInOutline,
      libraryOutline, giftOutline, refreshOutline, sendOutline, mailUnreadOutline,
      lockClosedOutline, personAddOutline, logoGoogle, arrowBackOutline, mailOutline,
      idCardOutline, shieldCheckmarkOutline, star
    });
    this.addInterstitialListeners();
  }

  ngOnInit() {
    this.premiumStatusSubscription = this.authService.isPremium$.subscribe(value => {
      this.isPremium = value;
      console.log('HomePage: User premium status updated:', this.isPremium);
      if (!this.isPremium) {
        this.prepareInterstitial();
      } else {
        this.hideAndRemoveBanner(); // Nettoyer les pubs si premium
      }
    });
  }

  ngOnDestroy() {
    this.premiumStatusSubscription?.unsubscribe();
    this.removeInterstitialListeners();
    this.hideAndRemoveBanner();
  }

  ionViewWillEnter() {
    console.log('ionViewWillEnter HomePage, isPremium:', this.isPremium);
    this.authService.forceClaimRefresh(); // Toujours rafraîchir
    // La logique AdMob est gérée par l'abonnement ngOnInit
  }

  ionViewWillLeave() {
    console.log('ionViewWillLeave HomePage');
    this.hideAndRemoveBanner();
  }

  onFileSelected(event: any) {
    const file: File = event.target.files[0];
    this.thumbnail = null;
    this.selectedFile = null;
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/bmp'];
    if (!allowedTypes.includes(file.type)) {
      this.presentToast('Type de fichier invalide...', 'danger', 'alert-circle-outline');
      event.target.value = null;
      return;
    }

    this.selectedFile = file;
    const reader = new FileReader();
    reader.onload = (e: any) => {
      this.thumbnail = e.target.result;
      this.presentToast('Image sélectionnée !', 'success', 'checkmark-circle-outline');
    };
    reader.onerror = () => {
      console.error('FileReader error');
      this.presentToast('Erreur lecture fichier.', 'danger');
    };
    reader.readAsDataURL(file);
  }

  async validateImage() {
    console.log('validateImage called');
    // Retrait de la vérification if (!this.isPremium)

    const currentUserId = this.authService.getCurrentUserId();
    // Vérifier si l'utilisateur est connecté (anonyme ou non)
    if (!currentUserId) {
        this.presentToast('Veuillez vous connecter pour générer une image.', 'warning');
        this.navigateToLogin(); // Rediriger vers la connexion
        return;
    }
    // Vérifier si une image est sélectionnée
    if (!this.selectedFile || !this.thumbnail) {
      this.presentToast('Veuillez sélectionner une image valide.', 'warning');
      return;
    }

    let loading: HTMLIonLoadingElement | null = null;
    try {
      loading = await this.loadingCtrl.create({ message: 'Génération de l\'image...', spinner: 'crescent' });
      await loading.present();

      console.log(`HomePage: Calling generateImageApiCall for user ${currentUserId}`);
      const response = await this.apiService.generateImageApiCall(currentUserId, this.thumbnail);

      await loading.dismiss();
      loading = null;

      if (response?.generatedImageUrl) {
        console.log('API call successful. Generated image URL:', response.generatedImageUrl);
        await this.presentToast('Image générée avec succès !', 'success');

        // Afficher l'interstitiel UNIQUEMENT si l'utilisateur n'est PAS premium
        if (!this.isPremium) {
            await this.showPreparedInterstitial();
        }

        // Naviguer vers la bibliothèque après succès (et après potentiel interstitiel)
        this.router.navigate(['/bibliotheque']);

      } else {
        console.error("Invalid response received from service:", response);
        throw new Error("La réponse reçue après génération est invalide.");
      }
    } catch (error: any) {
      console.error("Error in validateImage", error);
      if (loading) {
        await loading.dismiss();
      }
      const message = error?.error?.error || error?.message || 'Une erreur est survenue lors de la génération.';
      await this.presentToast(message, 'danger');
    }
  }

  // --- AdMob Methods ---
  async showBannerAd() {
    if (this.isPremium || !this.platform.is('capacitor')) return;
    console.log('HomePage: showBannerAd called (currently inactive)');
  }

  async hideAndRemoveBanner() {
    if (!this.platform.is('capacitor')) return;
    await AdMob.hideBanner().catch(err => console.warn('HomePage: Error hiding banner', err));
    await AdMob.removeBanner().catch(err => console.warn('HomePage: Error removing banner', err));
  }

  async prepareInterstitial() {
    if (this.isPremium || this.interstitialLoaded || !this.platform.is('capacitor')) return;
    const adUnitId = this.platform.is('ios') ? 'ca-app-pub-3940256099942544/4411468910' : 'ca-app-pub-3940256099942544/1033173712';
    const options: AdOptions = { adId: adUnitId, isTesting: true };
    try {
      console.log('HomePage: Preparing interstitial ad...');
      await AdMob.prepareInterstitial(options);
    } catch (err) {
      console.error('HomePage: Error preparing interstitial ad', err);
      this.interstitialLoaded = false;
    }
  }

  async showPreparedInterstitial() {
     if (this.isPremium || !this.platform.is('capacitor')) return; // Double vérification
     if (this.interstitialLoaded) {
       console.log('HomePage: Showing prepared interstitial ad...');
       try {
         await AdMob.showInterstitial();
         this.interstitialLoaded = false; // Marquer comme utilisé
         // Précharger le suivant immédiatement
         this.prepareInterstitial();
       } catch (err) {
         console.error('HomePage: Error showing interstitial ad', err);
         this.interstitialLoaded = false;
       }
     } else {
       console.log('HomePage: Interstitial ad was not loaded, skipping show.');
       // Essayer de le charger pour la prochaine fois
       this.prepareInterstitial();
     }
  }

  async addInterstitialListeners(): Promise<void> {
    if (!this.platform.is('capacitor')) return;
    try {
        const loadedHandle = await AdMob.addListener(InterstitialAdPluginEvents.Loaded as any, () => {
          console.log('HomePage: Interstitial Ad Loaded');
          this.interstitialLoaded = true;
        });
        const failedLoadHandle = await AdMob.addListener(InterstitialAdPluginEvents.FailedToLoad as any, (err: any) => {
          console.error('HomePage: Interstitial Ad Failed to Load', err);
          this.interstitialLoaded = false;
        });
        const dismissedHandle = await AdMob.addListener(InterstitialAdPluginEvents.Dismissed as any, () => {
          console.log('HomePage: Interstitial Ad Dismissed');
          this.interstitialLoaded = false;
          // Précharger le suivant après fermeture
          if (!this.isPremium) this.prepareInterstitial();
        });
        const failedShowHandle = await AdMob.addListener(InterstitialAdPluginEvents.FailedToShow as any, (err: any) => {
          console.error('HomePage: Interstitial Ad Failed to Show', err);
          this.interstitialLoaded = false;
        });
        const showedHandle = await AdMob.addListener(InterstitialAdPluginEvents.Showed as any, () => {
          console.log('HomePage: Interstitial Ad Showed');
          // L'interstitiel est affiché
        });
        this.interstitialListeners.push(loadedHandle, failedLoadHandle, dismissedHandle, failedShowHandle, showedHandle);
    } catch (error) {
        console.error("HomePage: Error adding AdMob listeners", error);
    }
  }

  removeInterstitialListeners(): void {
    if (!this.platform.is('capacitor')) return;
    Promise.all(this.interstitialListeners.map(handle => handle?.remove()))
      .catch(err => console.error("HomePage: Error removing AdMob listeners", err))
      .finally(() => {
        this.interstitialListeners = [];
      });
  }

  // --- Navigation Methods ---
  navigateToLogin() {
    this.router.navigate(['/login']);
  }

  navigateToAccount() {
    this.router.navigate(['/mon-compte']);
  }

  navigateToLibrary() {
    this.router.navigate(['/bibliotheque']);
  }

  goToSubscriptionPage() {
    this.router.navigate(['/subscription']);
  }

  async logout() {
    await this.authService.signOutUser();
    this.presentToast('Vous avez été déconnecté.', 'medium');
    this.router.navigate(['/login']);
  }

  // --- Utility Methods ---
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
