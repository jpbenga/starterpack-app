import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class UserService {

  constructor() { }

  getUserUuid(): string {
    let userUuid = localStorage.getItem('userUuid');
    if (!userUuid) {
      userUuid = this.generateUuid();
      localStorage.setItem('userUuid', userUuid);
    }
    return userUuid;
  }

  private generateUuid(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
}