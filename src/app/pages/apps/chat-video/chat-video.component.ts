import { CommonModule } from '@angular/common';
import {
  Component,
  ElementRef,
  OnInit,
  OnDestroy,
  ViewChild,
  Inject
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CdkDrag } from '@angular/cdk/drag-drop';
import { ChatVideoService } from './chat-video.service';
import { OnlineUserDialogComponent } from './online-user-dialog.component';
import { MatDialog, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { ChangeDetectorRef } from '@angular/core';
import screenfull from 'screenfull';
import { NotificationService } from './notification.service';
import { AuthService } from '../../pages/auth/login/auth.service';

@Component({
  selector: 'chat-video',
  templateUrl: './chat-video.component.html',
  styleUrls: ['./chat-video.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    CdkDrag,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule
  ]
})
export class ChatVideoComponent implements OnInit, OnDestroy {
  @ViewChild('webcamVideo') webcamVideo!: ElementRef<HTMLVideoElement>;
  @ViewChild('remoteVideo') remoteVideo!: ElementRef<HTMLVideoElement>;

  inCall: boolean = false;
  otherUserOnline: boolean = false;
  checkUserOnlineInterval: any;
  collapsed: any;
  layoutService: any;
  targetUserId: string;
  loggedUserName: string = '';
  loggedUserId: string = '';
  targetUserName: string;

  constructor(
    public chatVideoService: ChatVideoService,
    private dialog: MatDialog,
    private cdr: ChangeDetectorRef,
    private notificationService: NotificationService,
    private authService: AuthService,
    @Inject(MAT_DIALOG_DATA) public data: { targetUserId: string, targetUserName: string }
  ) {
    this.targetUserId = data.targetUserId;
    this.targetUserName = data.targetUserName;
  }

  async ngOnInit() {
    try {
      const loggedUser = this.authService.getCurrentUser();
      const uid = this.authService.getUID();
      if (loggedUser) {
        this.loggedUserName = loggedUser.email ?? 'Email';
        this.loggedUserId = uid?.toString() ?? 'ID não disponível';
        this.chatVideoService.setCurrentUserId(this.loggedUserId);
      }

      if (screenfull.isEnabled) {
        screenfull.request();
        this.toggleCollapse();
      }
      await this.startCall();
      this.startPeriodicCheck();
    } catch (error) {
      console.error('Error in ngOnInit:', error);
    }
  }
  
  ngOnDestroy(): void {
    if (this.checkUserOnlineInterval) {
      clearInterval(this.checkUserOnlineInterval);
    }
  }

  startPeriodicCheck() {
    this.checkUserOnlineInterval = setInterval(async () => {
      const isOnline = await this.chatVideoService.checkUserOnlineStatus(
        this.targetUserId
      );
      if (isOnline && !this.otherUserOnline) {
        this.openOnlineUserDialog();
      }
      this.otherUserOnline = isOnline;
      this.cdr.detectChanges();
    }, 10000);
  }

  openOnlineUserDialog() {
    this.dialog.open(OnlineUserDialogComponent, {
      width: '250px'
    });
  }

  async toggleCall() {
    if (this.inCall) {
      this.finishCall();
    } else {
      await this.startCall();
    }
    this.inCall = !this.inCall;
  }

  async startCall() {
    await this.chatVideoService.startCall(this.webcamVideo, this.remoteVideo, this.loggedUserId, this.targetUserId);
    this.otherUserOnline = await this.chatVideoService.checkUserOnlineStatus(this.targetUserId);
    this.cdr.detectChanges();
  }
  

  finishCall() {
    this.chatVideoService.finishCall();
    this.inCall = false;
    this.otherUserOnline = false;
    this.cdr.detectChanges();
  }

  muteMicrophone() {
    this.chatVideoService.muteMicrophone();
  }

  turnOffCamera() {
    this.chatVideoService.turnOffCamera();
  }

  async shareScreen() {
    await this.chatVideoService.shareScreen();
  }

  openChat() {
    this.chatVideoService.openChat();
  }

  endCall() {
    this.finishCall();
    this.inCall = false;
  }

  toggleCollapse() {
    this.collapsed
      ? this.layoutService.expandSidenav()
      : this.layoutService.collapseSidenav();
  }

  
}//fim
