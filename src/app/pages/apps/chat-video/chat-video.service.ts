import { Injectable, ElementRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { SoundService } from 'src/app/layouts/components/footer/sound.service';
import { MatSnackBar, MatSnackBarHorizontalPosition, MatSnackBarVerticalPosition } from '@angular/material/snack-bar';
import { NotificationService } from 'src/app/pages/apps/chat-video/notification.service';
import { environment } from 'src/environments/environment';

export enum CallState {
  IDLE,
  CALLING,
  IN_CALL,
  ENDED
}

@Injectable({
  providedIn: 'root'
})
export class ChatVideoService {

  currentUserId: string = '';
  private ws: WebSocket | null = null;
  private apiUrl = `${environment.evaBack.apiUrl}/kids`;
  private wsUrl = environment.evaBack.wsSignaling;

  setCurrentUserId(loggedUserId: string) {
    this.currentUserId = loggedUserId;
    this.connectSignaling();
  }

  localStream!: MediaStream;
  remoteStream!: MediaStream;
  pc: RTCPeerConnection | null = null;
  callDocId: string = '';
  secondPersonJoined: boolean = false;
  private callState: CallState = CallState.IDLE;

  durationInSeconds = 130;
  horizontalPosition: MatSnackBarHorizontalPosition = 'end';
  verticalPosition: MatSnackBarVerticalPosition = 'bottom';

  constructor(
    private _snackBar: MatSnackBar,
    private soundService: SoundService,
    private http: HttpClient,
    private notificationService: NotificationService
  ) {
  }

  openSnackBar(textDisplay: string) {
    this._snackBar.open(textDisplay, 'Close', {
      horizontalPosition: this.horizontalPosition,
      verticalPosition: this.verticalPosition,
      duration: this.durationInSeconds * 1000
    });
  }

  private connectSignaling() {
    if (this.ws) {
      this.ws.close();
    }
    if (!this.currentUserId) return;

    this.ws = new WebSocket(`${this.wsUrl}/${this.currentUserId}`);

    this.ws.onopen = () => {};

    this.ws.onmessage = async (event) => {
      try {
        const data = JSON.parse(event.data);
        await this.handleSignalingMessage(data);
      } catch (e) {
      }
    };

    this.ws.onclose = () => {
      // Reconnect after 3 seconds
      setTimeout(() => {
        if (this.currentUserId) {
          this.connectSignaling();
        }
      }, 3000);
    };

    this.ws.onerror = () => {};
  }

  private async handleSignalingMessage(data: any) {
    switch (data.type) {
      case 'offer':
        if (this.pc) {
          const offerDesc = new RTCSessionDescription(data.offer || data);
          await this.pc.setRemoteDescription(offerDesc);
          const answer = await this.pc.createAnswer();
          await this.pc.setLocalDescription(answer);
          this.sendSignaling({
            type: 'answer',
            answer: answer,
            targetUserId: data.fromUserId
          });
        }
        break;

      case 'answer':
        if (this.pc && !this.pc.currentRemoteDescription) {
          const answerDesc = new RTCSessionDescription(data.answer || data);
          await this.pc.setRemoteDescription(answerDesc);
        }
        break;

      case 'ice-candidate':
        if (this.pc && data.candidate) {
          try {
            await this.pc.addIceCandidate(new RTCIceCandidate(data.candidate));
          } catch (e) {
          }
        }
        break;

      case 'call-notification':
        this.notificationService.handleIncomingCall(data);
        break;

      case 'call-response':
        if (data.response === 'reject') {
          this.openSnackBar('Call was rejected');
          this.callState = CallState.ENDED;
        }
        break;

      case 'online-status':
        // Online users list available at data.users
        break;

      case 'error':
        break;
    }
  }

  private sendSignaling(data: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  async startLocalStream() {
    this.soundService.playOn();
    this.localStream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true
    });
    this.remoteStream = new MediaStream();
  }

  setupPeerConnection(remoteVideo: HTMLVideoElement) {
    if (!this.localStream) {
      return;
    }

    if (!this.pc) {
      this.pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' }
        ]
      });

      this.localStream.getTracks().forEach((track) => {
        this.pc?.addTrack(track, this.localStream);
      });

      this.pc.ontrack = (event) => {
        if (event.streams && event.streams[0]) {
          this.remoteStream = event.streams[0];
        } else {
          const inboundStream = new MediaStream();
          inboundStream.addTrack(event.track);
          this.remoteStream = inboundStream;
        }
        remoteVideo.srcObject = this.remoteStream;
      };

      this.pc.onicecandidate = (event) => {
        if (event.candidate && this.callDocId) {
          this.sendSignaling({
            type: 'ice-candidate',
            candidate: event.candidate.toJSON(),
            targetUserId: this.callDocId // target user
          });
        }
      };
    }
  }

  async startCall(
    webcamVideo: ElementRef<HTMLVideoElement>,
    remoteVideo: ElementRef<HTMLVideoElement>,
    currentUserId: string,
    targetUserId?: string
  ) {
    try {
      await this.startLocalStream();
      this.soundService.playOn();
      this.setupPeerConnection(remoteVideo.nativeElement);

      webcamVideo.nativeElement.srcObject = this.localStream;
      remoteVideo.nativeElement.srcObject = this.remoteStream;

      if (!currentUserId) {
        return;
      }

      if (targetUserId) {
        this.callDocId = targetUserId;
        await this.createOffer(currentUserId, targetUserId);
        // Send call notification via WebSocket
        this.sendSignaling({
          type: 'call-notification',
          targetUserId: targetUserId,
          callId: `${currentUserId}-${targetUserId}-${Date.now()}`
        });
      }

      this.callState = CallState.CALLING;
      this.updateOnlineStatus(currentUserId, true);
    } catch (error) {
    }
  }

  async finishCall() {
    try {
      this.soundService.playClose();
      this.updateOnlineStatus(this.currentUserId, false);
      this.callState = CallState.ENDED;

      if (this.pc) {
        this.pc.close();
      }

      if (this.localStream) {
        this.localStream.getTracks().forEach((track) => track.stop());
      }

      if (this.remoteStream) {
        this.remoteStream.getTracks().forEach((track) => track.stop());
      }

      this.callDocId = '';
    } catch (error) {
    } finally {
      await this.cleanupResources();
    }
  }

  async createOffer(userId: string, targetUserId?: string) {
    try {
      if (!this.pc) {
        return;
      }

      const offerDescription = await this.pc.createOffer();
      await this.pc.setLocalDescription(offerDescription);

      if (targetUserId) {
        this.sendSignaling({
          type: 'offer',
          offer: offerDescription,
          targetUserId: targetUserId
        });
      }
    } catch (error) {
    }
  }

  async answerCall(callData: any) {
    try {
      if (this.pc && callData.offer) {
        const offerDescription = new RTCSessionDescription(callData.offer);
        await this.pc.setRemoteDescription(offerDescription);

        const answerDescription = await this.pc.createAnswer();
        await this.pc.setLocalDescription(answerDescription);

        this.sendSignaling({
          type: 'answer',
          answer: answerDescription,
          targetUserId: callData.fromUserId
        });
      }
    } catch (error) {
    }
  }

  async cleanupResources() {
    if (this.pc) {
      this.pc.close();
      this.pc = null;
    }
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
    }
    if (this.remoteStream) {
      this.remoteStream.getTracks().forEach(track => track.stop());
    }
    this.callState = CallState.IDLE;
  }

  async checkUserOnlineStatus(userId: string): Promise<boolean> {
    try {
      this.soundService.playOnline();
      const students = await firstValueFrom(this.http.get<any[]>(`${this.apiUrl}/students`));
      const student = students?.find(s => s.usuario_id?.toString() === userId || s.id?.toString() === userId);
      return student?.online ?? false;
    } catch (error) {
      return false;
    }
  }

  muteMicrophone() {
    try {
      this.soundService.playClose();
      this.localStream.getAudioTracks().forEach((track) => {
        track.enabled = !track.enabled;
        this.soundService.playClose();
      });
    } catch (error) {
    }
  }

  turnOffCamera() {
    try {
      this.soundService.playClose();
      this.localStream.getVideoTracks().forEach((track) => {
        track.enabled = !track.enabled;
        this.soundService.playOn();
      });
    } catch (error) {
    }
  }

  async shareScreen() {
    try {
      this.soundService.playDone();
      const screenStream = await (navigator.mediaDevices as any).getDisplayMedia({ video: true });
      const screenTrack = screenStream.getVideoTracks()[0];

      this.pc?.getSenders().forEach((sender) => {
        if (sender.track?.kind === 'video') {
          sender.replaceTrack(screenTrack);
        }
      });

      screenTrack.onended = () => {
        this.localStream.getVideoTracks().forEach((track) => {
          this.pc?.getSenders().forEach((sender) => {
            if (sender.track?.kind === 'video') {
              sender.replaceTrack(track);
            }
          });
        });
      };
    } catch (error) {
    }
  }

  openChat() {
    // Chat opened
  }

  endCall() {
    try {
      this.finishCall();
      this.soundService.playClose();
    } catch (error) {
    }
  }

  setupWebRTCForUser(userId: string) {
    this.setCurrentUserId(userId);
  }

  async tearDownWebRTCForUser(userId: string) {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  async deleteCallInfo() {
    // No-op: calls are in-memory on the WebSocket server
  }

  async updateOnlineStatus(userId: string, status: boolean) {
    try {
      const profile = await firstValueFrom(this.http.get<any>(`${this.apiUrl}/profile`));
      if (profile?.id) {
        await firstValueFrom(this.http.put(`${this.apiUrl}/students/${profile.id}/online`, { online: status }));
      }
    } catch (error) {
    }
  }
}
