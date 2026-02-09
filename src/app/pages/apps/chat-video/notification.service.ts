import { Injectable, OnDestroy } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { IncomingCallDialogComponent } from './incoming-call-dialog.component';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class NotificationService implements OnDestroy {
  private ws: WebSocket | null = null;
  private wsUrl = environment.evaBack.wsSignaling;
  private currentUserId: string = '';

  constructor(
    private dialog: MatDialog,
  ) {}

  connect(userId: string) {
    this.currentUserId = userId;
    // The signaling WebSocket is managed by ChatVideoService.
    // This service just handles incoming call UI.
  }

  disconnect() {
    this.currentUserId = '';
  }

  listenForCallNotifications(userId: string) {
    this.currentUserId = userId;
  }

  handleIncomingCall(data: any) {
    if (data.fromUserId) {
      this.openIncomingCallDialog({
        from: data.fromUserId,
        callId: data.callId || ''
      });
    }
  }

  sendCallNotification(targetUserId: string, callDocId: string, callerId: string) {
    // Call notifications are sent via the signaling WebSocket in ChatVideoService
    // This method is kept for API compatibility
  }

  openIncomingCallDialog(callNotification: any) {
    const dialogRef = this.dialog.open(IncomingCallDialogComponent, {
      height: '600px',
      width: '600px',
      data: { callNotification }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result === 'accept') {
        // Accept is handled by ChatVideoService via WebSocket
      } else if (result === 'reject') {
        // Rejection is handled via WebSocket signaling
      }
    });
  }

  ngOnDestroy() {
    this.disconnect();
  }
}
