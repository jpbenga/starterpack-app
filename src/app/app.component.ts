import { Component } from '@angular/core';
import { IonApp, IonRouterOutlet, Platform  } from '@ionic/angular/standalone';
import { AuthService } from './services/auth.service'; // <<< Importer AuthService
import { AdMob } from '@capacitor-community/admob';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  standalone: true, // Assurez-vous que standalone est bien ici si ce n'est pas dans un module
  imports: [IonApp, IonRouterOutlet],
  styleUrls: ['app.component.scss'], // Ajoutez si vous avez des styles spécifiques
})
export class AppComponent {
  constructor(
    private authService: AuthService, // <<< Injecter AuthService
    private platform: Platform
  ) {
    this.initializeApp();
  }

  async initializeApp() {
    await this.platform.ready();

    this.authService.signInAnonymouslyIfNeeded().then(user => {
      if (user) {
        console.log('AppComponent: User is ready (anonymous or logged in). UID:', user.uid);
      } else {
        console.error('AppComponent: Could not ensure user session.');
      }
    }).catch(err => {
        console.error('AppComponent: Error during initial auth state check', err);
    });

    try {
       await AdMob.initialize({});
       console.log('AdMob initialized successfully');
    } catch (err) {
       console.error('Error initializing AdMob', err);
    }
  }
}