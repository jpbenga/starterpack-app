import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import {
  IonContent, IonImg, IonButton, IonHeader, IonToolbar, IonTitle, IonCard,
  IonCardHeader, IonCardContent, IonIcon, IonText,
  IonButtons, Platform,
  ToastController, LoadingController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { checkmarkDoneOutline , cloudUploadOutline, checkmarkCircleOutline, imageOutline, alertCircleOutline, logOutOutline, personCircleOutline, logInOutline, libraryOutline, giftOutline, refreshOutline, sendOutline, mailUnreadOutline, lockClosedOutline, personAddOutline, logoGoogle, arrowBackOutline, mailOutline, idCardOutline, shieldCheckmarkOutline, star } from 'ionicons/icons';
import { ApiService } from '../services/api.service';
import { AuthService } from '../services/auth.service';
import { AdMob, AdOptions, BannerAdOptions, BannerAdSize, BannerAdPosition, InterstitialAdPluginEvents } from '@capacitor-community/admob';
import { Subscription } from 'rxjs';
import { PluginListenerHandle } from '@capacitor/core';

interface FunctionResponse {
  generatedImageUrl: string;
}

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
    IonCardContent, IonButton, IonIcon, IonImg, IonText,
    IonButtons,
  ],
})
export class HomePage implements OnInit, OnDestroy {
  thumbnail: string | null = null;
  selectedFile: File | null = null;
  isPremium = false;
  private authSubscription: Subscription | null = null;
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
    addIcons({ checkmarkDoneOutline , cloudUploadOutline, checkmarkCircleOutline, imageOutline, alertCircleOutline, logOutOutline, personCircleOutline, logInOutline, libraryOutline, giftOutline, refreshOutline, sendOutline, mailUnreadOutline, lockClosedOutline, personAddOutline, logoGoogle, arrowBackOutline, mailOutline, idCardOutline, shieldCheckmarkOutline, star });
    this.addInterstitialListeners(); // Appel de la méthode (qui est maintenant async)
  }

  ngOnInit() {
    this.premiumStatusSubscription = this.authService.isPremium$.subscribe(isPremium => {
        this.isPremium = isPremium;
        console.log('HomePage: User premium status updated:', this.isPremium);
        if (!this.isPremium) {
            this.prepareInterstitial();
        } else {
            this.hideAndRemoveBanner();
        }
    });
  }

  ngOnDestroy() {
    this.authSubscription?.unsubscribe();
    this.premiumStatusSubscription?.unsubscribe();
    this.removeInterstitialListeners(); // Appel de la méthode de nettoyage
    this.hideAndRemoveBanner();
 }

  ionViewWillEnter() {
    this.authService.forceClaimRefresh();
    if (!this.isPremium && !this.interstitialLoaded) {
      this.prepareInterstitial();
    }
  }

  ionViewWillLeave() {
    this.hideAndRemoveBanner();
  }

  onFileSelected(event: any) {
    const file: File = event.target.files[0];
    this.thumbnail = null;
    this.selectedFile = null;
    if (!file) { return; }
    const allowedTypes = ['image/jpeg', 'image/png', 'image/bmp'];
    const fileType = file.type;
    if (!allowedTypes.includes(fileType)) {
      this.presentToast('Type de fichier invalide...', 'danger', 'alert-circle-outline');
      event.target.value = null; return;
    }
    this.selectedFile = file;
    const reader = new FileReader();
    reader.onload = (e: any) => { this.thumbnail = e.target.result; this.presentToast('Image sélectionnée !', 'success', 'checkmark-circle-outline'); };
    reader.onerror = (error) => { console.error('FileReader error:', error); this.presentToast('Erreur lecture fichier.', 'danger'); };
    reader.readAsDataURL(file);
  }

  async validateImage() {
    console.log('validateImage called');
    if (!this.isPremium) {
        this.presentToast('La génération est réservée aux membres Premium.', 'warning', 'lock-closed-outline');
        this.goToSubscriptionPage();
        return;
    }

    const currentUserId = this.authService.getCurrentUserId();
    if (!this.selectedFile || !currentUserId || !this.thumbnail) {
      this.presentToast('Veuillez sélectionner une image valide.', 'warning');
      if (!currentUserId) { console.error("User ID from AuthService is null!"); } return;
    }

    let loading: HTMLIonLoadingElement | null = null;

    try {
      loading = await this.loadingCtrl.create({ message: 'Génération de l\'image...', spinner: 'crescent' });
      await loading.present();

      console.log(`HomePage: Appel de generateImageApiCall pour l'utilisateur ${currentUserId}`);
      const response = await this.apiService.generateImageApiCall(currentUserId, this.thumbnail);

      await loading.dismiss();
      loading = null;

      if (response && response.generatedImageUrl) {
        console.log('Appel API réussi. Image générée :', response.generatedImageUrl);
        await this.presentToast('Image générée avec succès !', 'success');
        console.log("URL de l'image générée : ", response.generatedImageUrl);
        this.router.navigate(['/bibliotheque']);

      } else {
        console.error("Réponse invalide reçue du service : ", response);
        throw new Error("La réponse reçue après génération est invalide.");
      }

    } catch (error: any) {
      console.error("Erreur dans validateImage", error);
       if (loading) {
         await loading.dismiss();
         loading = null;
       }
       let errorMessage = 'Une erreur est survenue lors de la génération.';
       if (error?.error?.error) { errorMessage = `Erreur fonction : ${error.error.error}`; }
       else if (error?.message) { errorMessage = `Erreur : ${error.message}`; }
       else if (typeof error?.error === 'string') { errorMessage = error.error; }
       await this.presentToast(errorMessage, 'danger');
    }
  }

  async showBannerAd() {
     if (this.isPremium) return;
     const adUnitId = this.platform.is('ios') ? 'ca-app-pub-3940256099942544/2934735716' : 'ca-app-pub-3940256099942544/6300978111';
     const options: BannerAdOptions = { adId: adUnitId, adSize: BannerAdSize.ADAPTIVE_BANNER, position: BannerAdPosition.BOTTOM_CENTER, margin: 0, isTesting: true };
     try { await AdMob.showBanner(options); console.log('Banner ad should be visible'); }
     catch (err) { console.error('Error showing banner ad', err); }
  }

  async hideAndRemoveBanner() {
     await AdMob.hideBanner().catch(err => console.error('Error hiding banner', err));
     await AdMob.removeBanner().catch(err => console.error('Error removing banner', err));
  }

  async prepareInterstitial() {
    if (this.isPremium || this.interstitialLoaded) return;
    const adUnitId = this.platform.is('ios') ? 'ca-app-pub-3940256099942544/4411468910' : 'ca-app-pub-3940256099942544/1033173712';
    const options: AdOptions  = { adId: adUnitId, isTesting: true };
    try {
      console.log('Preparing interstitial ad...');
      await AdMob.prepareInterstitial(options);
    } catch (err) {
      console.error('Error preparing interstitial ad', err);
      this.interstitialLoaded = false;
    }
  }

  async showPreparedInterstitial() {
     if (this.isPremium) return;
     if (this.interstitialLoaded) {
       console.log('Showing prepared interstitial ad...');
       try {
         await AdMob.showInterstitial();
         this.interstitialLoaded = false;
         this.prepareInterstitial();
       } catch (err) {
         console.error('Error showing interstitial ad', err);
         this.interstitialLoaded = false;
       }
     } else {
       console.log('Interstitial ad was not loaded, skipping show.');
       this.prepareInterstitial();
     }
  }

  // *** CORRECTION ICI : Ajout de 'async' ***
  async addInterstitialListeners(): Promise<void> {
    try {
        // *** CORRECTION ICI : Ajout de 'await' ***
        const loadedHandle = await AdMob.addListener(InterstitialAdPluginEvents.Loaded, () => {
          console.log('Interstitial Ad Loaded');
          this.interstitialLoaded = true;
        });
        // *** CORRECTION ICI : Ajout de 'await' ***
        const failedLoadHandle = await AdMob.addListener(InterstitialAdPluginEvents.FailedToLoad, (err: any) => {
          console.error('Interstitial Ad Failed to Load', err);
          this.interstitialLoaded = false;
        });
        // *** CORRECTION ICI : Ajout de 'await' ***
        const dismissedHandle = await AdMob.addListener(InterstitialAdPluginEvents.Dismissed, () => {
          console.log('Interstitial Ad Dismissed');
          this.interstitialLoaded = false;
          if (!this.isPremium) this.prepareInterstitial();
        });
        // *** CORRECTION ICI : Ajout de 'await' ***
        const failedShowHandle = await AdMob.addListener(InterstitialAdPluginEvents.FailedToShow, (err: any) => {
          console.error('Interstitial Ad Failed to Show', err);
          this.interstitialLoaded = false;
        });
        // *** CORRECTION ICI : Ajout de 'await' ***
        const showedHandle = await AdMob.addListener(InterstitialAdPluginEvents.Showed, () => {
          console.log('Interstitial Ad Showed');
        });

        // Stocker les handles une fois les promesses résolues
        this.interstitialListeners.push(loadedHandle, failedLoadHandle, dismissedHandle, failedShowHandle, showedHandle);
    } catch (error) {
        console.error("Error adding AdMob listeners", error);
        // Gérer l'erreur si l'ajout d'un listener échoue
    }
  }

  removeInterstitialListeners(): void {
    // Utiliser Promise.all pour s'assurer que toutes les suppressions sont tentées
    // même si une échoue (bien que .remove() soit généralement synchrone ici)
    Promise.all(this.interstitialListeners.map(handle => handle?.remove()))
      .catch(err => console.error("Error removing AdMob listeners", err))
      .finally(() => {
        this.interstitialListeners = []; // Vider le tableau dans tous les cas
      });
  }

  navigateToLogin() { this.router.navigate(['/login']); }
  navigateToAccount() { this.router.navigate(['/mon-compte']); }
  navigateToLibrary() { this.router.navigate(['/bibliotheque']); }

  goToSubscriptionPage() {
    console.log('Navigating to subscription page...');
    this.router.navigate(['/subscription']);
  }

  async logout() {
    await this.authService.signOutUser();
    this.presentToast('Vous avez été déconnecté.', 'medium');
    this.router.navigate(['/login']);
  }

  async presentToast(message: string, color: string = 'primary', icon?: string) {
    const toast = await this.toastCtrl.create({ message: message, duration: 3500, position: 'bottom', color: color, icon: icon, buttons: [ { text: 'OK', role: 'cancel' } ] });
    await toast.present();
  }
}
