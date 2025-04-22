import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import {
  IonHeader, IonToolbar, IonButtons, IonBackButton, IonTitle, IonContent, IonSpinner,
  IonGrid, IonRow, IonCol, IonCard, IonCardHeader, IonCardSubtitle, IonCardContent,
  IonIcon, IonText, IonButton, IonImg, Platform // Importer Platform
} from '@ionic/angular/standalone';
import { Observable, of, Subscription } from 'rxjs';
import { switchMap, catchError, tap, take } from 'rxjs/operators';
import { addIcons } from 'ionicons';
import { imagesOutline, arrowBackOutline } from 'ionicons/icons';
import { AuthService } from '../services/auth.service';
import { FirestoreService, GeneratedImageData } from '../services/firestore.service';
import { AdMob, AdOptions, BannerAdOptions, BannerAdSize, BannerAdPosition, BannerAdPluginEvents, AdLoadInfo } from '@capacitor-community/admob';

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
    IonIcon, IonText, IonButton, IonImg,
    DatePipe
   ]
})
export class BibliothequePage implements OnInit, OnDestroy {

  images$: Observable<GeneratedImageData[]> = of([]);
  isLoading = true;
  userId: string | null = null;
  isPremium = false;
  private authSubscription: Subscription | null = null;

  constructor(
    private authService: AuthService,
    private firestoreService: FirestoreService,
    private platform: Platform // Injecter Platform
  ) {
    addIcons({ imagesOutline, arrowBackOutline });
   }

  ngOnInit() {
    this.authSubscription = this.authService.user$.subscribe(user => {
       user?.getIdTokenResult().then(idTokenResult => {
          this.isPremium = idTokenResult.claims['premium'] === true;
          console.log('User premium status:', this.isPremium);
          this.loadImages(user?.uid);
       }).catch(err => {
           console.error("Error getting token results for premium check", err);
           this.isPremium = false; // Assumer non premium en cas d'erreur
           this.loadImages(user?.uid);
       });
    });
  }

  ngOnDestroy() {
     this.authSubscription?.unsubscribe();
     AdMob.hideBanner().catch(err => console.error('Error hiding banner on destroy', err));
     AdMob.removeBanner().catch(err => console.error('Error removing banner on destroy', err));
  }

  loadImages(uid: string | null | undefined) {
    this.isLoading = true;
    if (uid) {
        this.userId = uid;
        this.images$ = this.firestoreService.getUserImages(uid).pipe(
            tap(() => this.isLoading = false),
            catchError(error => {
                console.error('Erreur lors du chargement des images:', error);
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

  async ionViewWillEnter() {
     console.log('ionViewWillEnter BibliothequePage, isPremium:', this.isPremium);
     // Peut nécessiter une vérification que isPremium est bien défini (asynchrone)
     // Ou s'assurer que l'état est lu avant via ngOnInit/Resolver/etc.
     if (this.authSubscription && !this.isPremium) { // Vérifier aussi que la souscription existe (ngOnInit a tourné)
       await this.showBannerAd();
     } else if (!this.authSubscription) {
        // Gérer le cas où la page s'affiche avant que ngOnInit ait pu lire le statut
        console.warn("Auth status not confirmed yet in ionViewWillEnter");
        // Option: attendre un peu ou relancer la lecture du statut
     }
  }

  async ionViewWillLeave() {
    console.log('ionViewWillLeave BibliothequePage');
    await AdMob.hideBanner().catch(err => console.error('Error hiding banner', err));
    await AdMob.removeBanner().catch(err => console.error('Error removing banner', err));
  }

  async showBannerAd() {
     const adUnitId = this.platform.is('ios') ? 'ca-app-pub-3940256099942544/2934735716' : 'ca-app-pub-3940256099942544/6300978111';

     const options: BannerAdOptions = {
         adId: adUnitId,
         adSize: BannerAdSize.ADAPTIVE_BANNER,
         position: BannerAdPosition.BOTTOM_CENTER,
         margin: 0,
         isTesting: true, // Mettre à false en production avec vos vrais ID
     };

     try {
         console.log('Attempting to show banner ad');
          AdMob.addListener(BannerAdPluginEvents.Loaded as any, (info: AdLoadInfo) => { console.log('Banner Ad Loaded', info); });
          AdMob.addListener(BannerAdPluginEvents.FailedToLoad, (error: any) => { console.error('Banner Ad Failed to Load', error); });
          AdMob.addListener(BannerAdPluginEvents.Opened, () => console.log('Banner Ad Opened'));
          AdMob.addListener(BannerAdPluginEvents.Closed, () => console.log('Banner Ad Closed'));

         await AdMob.showBanner(options);
         console.log('Banner ad should be visible');
     } catch (err) {
         console.error('Error showing banner ad', err);
     }
  }
}