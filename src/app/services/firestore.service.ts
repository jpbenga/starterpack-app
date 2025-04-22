import { Injectable } from '@angular/core';
import { Firestore, collection, query, where, getDocs, orderBy, collectionData, DocumentData } from '@angular/fire/firestore';
import { Observable } from 'rxjs';

// Interface optionnelle pour typer vos données d'image
export interface GeneratedImageData {
  id?: string; // Firestore document ID
  userId: string;
  originalImageUrl: string;
  generatedImageUrl: string;
  prompt: string;
  createdAt: any; // Ou Timestamp
}


@Injectable({
  providedIn: 'root'
})
export class FirestoreService {

  constructor(private firestore: Firestore) { }

  // Récupère les images d'un utilisateur sous forme d'Observable
  getUserImages(userId: string): Observable<GeneratedImageData[]> {
    const imagesCollection = collection(this.firestore, 'images');
    // Crée une requête pour filtrer par userId et ordonner par date décroissante
    const q = query(
        imagesCollection,
        where('userId', '==', userId),
        orderBy('createdAt', 'desc') // Ordonner par date, la plus récente en premier
    );
    // Retourne un observable qui émet le tableau d'images
    // Inclut automatiquement l'ID du document Firestore
    return collectionData(q, { idField: 'id' }) as Observable<GeneratedImageData[]>;
  }

  // Version alternative avec Promise (si vous préférez)
  async getUserImagesPromise(userId: string): Promise<GeneratedImageData[]> {
    const imagesCollection = collection(this.firestore, 'images');
    const q = query(
        imagesCollection,
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
     );
    const querySnapshot = await getDocs(q);
    const images: GeneratedImageData[] = [];
    querySnapshot.forEach((doc) => {
      images.push({ id: doc.id, ...doc.data() } as GeneratedImageData);
    });
    return images;
  }
}