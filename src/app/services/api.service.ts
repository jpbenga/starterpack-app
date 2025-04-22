import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http'; // Importer HttpClient
import { environment } from '../../environments/environment'; // Importer l'environnement
import { lastValueFrom } from 'rxjs'; // Importer lastValueFrom

// Interface pour typer la réponse de la fonction
interface FunctionResponse {
  generatedImageUrl: string;
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {

  private apiUrl = environment.cloudFunctionUrl; // Récupérer l'URL depuis l'environnement

  constructor(private http: HttpClient) { } // Injecter HttpClient

  /**
   * Appelle la Cloud Function pour générer l'image "Starter Pack".
   * @param userId L'ID de l'utilisateur.
   * @param base64Image L'image originale en format Data URL (base64).
   * @returns Une promesse résolue avec la réponse de la fonction ou rejetée en cas d'erreur.
   */
  generateImageApiCall(userId: string, base64Image: string): Promise<FunctionResponse> {
    const payload = {
      userId: userId,
      image: base64Image
    };

    console.log(`ApiService: Appel de ${this.apiUrl} pour l'utilisateur ${userId}`);

    // Effectuer l'appel POST et retourner la promesse
    return lastValueFrom(
      this.http.post<FunctionResponse>(this.apiUrl, payload)
    );
  }
}