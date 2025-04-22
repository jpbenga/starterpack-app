import { Component } from '@angular/core';
import {
  IonContent, IonImg, IonButton, IonHeader, IonToolbar, IonTitle, IonCard,
  IonCardHeader, IonCardContent, IonGrid, IonRow, IonCol, IonIcon, IonText,
  ToastController, LoadingController, IonButtons
} from '@ionic/angular/standalone';
import { CommonModule } from '@angular/common';
import { addIcons } from 'ionicons';
import { cloudUploadOutline, checkmarkCircleOutline, imageOutline, alertCircleOutline, logOutOutline, personCircleOutline, logInOutline, libraryOutline } from 'ionicons/icons';
import { ApiService } from '../services/api.service';
import { AuthService } from '../services/auth.service';
import { Router, RouterModule } from '@angular/router';

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
    IonHeader, IonToolbar, IonTitle, IonContent, IonCard, IonCardHeader,
    IonCardContent, IonGrid, IonRow, IonCol, IonButton, IonIcon, IonImg, IonText,
    IonButtons,
    RouterModule
  ],
})
export class HomePage {
  thumbnail: string | null = null;
  selectedFile: File | null = null;

  constructor(
    private toastCtrl: ToastController,
    private loadingCtrl: LoadingController,
    private apiService: ApiService,
    public authService: AuthService,
    private router: Router
  ) {
    addIcons({ cloudUploadOutline, checkmarkCircleOutline, imageOutline, alertCircleOutline, logOutOutline, personCircleOutline, logInOutline, libraryOutline  });
  }

  ngOnInit() {}

  onFileSelected(event: any) {
    const file: File = event.target.files[0];
    this.thumbnail = null;
    this.selectedFile = null;
    if (!file) { return; }
    const allowedTypes = ['image/jpeg', 'image/png', 'image/bmp'];
    const fileType = file.type;
    if (!allowedTypes.includes(fileType)) {
      this.presentToast('Type de fichier invalide. Formats autorisés : JPG, PNG, BMP.', 'danger', 'alert-circle-outline');
      event.target.value = null; return;
    }
    this.selectedFile = file;
    const reader = new FileReader();
    reader.onload = (e: any) => { this.thumbnail = e.target.result; this.presentToast('Image sélectionnée !', 'success', 'checkmark-circle-outline'); };
    reader.onerror = (error) => { console.error('FileReader error:', error); this.presentToast('Erreur lors de la lecture du fichier.', 'danger'); };
    reader.readAsDataURL(file);
  }

  async validateImage() {
    console.log('validateImage called');
    const currentUserId = this.authService.getCurrentUserId();
    if (!this.selectedFile || !currentUserId || !this.thumbnail) {
      this.presentToast('Veuillez sélectionner une image et assurer une session utilisateur.', 'warning');
      if (!currentUserId) { console.error("User ID from AuthService is null!"); } return;
    }
    const loading = await this.loadingCtrl.create({ message: 'Génération de l\'image...', spinner: 'crescent' });
    await loading.present();
    try {
      console.log(`HomePage: Appel de generateImageApiCall pour l'utilisateur ${currentUserId}`);
      const response = await this.apiService.generateImageApiCall(currentUserId, this.thumbnail);
      if (response && response.generatedImageUrl) {
        console.log('Appel API réussi via Service. Image générée :', response.generatedImageUrl);
        await this.presentToast('Image générée avec succès !', 'success');
        console.log("URL de l'image générée : ", response.generatedImageUrl);
      } else {
        console.error("Réponse invalide reçue du service : ", response);
        throw new Error("La réponse reçue après génération est invalide.");
      }
    } catch (error: any) {
      console.error("Erreur renvoyée par le service ou lors de l'appel", error);
      let errorMessage = 'Une erreur est survenue lors de la génération.';
       if (error?.error?.error) { errorMessage = `Erreur de la fonction : ${error.error.error}`; }
       else if (error?.message) { errorMessage = `Erreur : ${error.message}`; }
       else if (typeof error?.error === 'string') { errorMessage = error.error; }
      await this.presentToast(errorMessage, 'danger');
    } finally {
      await loading.dismiss();
    }
  }

  navigateToLogin() {
    this.router.navigate(['/login']);
  }

  navigateToAccount() {
     this.router.navigate(['/mon-compte']);
  }

  async logout() {
    await this.authService.signOutUser();
    this.presentToast('Vous avez été déconnecté.', 'medium');
  }

  async presentToast(message: string, color: string = 'primary', icon?: string) {
    const toast = await this.toastCtrl.create({ message: message, duration: 3000, position: 'bottom', color: color, icon: icon, buttons: [ { text: 'OK', role: 'cancel' } ] });
    await toast.present();
  }
}