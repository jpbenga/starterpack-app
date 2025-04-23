import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import {
  IonHeader, IonToolbar, IonButtons, IonBackButton, IonTitle, IonContent, IonCard,
  IonCardHeader, IonCardTitle, IonCardContent, IonList, IonItem, IonIcon, IonLabel,
  IonButton, Platform, ToastController,
  IonCardSubtitle, IonText
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { mailOutline, logOutOutline, idCardOutline, shieldCheckmarkOutline, libraryOutline, arrowBackOutline, bugOutline, starOutline, star, giftOutline } from 'ionicons/icons';
import { AuthService } from '../services/auth.service';
import { DebugService } from '../services/debug.service';
import { environment } from '../../environments/environment';
import { AdMob, BannerAdOptions, BannerAdSize, BannerAdPosition, BannerAdPluginEvents, AdLoadInfo } from '@capacitor-community/admob';
import { Subscription } from 'rxjs';
import { PluginListenerHandle } from '@capacitor/core';

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
    IonButton,
    IonCardSubtitle, IonText
  ]
})
export class MonComptePage implements OnInit, OnDestroy {

  isPremium = false;
  private premiumStatusSubscription: Subscription | null = null;
  public readonly isDevelopmentMode = !environment.production;
  private bannerListeners: PluginListenerHandle[] = [];

  constructor(
    public authService: AuthService,
    private debugService: DebugService,
    private router: Router,
    private platform: Platform,
    private toastCtrl: ToastController
  ) {
    addIcons({ mailOutline, logOutOutline, idCardOutline, shieldCheckmarkOutline, libraryOutline, arrowBackOutline, bugOutline, starOutline, star, giftOutline });
  }

  ngOnInit() {
    this.premiumStatusSubscription = this.authService.isPremium$.subscribe(isPremium => {
        this.isPremium = isPremium;
        console.log('MonComptePage: User premium status updated:', this.isPremium);
        if (!this.isPremium) {
            this.showBannerAd();
        } else {
            this.hideAndRemoveBanner();
        }
    });
  }

  ngOnDestroy() {
     this.premiumStatusSubscription?.unsubscribe();
     this.removeBannerListeners();
     this.hideAndRemoveBanner();
  }

  ionViewWillEnter() {
     console.log('ionViewWillEnter MonComptePage, isPremium:', this.isPremium);
     this.authService.forceClaimRefresh();
  }

  ionViewWillLeave() {
    console.log('ionViewWillLeave MonComptePage');
    this.removeBannerListeners();
    this.hideAndRemoveBanner();
  }

  async simulatePremiumToggle() {
    if (!this.isDevelopmentMode) return;

    if (!this.isPremium) {
        console.log("MonComptePage: Triggering premium simulation...");
        await this.debugService.grantPremiumForDevelopment();
    } else {
        console.log("MonComptePage: Premium already active (simulation removal not implemented).");
        await this.presentToast('Premium déjà actif (simulation). Retrait non implémenté.', 'medium', 'starOutline');
    }
  }

  async showBannerAd() {
     if (this.isPremium || !this.platform.is('capacitor')) {
        console.log('MonComptePage: Skipping banner ad (premium or not on capacitor).');
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
         console.log('MonComptePage: Attempting to show banner ad');
         const loadedHandle = await AdMob.addListener(BannerAdPluginEvents.Loaded, (info: AdLoadInfo) => { console.log('MonCompte Banner Ad Loaded', info); });
         const failedLoadHandle = await AdMob.addListener(BannerAdPluginEvents.FailedToLoad, (error: any) => { console.error('MonCompte Banner Ad Failed to Load', error); });
         this.bannerListeners.push(loadedHandle, failedLoadHandle);

         await AdMob.showBanner(options);
         console.log('MonCompte banner ad should be visible');
     } catch (err) {
         console.error('MonCompte: Error showing banner ad', err);
     }
  }

  async hideAndRemoveBanner() {
     if (!this.platform.is('capacitor')) return;
     await AdMob.hideBanner().catch(err => console.warn('MonCompte: Error hiding banner (may already be hidden)', err));
     await AdMob.removeBanner().catch(err => console.warn('MonCompte: Error removing banner (may already be removed)', err));
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

  async logout() {
    await this.authService.signOutUser();
    this.router.navigate(['/login'], { replaceUrl: true });
  }

  goToSubscriptionPage() {
    console.log('MonComptePage: Navigating to subscription page...');
    this.router.navigate(['/subscription']);
  }

  async presentToast(message: string, color: string = 'primary', icon?: string) {
    const toast = await this.toastCtrl.create({ message: message, duration: 3500, position: 'bottom', color: color, icon: icon, buttons: [ { text: 'OK', role: 'cancel' } ] });
    await toast.present();
  }
}
