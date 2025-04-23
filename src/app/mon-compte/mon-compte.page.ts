import { Component, OnInit, OnDestroy } from '@angular/core'; // Ajouter OnInit, OnDestroy
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import {
  IonHeader, IonToolbar, IonButtons, IonBackButton, IonTitle, IonContent, IonCard,
  IonCardHeader, IonCardTitle, IonCardContent, IonList, IonItem, IonIcon, IonLabel,
  IonButton, Platform // Importer Platform
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { mailOutline, logOutOutline, idCardOutline, shieldCheckmarkOutline, libraryOutline, arrowBackOutline } from 'ionicons/icons'; // Ajouter les icônes nécessaires
import { AuthService } from '../services/auth.service';
import { AdMob, BannerAdOptions, BannerAdSize, BannerAdPosition, BannerAdPluginEvents, AdLoadInfo } from '@capacitor-community/admob'; // Importer AdMob
import { Subscription } from 'rxjs'; // Importer Subscription

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
export class MonComptePage implements OnInit, OnDestroy { // Implémenter OnInit, OnDestroy

  isPremium = false;
  private authSubscription: Subscription | null = null;

  constructor(
    public authService: AuthService,
    private router: Router,
    private platform: Platform // Injecter Platform
  ) {
    addIcons({ mailOutline, logOutOutline, idCardOutline, shieldCheckmarkOutline, libraryOutline, arrowBackOutline });
  }

  ngOnInit() {
    this.authSubscription = this.authService.user$.subscribe(user => {
       user?.getIdTokenResult().then(idTokenResult => {
          this.isPremium = idTokenResult.claims['premium'] === true;
          console.log('MonComptePage: User premium status:', this.isPremium);
       }).catch(err => {
           console.error("MonComptePage: Error getting token results for premium check", err);
           this.isPremium = false;
       });
    });
  }

  ngOnDestroy() {
     this.authSubscription?.unsubscribe();
     this.hideAndRemoveBanner(); // Assurer le nettoyage
  }

  ionViewWillEnter() {
     console.log('ionViewWillEnter MonComptePage, isPremium:', this.isPremium);
     if (!this.isPremium) {
       this.showBannerAd();
     }
  }

  ionViewWillLeave() {
    console.log('ionViewWillLeave MonComptePage');
    this.hideAndRemoveBanner();
  }

  async showBannerAd() {
     const adUnitId = this.platform.is('ios') ? 'ca-app-pub-3940256099942544/2934735716' : 'ca-app-pub-3940256099942544/6300978111';
     const options: BannerAdOptions = {
         adId: adUnitId,
         adSize: BannerAdSize.ADAPTIVE_BANNER,
         position: BannerAdPosition.BOTTOM_CENTER,
         margin: 0,
         isTesting: true, // Laisser à true pour le dev
     };

     try {
         console.log('MonComptePage: Attempting to show banner ad');
         AdMob.addListener(BannerAdPluginEvents.Loaded as any, (info: AdLoadInfo) => { console.log('MonCompte Banner Ad Loaded', info); });
         AdMob.addListener(BannerAdPluginEvents.FailedToLoad as any, (error: any) => { console.error('MonCompte Banner Ad Failed to Load', error); });
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
}