import { Component, OnInit } from '@angular/core';
import { IonContent, IonImg, IonButton } from '@ionic/angular/standalone';
import { CommonModule } from '@angular/common';
import { UserService } from '../user.service';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: true,
  imports: [IonContent, IonImg, CommonModule, IonButton],
})
export class HomePage {
  userId!: string;
  thumbnail: string | null = null;

  onFileSelected(event: any) {
    const file: File = event.target.files[0];

    if (!file) {
      return;
    }

    const allowedTypes = ['.jpg', '.jpeg', '.png', '.bmp'];
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();

    if (!allowedTypes.includes(fileExtension)) {
      // Handle invalid file type (e.g., display an error message)
      console.error('Invalid file type. Allowed types: jpg, jpeg, png, bmp');
      return;
    }

    const reader = new FileReader();

    reader.onload = (e: any) => {
      this.thumbnail = e.target.result;
    };

    reader.readAsDataURL(file);
  }

  validateImage() {
    console.log('validateImage called');
  }

  // Helper function to get the file extension (optional, for clarity)
  getFileExtension(filename: string): string {
    return '.' + filename.split('.').pop()?.toLowerCase() || '';
  }

  constructor(private userService: UserService) { }

  ngOnInit() {
    this.userId = this.userService.getUserUuid();
  }
}
