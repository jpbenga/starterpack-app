import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular/standalone';

@Component({
  selector: 'app-bibliotheque',
  templateUrl: './bibliotheque.page.html',
  styleUrls: ['./bibliotheque.page.scss'],
  standalone: true,
  imports: [IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule]
})
export class BibliothequePage implements OnInit {

  constructor() { }

  ngOnInit() {
  }

}
