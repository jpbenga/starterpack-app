import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import {
  IonHeader, IonToolbar, IonButtons, IonBackButton, IonTitle, IonContent, IonSpinner,
  IonGrid, IonRow, IonCol, IonCard, IonCardHeader, IonCardSubtitle, IonCardContent,
  IonIcon, IonButton, Platform,
  IonImg
} from '@ionic/angular/standalone';
import { Observable, of, Subscription } from 'rxjs';
import { switchMap, catchError, tap, take } from 'rxjs/operators';
import { addIcons } from 'ionicons';
import { imagesOutline, arrowBackOutline } from 'ionicons/icons';
import { AuthService } from '../services/auth.service';
import { FirestoreService, GeneratedImageData } from '../services/firestore.service';
import { AdMob, AdOptions, BannerAdOptions, BannerAdSize, BannerAdPosition, BannerAdPluginEvents, AdLoadInfo } from '@capacitor-community/admob';
import { PluginListenerHandle } from '@capacitor/core'; // Assurez-vous que ce type est correct

@Component({
  selector: 'app-bibliotheque',
  templateUrl: './bibliotheque.page.html',
  styleUrls: ['./bibliotheque.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    IonHeader, IonToolbar, IonButtons, IonBackButton, IonTitle, IonContent, IonSpinner,
    IonGrid, IonRow, IonCol, IonCard, IonCardHeader, IonCardSubtitle, IonCardContent,
    IonIcon, IonButton,
    IonImg,
    DatePipe
   ]
})
export class BibliothequePage implements OnInit, OnDestroy {

  images$: Observable<GeneratedImageData[]> = of([]);
  isLoading = true;
  userId: string | null = null;
  isPremium = false;
  private authSubscription: Subscription | null = null;
  private premiumStatusSubscription: Subscription | null = null; // Ajouté pour gérer isPremium$
  private bannerListeners: PluginListenerHandle[] = [];

  constructor(
    private authService: AuthService,
    private firestoreService: FirestoreService,
    private platform: Platform
  ) {
    addIcons({ imagesOutline, arrowBackOutline });
   }

  ngOnInit() {
    // Utiliser premiumStatusSubscription pour suivre isPremium$
    this.premiumStatusSubscription = this.authService.isPremium$.subscribe(isPremium => {
        this.isPremium = isPremium;
        console.log('BibliothequePage: User premium status updated:', this.isPremium);
        // Gérer la bannière AdMob en fonction du statut premium
        if (!this.isPremium) {
            this.showBannerAd();
        } else {
            this.hideAndRemoveBanner();
        }
    });

    // Charger les images en fonction de l'utilisateur connecté
    this.authSubscription = this.authService.user$.subscribe(user => {
        this.loadImages(user?.uid);
    });
  }

  ngOnDestroy() {
     this.authSubscription?.unsubscribe();
     this.premiumStatusSubscription?.unsubscribe(); // Se désabonner
     this.removeBannerListeners();
     this.hideAndRemoveBanner();
  }

  loadImages(uid: string | null | undefined) {
    this.isLoading = true;
    if (uid) {
        this.userId = uid;
        console.log(`BibliothequePage: Loading images for user ${uid}`); // Log ajouté

        // *** CORRECTION ICI : Retrait de la condition !this.isPremium ***
        // Charger les images pour l'utilisateur, les règles Firestore gèrent la permission
        this.images$ = this.firestoreService.getUserImages(uid).pipe(
            tap((data) => {
                console.log(`BibliothequePage: Images loaded successfully for user ${uid}`, data); // Log succès
                this.isLoading = false;
            }),
            catchError(error => {
                console.error(`Erreur lors du chargement des images pour ${uid}:`, error);
                this.isLoading = false;
                // Afficher un message d'erreur ou simplement un tableau vide
                // Peut-être une permission refusée si les règles ne sont pas bonnes
                return of([]);
            })
        );
    } else {
        console.warn('Bibliotheque: Aucun UID utilisateur trouvé. Cannot load images.');
        this.images$ = of([]);
        this.isLoading = false;
    }
  }


  ionViewWillEnter() {
     console.log('ionViewWillEnter BibliothequePage, isPremium:', this.isPremium);
     // Rafraîchir les claims pour s'assurer que le statut est à jour pour AdMob
     this.authService.forceClaimRefresh();
  }

  ionViewWillLeave() {
    console.log('ionViewWillLeave BibliothequePage');
    this.removeBannerListeners();
    this.hideAndRemoveBanner();
  }

  async showBannerAd() {
    if (this.isPremium || !this.platform.is('capacitor')) {
        console.log('BibliothequePage: Skipping banner ad (premium or not on capacitor).');
        return;
    }
    await this.removeBannerListeners();

    const adUnitId = this.platform.is('ios') ? 'ca-app-pub-3940256099942544/2934735716' : 'ca-app-pub-3940256099942544/6300978111';
    const options: BannerAdOptions = {
        adId: adUnitId,
        adSize: BannerAdSize.ADAPTIVE_BANNER,
        position: BannerAdPosition.BOTTOM_CENTER,
        margin: 0,
        isTesting: true,
    };

    try {
        console.log('BibliothequePage: Attempting to show banner ad');
        const loadedHandle = await AdMob.addListener(BannerAdPluginEvents.Loaded as any, (info: AdLoadInfo) => { console.log('Bibliotheque Banner Ad Loaded', info); });
        const failedLoadHandle = await AdMob.addListener(BannerAdPluginEvents.FailedToLoad as any, (error: any) => { console.error('Bibliotheque Banner Ad Failed to Load', error); });
        this.bannerListeners.push(loadedHandle, failedLoadHandle);

        await AdMob.showBanner(options);
        console.log('Bibliotheque banner ad should be visible');
    } catch (err) {
        console.error('Bibliotheque: Error showing banner ad', err);
    }
  }

  async hideAndRemoveBanner() {
    if (!this.platform.is('capacitor')) return;
    await AdMob.hideBanner().catch(err => console.warn('Bibliotheque: Error hiding banner', err));
    await AdMob.removeBanner().catch(err => console.warn('Bibliotheque: Error removing banner', err));
  }

  async removeBannerListeners(): Promise<void> {
    try {
        for (const handle of this.bannerListeners) {
            await handle?.remove();
        }
    } catch (err) {
        console.error("Error removing banner listeners", err);
    } finally {
        this.bannerListeners = [];
    }
  }
}
