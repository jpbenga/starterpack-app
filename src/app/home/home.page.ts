import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; // Assurez-vous qu'il est importé si vous utilisez ngModel ailleurs
import { Router, RouterModule } from '@angular/router';
import {
  IonContent, IonImg, IonButton, IonHeader, IonToolbar, IonTitle, IonCard,
  IonCardHeader, IonCardContent, IonIcon, IonText,
  IonButtons, Platform, // Ajouter Platform
  ToastController, LoadingController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { checkmarkDoneOutline , cloudUploadOutline, checkmarkCircleOutline, imageOutline, alertCircleOutline, logOutOutline, personCircleOutline, logInOutline, libraryOutline, giftOutline, refreshOutline, sendOutline, mailUnreadOutline, lockClosedOutline, personAddOutline, logoGoogle, arrowBackOutline, mailOutline, idCardOutline, shieldCheckmarkOutline } from 'ionicons/icons';
import { ApiService } from '../services/api.service';
import { AuthService } from '../services/auth.service';
import { AdMob, AdOptions, BannerAdOptions, BannerAdSize, BannerAdPosition, InterstitialAdPluginEvents } from '@capacitor-community/admob'; // Importer les types Interstitial
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
    FormsModule, // Ajouter si vous avez des ngModel
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
  private interstitialLoaded = false; // Flag pour savoir si l'interstitiel est prêt
  private interstitialListeners: PluginListenerHandle[] = [];

  constructor(
    private toastCtrl: ToastController,
    private loadingCtrl: LoadingController,
    private apiService: ApiService,
    public authService: AuthService,
    private router: Router,
    private platform: Platform
  ) {
    addIcons({ checkmarkDoneOutline , cloudUploadOutline, checkmarkCircleOutline, imageOutline, alertCircleOutline, logOutOutline, personCircleOutline, logInOutline, libraryOutline, giftOutline, refreshOutline, sendOutline, mailUnreadOutline, lockClosedOutline, personAddOutline, logoGoogle, arrowBackOutline, mailOutline, idCardOutline, shieldCheckmarkOutline });
    this.addInterstitialListeners(); // Ajouter les listeners pour l'interstitiel
  }

  ngOnInit() {
    this.authSubscription = this.authService.user$.subscribe(user => {
       user?.getIdTokenResult().then(idTokenResult => {
          this.isPremium = idTokenResult.claims['premium'] === true;
          console.log('HomePage: User premium status:', this.isPremium);
          // Précharger l'interstitiel si l'utilisateur n'est pas premium
          if (!this.isPremium) {
             this.prepareInterstitial();
          }
       }).catch(err => {
           console.error("HomePage: Error getting token results for premium check", err);
           this.isPremium = false;
           this.prepareInterstitial(); // Tenter de précharger même si erreur lecture statut
       });
    });
  }

  ngOnDestroy() {
    this.authSubscription?.unsubscribe();
    this.removeInterstitialListeners(); // <<< Appel de la nouvelle méthode
    this.hideAndRemoveBanner();
 }

  ionViewWillEnter() {
    // Précharger l'interstitiel à nouveau au cas où il aurait échoué avant
    // ou si l'utilisateur navigue en arrière puis revient
    if (!this.isPremium && !this.interstitialLoaded) {
      this.prepareInterstitial();
    }
  }

  ionViewWillLeave() {
    this.hideAndRemoveBanner(); // Assurer le nettoyage de la bannière
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
    const currentUserId = this.authService.getCurrentUserId();
    if (!this.selectedFile || !currentUserId || !this.thumbnail) {
      this.presentToast('Veuillez sélectionner une image valide.', 'warning');
      if (!currentUserId) { console.error("User ID from AuthService is null!"); } return;
    }

    let loading: HTMLIonLoadingElement | null = null;
    let bannerShown = false;

    try {
      // 1. Afficher la Bannière (SI non premium)
      if (!this.isPremium) {
        await this.showBannerAd();
        bannerShown = true;
      }

      // 2. Afficher le Loader
      loading = await this.loadingCtrl.create({ message: 'Génération de l\'image...', spinner: 'crescent' });
      await loading.present();

      // 3. Appel API
      console.log(`HomePage: Appel de generateImageApiCall pour l'utilisateur ${currentUserId}`);
      const response = await this.apiService.generateImageApiCall(currentUserId, this.thumbnail);

      // 4. Cacher le Loader APRÈS la réponse API (succès ou échec géré plus bas)
      await loading.dismiss();
      loading = null; // Marquer comme masqué

       // 5. Cacher la Bannière APRÈS la réponse API
       if (bannerShown) {
         await this.hideAndRemoveBanner();
         bannerShown = false;
       }

      // 6. Gérer la réponse (Succès)
      if (response && response.generatedImageUrl) {
        console.log('Appel API réussi. Image générée :', response.generatedImageUrl);
        await this.presentToast('Image générée avec succès !', 'success');
        console.log("URL de l'image générée : ", response.generatedImageUrl);

        // 7. Afficher l'Interstitiel (SI non premium ET si chargé)
        await this.showPreparedInterstitial();

        // 8. Faire quelque chose avec l'URL (ex: naviguer, afficher)
        // this.router.navigate(['/results', { imageUrl: response.generatedImageUrl }]); // Exemple

      } else {
        console.error("Réponse invalide reçue du service : ", response);
        throw new Error("La réponse reçue après génération est invalide.");
      }

    } catch (error: any) {
      console.error("Erreur dans validateImage", error);
       // Assurer que le loader est masqué en cas d'erreur précoce
       if (loading) {
         await loading.dismiss();
         loading = null;
       }
       // Assurer que la bannière est masquée
       if (bannerShown) {
         await this.hideAndRemoveBanner();
       }
       // Afficher message d'erreur
      let errorMessage = 'Une erreur est survenue lors de la génération.';
       if (error?.error?.error) { errorMessage = `Erreur fonction : ${error.error.error}`; }
       else if (error?.message) { errorMessage = `Erreur : ${error.message}`; }
       else if (typeof error?.error === 'string') { errorMessage = error.error; }
      await this.presentToast(errorMessage, 'danger');
    }
    // Le finally n'est plus nécessaire si on gère dismiss/hide dans le try/catch
  }

  async showBannerAd() {
     if (this.isPremium) return; // Double sécurité
     const adUnitId = this.platform.is('ios') ? 'ca-app-pub-3940256099942544/2934735716' : 'ca-app-pub-3940256099942544/6300978111';
     const options: BannerAdOptions = { adId: adUnitId, adSize: BannerAdSize.ADAPTIVE_BANNER, position: BannerAdPosition.BOTTOM_CENTER, margin: 0, isTesting: true };
     try { await AdMob.showBanner(options); console.log('Banner ad should be visible'); }
     catch (err) { console.error('Error showing banner ad', err); }
  }

  async hideAndRemoveBanner() {
      await AdMob.hideBanner().catch(err => console.error('Error hiding banner', err));
      await AdMob.removeBanner().catch(err => console.error('Error removing banner', err)); // Nettoyage complet
  }

  async prepareInterstitial() {
    if (this.isPremium || this.interstitialLoaded) return; // Ne pas recharger si déjà prêt ou si premium
    const adUnitId = this.platform.is('ios') ? 'ca-app-pub-3940256099942544/4411468910' : 'ca-app-pub-3940256099942544/1033173712';
    const options: AdOptions  = { adId: adUnitId, isTesting: true };
    try {
      console.log('Preparing interstitial ad...');
      await AdMob.prepareInterstitial(options);
      // Le listener 'Loaded' mettra this.interstitialLoaded à true
    } catch (err) {
      console.error('Error preparing interstitial ad', err);
      this.interstitialLoaded = false; // Marquer comme non chargé en cas d'erreur
    }
  }

  async showPreparedInterstitial() {
     if (this.isPremium) return; // Ne pas montrer aux premiums
     if (this.interstitialLoaded) {
       console.log('Showing prepared interstitial ad...');
       try {
         await AdMob.showInterstitial();
         this.interstitialLoaded = false; // Marquer comme non chargé après affichage
         // Précharger le suivant immédiatement ? (optionnel)
         // this.prepareInterstitial();
       } catch (err) {
         console.error('Error showing interstitial ad', err);
         this.interstitialLoaded = false; // Marquer comme non chargé en cas d'erreur
       }
     } else {
       console.log('Interstitial ad was not loaded, skipping show.');
       // Optionnel : tenter de le charger maintenant ? Ou juste l'ignorer.
       // await this.prepareInterstitial(); // Tenter de recharger pour la prochaine fois
     }
  }

  addInterstitialListeners(): void {
    AdMob.addListener(InterstitialAdPluginEvents.Loaded as any, () => {
      console.log('Interstitial Ad Loaded');
      this.interstitialLoaded = true;
    });
    AdMob.addListener(InterstitialAdPluginEvents.FailedToLoad as any, (err: any) => {
      console.error('Interstitial Ad Failed to Load', err);
      this.interstitialLoaded = false;
    });
     AdMob.addListener(InterstitialAdPluginEvents.Dismissed as any, () => {
      console.log('Interstitial Ad Dismissed');
      this.interstitialLoaded = false; // Marquer comme non chargé quand fermé
      // Précharger le suivant après fermeture ?
      // if (!this.isPremium) this.prepareInterstitial();
    });
     AdMob.addListener(InterstitialAdPluginEvents.FailedToShow as any, (err: any) => {
      console.error('Interstitial Ad Failed to Show', err);
      this.interstitialLoaded = false; // Marquer comme non chargé
    });
    AdMob.addListener(InterstitialAdPluginEvents.Showed as any, () => {
      console.log('Interstitial Ad Showed');
      // L'interstitiel est affiché
    });
  }

  removeInterstitialListeners(): void {
    this.interstitialListeners.forEach(handle => handle?.remove()); // Appelle .remove() sur chaque handle
    this.interstitialListeners = []; // Vide le tableau
}


  navigateToLogin() { this.router.navigate(['/login']); }
  navigateToAccount() { this.router.navigate(['/mon-compte']); }
  navigateToLibrary() { this.router.navigate(['/bibliotheque']); } // Si vous ajoutez le bouton bibliothèque ici

  async logout() {
    await this.authService.signOutUser();
    this.presentToast('Vous avez été déconnecté.', 'medium');
    this.router.navigate(['/login']); // Rediriger vers login après déco de la home
  }

  async presentToast(message: string, color: string = 'primary', icon?: string) {
    const toast = await this.toastCtrl.create({ message: message, duration: 3500, position: 'bottom', color: color, icon: icon, buttons: [ { text: 'OK', role: 'cancel' } ] });
    await toast.present();
  }
}