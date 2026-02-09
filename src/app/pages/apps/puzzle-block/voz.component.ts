import {
  Component,
  ElementRef,
  Inject,
  Input,
  OnInit,
  ViewChild,
  NgZone,
  ChangeDetectorRef
} from '@angular/core';
import { MatRippleModule } from '@angular/material/core';
import { RouterLinkActive, RouterOutlet } from '@angular/router';
import { HttpClient } from '@angular/common/http';

import { AsyncPipe, NgClass, NgFor, NgIf } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatDialog } from '@angular/material/dialog';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatTooltipModule } from '@angular/material/tooltip';

import { VexBreadcrumbsComponent } from '@vex/components/vex-breadcrumbs/vex-breadcrumbs.component';
import { VexScrollbarComponent } from '@vex/components/vex-scrollbar/vex-scrollbar.component';
import { VexSecondaryToolbarComponent } from '@vex/components/vex-secondary-toolbar/vex-secondary-toolbar.component';

import WaveSurfer from 'wavesurfer.js';
import RecordPlugin from 'wavesurfer.js/dist/plugins/record.js';

import { CdkDrag, CdkDropList } from '@angular/cdk/drag-drop';
import { ChatVideoComponent } from '../chat-video/chat-video.component';
import { NoteComponent } from '../../apps/note/note.component';

@Component({
  selector: 'voz',
  standalone: true,
  templateUrl: 'voz.html',
  imports: [
    CdkDrag,
    MatIconModule,
    MatButtonModule,
    NgFor,
    MatRippleModule,
    RouterLinkActive,
    NgClass,
    RouterOutlet,
    MatSidenavModule,
    MatMenuModule,
    NgIf,
    VexScrollbarComponent,
    AsyncPipe,
    MatDividerModule,
    MatInputModule,
    CdkDropList,
    VexBreadcrumbsComponent,
    VexSecondaryToolbarComponent,
    ChatVideoComponent,
    NoteComponent,
    MatExpansionModule,
    MatTooltipModule
  ]
})
export class VozComponent implements OnInit {
  @ViewChild('mic') micElement!: ElementRef<HTMLDivElement>;
  @ViewChild('micSelect') micSelectElement!: ElementRef<HTMLSelectElement>;
  @ViewChild('pauseButton') pauseButton!: ElementRef<HTMLButtonElement>;
  @ViewChild('progress') progressElement!: ElementRef<HTMLDivElement>;
  @ViewChild('waveformPlay') waveformPlay!: ElementRef;

  public wavesurfer!: WaveSurfer;
  public recordPlugin!: RecordPlugin;
  scrollingWaveform: boolean = false;

  @Input() recordedUrl: string | undefined;
  audioChunks: any[] = [];
  audioUrl: string | null = null;
  isRecording: boolean = false;
  isPaused: boolean = false;
  propertyBoundToDisabled: boolean | undefined;

  transcribedText: string = '';
  audio?: HTMLAudioElement;
  isPanelExpanded: boolean = false;

  constructor(
    public dialog: MatDialog
  ) {}

  /* ==================ngOnInit==================== */
  ngOnInit(): void {} //fim

  /* ==================ngAfterViewInit==================== */
  ngAfterViewInit(): void {
    this.setupWaveSurfer();
  } //fim

  /* ==================ngOnDestroy==================== */
  ngOnDestroy(): void {
    if (this.wavesurfer) {
      this.wavesurfer.destroy();
    }
  } //fim

  /* ==================setupWaveSurfer==================== */
  setupWaveSurfer(): void {
    if (this.wavesurfer) {
      this.wavesurfer.destroy();
    }

    if (!this.micElement || !this.micElement.nativeElement) {
      console.error('micElement is not yet available.');
      return;
    }
    try {
      this.wavesurfer = WaveSurfer.create({
        container: this.micElement.nativeElement,
        waveColor: 'rgb(33, 150, 243)', // Light Blue from image
        progressColor: 'rgb(135, 206, 235)', // Sky Blue
        barGap: 1,
        barWidth: 2,
        barHeight: 10,
        barRadius: 50,
        backend: 'WebAudio'
      });

      this.recordPlugin = this.wavesurfer.registerPlugin(
        RecordPlugin.create({
          mimeType: 'audio/webm',
          scrollingWaveform: false,
          renderRecordedAudio: false // Do not render recorded audio
        })
      );

      RecordPlugin.getAvailableAudioDevices()
        .then((devices) => {
          this.micSelectElement.nativeElement.innerHTML = '';
          devices.forEach((device) => {
            const option = document.createElement('option');
            option.value = device.deviceId;
            option.text = device.label || `Device ${device.deviceId}`;
            this.micSelectElement.nativeElement.appendChild(option);
          });
        })
        .catch((error) => {
          console.error('Error fetching microphone devices:', error);
        });

      // Handle plugin-specific events
      this.recordPlugin.on('record-start', () => {});

      this.recordPlugin.on('record-end', () => {});

      this.recordPlugin.on('record-progress', (progress) => {
      });

      this.setupSpeechRecognition();
    } catch (error) {
      console.error('Error initializing WaveSurfer:', error);
    }
  }

  //SETUP SPEECH RECOGNITION
  /* ==================Setup Speech Recognition==================== */
  setupSpeechRecognition(): void {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.error('Speech Recognition API not supported in this browser.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true; // Continuação até ser explicitamente parado
    recognition.interimResults = true; // Resultados parciais
    recognition.lang = 'en-US'; // Idioma inglês (EUA)
    recognition.maxAlternatives = 3; // Máximo de 3 alternativas por reconhecimento

    recognition.onstart = () => {};

    recognition.onresult = (event: any) => {
      const lastResult = event.results[event.results.length - 1];
      if (lastResult.isFinal) {
        const command = lastResult[0].transcript.trim().toLowerCase();
      }
    };

    recognition.onerror = (event: any) => {};

    recognition.onend = () => {
      recognition.start();
    };

    recognition.start();
  }

  someButtonAction(): void {
    // Implement the action you want to trigger with the voice command
  } //fim

  /* ==================toggleRecording==================== */
  toggleRecording() {
    if (!this.recordPlugin) {
      console.error('Recording plugin NOT initialized');
      return;
    }

    if (this.recordPlugin.isRecording() || this.recordPlugin.isPaused()) {
      this.recordPlugin.stopRecording();
      this.isRecording = false;
      return;
    }

    if (this.micSelectElement) {
      this.recordPlugin
        .startRecording({ deviceId: this.micSelectElement.nativeElement.value })
        .then(() => {
          this.isRecording = true;
        })
        .catch((error: any) => {
          console.error('Error starting recording:', error);
        });
    } else {
      console.error('Mic SelectElement not initialized');
    }
  } //fim

  /* ==================togglePause==================== */
  togglePause() {
    if (this.recordPlugin.isPaused()) {
      this.recordPlugin.resumeRecording();
      this.pauseButton.nativeElement.textContent = 'Pause';
    } else {
      this.recordPlugin.pauseRecording();
      this.pauseButton.nativeElement.textContent = 'Resume';
    }
  } //fim
} //fim
