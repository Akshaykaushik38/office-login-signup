import { Injectable } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class NoticeSignalrService {

  private hubConnection!: signalR.HubConnection;

  noticeReceived$ = new Subject<any>();

  // 🔔 NEW: Analytics refresh stream
  analyticsUpdated$ = new Subject<void>();

  startConnection() {
    if (this.hubConnection) return;
   this.hubConnection = new signalR.HubConnectionBuilder()
  .withUrl('http://localhost:5004/noticeHub', {
    accessTokenFactory: () =>
      sessionStorage.getItem('token') ||
      // localStorage.getItem('token') ||
      ''
  })
  .withAutomaticReconnect()
  .build();


    this.hubConnection.start()
      .then(() => console.log('SignalR connected'))
      .catch(err => console.error('SignalR error:', err));

    // EXISTING
    this.hubConnection.on('ReceiveNotice', (notice) => {
      this.noticeReceived$.next(notice);
    });

    // 🔔 NEW: Analytics update listener
    this.hubConnection.on('AnalyticsUpdated', () => {
      this.analyticsUpdated$.next();
    });
  }
}
