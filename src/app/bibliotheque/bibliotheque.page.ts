import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import {
  IonHeader, IonToolbar, IonButtons, IonBackButton, IonTitle, IonContent, IonSpinner,
  IonGrid, IonRow, IonCol, IonCard, IonCardHeader, IonCardSubtitle, IonCardContent,
  IonIcon, IonButton, Platform,
  IonImg // <<< Importé ici
} from '@ionic/angular/standalone';
import { Observable, of, Subscription } from 'rxjs';
import { switchMap, catchError, tap, take } from 'rxjs/operators';
import { addIcons } from 'ionicons';
import { imagesOutline, arrowBackOutline } from 'ionicons/icons';
import { AuthService } from '../services/auth.service';
import { FirestoreService, GeneratedImageData } from '../services/firestore.service';
import { AdMob, AdOptions, BannerAdOptions, BannerAdSize, BannerAdPosition, BannerAdPluginEvents, AdLoadInfo } from '@capacitor-community/admob';
import { PluginListenerHandle } from '@capacitor/core';

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
    IonImg, // <<< Ajouté ici dans le tableau imports
    DatePipe
   ]
})
export class BibliothequePage implements OnInit, OnDestroy {

  images$: Observable<GeneratedImageData[]> = of([]);
  isLoading = true;
  userId: string | null = null;
  isPremium = false;
  private authSubscription: Subscription | null = null;
  // AdMob Listeners - Correction type si nécessaire
  private bannerListeners: PluginListenerHandle[] = [];

  constructor(
    private authService: AuthService,
    private firestoreService: FirestoreService,
    private platform: Platform
  ) {
    addIcons({ imagesOutline, arrowBackOutline });
   }

  ngOnInit() {
    this.authSubscription = this.authService.user$.subscribe(user => {
        // Utiliser forceClaimRefresh pour être sûr d'avoir les derniers claims
        this.authService.forceClaimRefresh().then(isPremium => {
            this.isPremium = isPremium;
            console.log('BibliothequePage: User premium status:', this.isPremium);
            this.loadImages(user?.uid); // Charger les images après avoir le statut
            // Gérer la bannière AdMob en fonction du statut premium
            if (!this.isPremium) {
                this.showBannerAd();
            } else {
                this.hideAndRemoveBanner();
            }
        }).catch(err => {
            console.error("BibliothequePage: Error getting token results for premium check", err);
            this.isPremium = false; // Assumer non premium en cas d'erreur
            this.loadImages(user?.uid);
            this.showBannerAd(); // Montrer la bannière si erreur
        });
    });
  }

  ngOnDestroy() {
     this.authSubscription?.unsubscribe();
     this.removeBannerListeners(); // Nettoyer les listeners spécifiques à la bannière
     this.hideAndRemoveBanner();
  }

  loadImages(uid: string | null | undefined) {
    this.isLoading = true;
    if (uid) {
        this.userId = uid;
        // Si l'utilisateur n'est pas premium, on ne charge pas les images (ou on affiche un message)
        // Car les règles de sécurité devraient bloquer l'accès de toute façon
        if (!this.isPremium) {
            console.log("BibliothequePage: User is not premium. Not loading images.");
            this.images$ = of([]); // Retourner un tableau vide
            this.isLoading = false;
            // Optionnel: Afficher un message indiquant que l'accès est réservé aux premiums
            return;
        }
        // Si premium, charger les images
        this.images$ = this.firestoreService.getUserImages(uid).pipe(
            tap(() => this.isLoading = false),
            catchError(error => {
                console.error('Erreur lors du chargement des images:', error);
                // Gérer l'erreur (ex: permission refusée par les règles Firestore)
                this.isLoading = false;
                return of([]);
            })
        );
    } else {
        console.warn('Bibliotheque: Aucun UID utilisateur trouvé pour charger les images.');
        this.images$ = of([]);
        this.isLoading = false;
    }
  }

  ionViewWillEnter() {
     console.log('ionViewWillEnter BibliothequePage, isPremium:', this.isPremium);
     // Le statut premium est maintenant géré dans ngOnInit via forceClaimRefresh
     // La logique AdMob est aussi dans ngOnInit
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
