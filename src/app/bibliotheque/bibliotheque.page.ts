import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common'; // Importer DatePipe
import { RouterModule } from '@angular/router';
import {
  IonHeader, IonToolbar, IonButtons, IonBackButton, IonTitle, IonContent, IonSpinner,
  IonGrid, IonRow, IonCol, IonCard, IonCardHeader, IonCardSubtitle, IonCardContent,
  IonIcon, IonText, IonButton, IonImg // Importer IonImg
} from '@ionic/angular/standalone';
import { Observable, of } from 'rxjs';
import { switchMap, catchError, tap, take } from 'rxjs/operators';
import { addIcons } from 'ionicons';
import { imagesOutline, arrowBackOutline } from 'ionicons/icons';
import { AuthService } from '../services/auth.service'; // Ajustez chemin
import { FirestoreService, GeneratedImageData } from '../services/firestore.service'; // Ajustez chemin

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
    IonIcon, IonText, IonButton, IonImg, // Ajouter IonImg ici
    DatePipe // Ajouter DatePipe pour le formatage de date
  ]
})
export class BibliothequePage implements OnInit {

  images$: Observable<GeneratedImageData[]> = of([]); // Initialiser avec un observable vide
  isLoading = true;
  userId: string | null = null;

  constructor(
    private authService: AuthService,
    private firestoreService: FirestoreService
  ) {
    addIcons({ imagesOutline, arrowBackOutline });
   }

  ngOnInit() {
    this.loadImages();
  }

  loadImages() {
    this.isLoading = true;
    // Utiliser switchMap pour obtenir l'UID puis charger les images
    this.images$ = this.authService.user$.pipe(
      take(1), // Prendre seulement le premier état utilisateur (ou garder la souscription live)
      tap(user => this.userId = user?.uid || null), // Stocker l'UID si besoin ailleurs
      switchMap(user => {
        if (user?.uid) {
          // Si UID existe, appeler le service Firestore
          return this.firestoreService.getUserImages(user.uid);
        } else {
          // Si pas d'UID, retourner un observable vide
          console.warn('Bibliotheque: Aucun UID utilisateur trouvé.');
          return of([]);
        }
      }),
      tap(() => this.isLoading = false), // Arrêter le chargement après réception des données (ou erreur)
      catchError(error => {
        console.error('Erreur lors du chargement des images:', error);
        this.isLoading = false;
        // Optionnel: Afficher un message d'erreur à l'utilisateur via un toast ou une variable
        return of([]); // Retourner un tableau vide en cas d'erreur
      })
    );
  }
  // Note: La désinscription n'est pas nécessaire si on utilise le pipe async dans le template
  // ou si on utilise take(1) comme ici.
}