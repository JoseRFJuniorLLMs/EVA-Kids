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
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { fadeInUp400ms } from '@vex/animations/fade-in-up.animation';
import { stagger40ms } from '@vex/animations/stagger.animation';
import {
  HttpClient,
  HttpHeaders,
  HttpEvent,
  HttpResponse,
  HttpClientModule
} from '@angular/common/http';

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
import { UnifiedAIService } from 'src/app/core/services/ai/unified-ai.service';

//import * as WebSocket from 'websocket';
import { CdkDrag, CdkDropList } from '@angular/cdk/drag-drop';
import { Observable } from 'rxjs';
import { Firestore, collection, collectionData } from '@angular/fire/firestore';
import { ChatVideoComponent } from '../chat-video/chat-video.component';
import { NoteComponent } from '../../apps/note/note.component';
import { WordComponent } from '../word/word.component';
import { MatBottomSheet } from '@angular/material/bottom-sheet';
import { ShareBottomWimHofComponent } from '../../dashboards/components/share-bottom-wim-hof/share-bottom-wim-hof.component';
import { ShareBottomGpt4Component } from '../../dashboards/components/share-bottom-gpt4/share-bottom-gpt4.component';
import { ShareBottomZettelComponent } from '../../dashboards/components/share-bottom-zettel/share-bottom-zettel.component';
import { SoundService } from 'src/app/layouts/components/footer/sound.service';
const audioPath = '../../../../assets/audio/PRIMING.wav';

interface StudentCollection {
  _id: string;
  name: string;
  bitcoin?: string[];
  books?: string;
  city?: string;
  country?: string;
  courses?: string[];
  date_create?: string; // Timestamp
  email?: string;
  end?: string;
  facebook?: string;
  gender?: string;
  image_url?: string; // Base64
  instagram?: string;
  lessons_done?: string[];
  linkedin?: string;
  list_word_text?: string[];
  login?: string;
  password?: string;
  personal_ident_number?: string;
  phone?: string;
  spoken_language?: string;
  status?: string;
  tax_ident_number?: string;
  tiktok?: string;
}
/**
 *
 * @title Drag&Drop position opened and boundary
 *
 */
@Component({
  selector: 'puzzle-block',
  templateUrl: 'puzzle-block.html',
  styleUrls: ['puzzle-block.scss'],
  animations: [stagger40ms, fadeInUp400ms],
  standalone: true,
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
    MatTooltipModule,
    WordComponent
  ]
})
export class PuzzleBlockComponent implements OnInit {
  studentCollection$!: Observable<StudentCollection[]>;

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

  private recognition: any;

  constructor(
    private http: HttpClient,
    public dialog: MatDialog,
    private elementRef: ElementRef,
    @Inject(Firestore) private firestore: Firestore,
    private cdRef: ChangeDetectorRef,
    private zone: NgZone,
    private _bottomSheet: MatBottomSheet,
    private soundService: SoundService,
    private aiService: UnifiedAIService
  ) {
    const studentCollection = collection(this.firestore, 'StudentCollection');
    this.studentCollection$ = collectionData(studentCollection) as Observable<
      StudentCollection[]
    >;
  }

  /* ==================ngOnInit==================== */
  ngOnInit(): void {
  } 

  /* ==================ngAfterViewInit==================== */
  ngAfterViewInit(): void {
    this.setupWaveSurfer();

    setTimeout(() => {
      if (!this.recordPlugin) {
        console.error('RecordPlugin was NOT initialized correctly.');
      } else {
        console.log('RecordPlugin is initialized and ready.');
      }
    }, 1000);
  } //fim

  /* ==================ngOnDestroy==================== */
  ngOnDestroy(): void {
    if (this.wavesurfer) {
      this.wavesurfer.destroy();
    }
  } //fim

  /* ==================ngOnDestroy==================== */
  someEventHandler() {
    setTimeout(() => {
      this.propertyBoundToDisabled = false;
    }, 0);
  } //fim

  /* ==================ngOnDestroy==================== */
  someAsyncOperation() {
    this.http.get('some-api').subscribe((response) => {
      this.zone.run(() => {
        this.propertyBoundToDisabled = false;
        this.cdRef.markForCheck();
      });
    });
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
          renderRecordedAudio: false
        })
      );

      this.recordPlugin.on('record-end', (blob: Blob) => {
        this.isRecording = false;
        this.recordedUrl = URL.createObjectURL(blob);

        setTimeout(() => {
          if (
            this.recordedUrl &&
            !this.wavesurfer.isPlaying() &&
            !this.recordPlugin.isRecording()
          ) {
            this.createWaveSurferPlay(this.recordedUrl);
          } else {
            console.error(
              'Recorded URL not yet available or WaveSurfer is busy'
            );
          }
        }, 500);
      });

      this.recordPlugin.on('record-progress', (data: any) => {
        this.audioChunks.push(data);
      });

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

     // this.setupSpeechRecognition();  TODO: COMENTEI PARA TESTAR OUTRO COMPONNTE.
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

    recognition.onstart = () => {
      // console.log('Speech recognition started.');
    };

    recognition.onresult = (event: any) => {
      const lastResult = event.results[event.results.length - 1];
      if (lastResult.isFinal) {
        const command = lastResult[0].transcript.trim().toLowerCase();
        this.executeVoiceCommand(command);
      }
    };

    recognition.onerror = (event: any) => {
      // TODO : descomentar
      //console.error('Speech recognition error:', event.error);
    };

    recognition.onend = () => {
      //console.log('Speech recognition ended, restarting...');
      recognition.start();
    };

    //console.log('Starting speech recognition...');
    recognition.start();
  }

  executeVoiceCommand(command: string): void {
    this.zone.run(() => {
      switch (command) {
        case 'gpt':
          console.log('expand gpt', command);
          this.isPanelExpanded = true;
          this.startRecording();
          break;
        case 'books':
          console.log('books', command);
          this._bottomSheet.open(ShareBottomGpt4Component);
          break;
        case 'meditation':
          console.log('meditation', command);
          this._bottomSheet.open(ShareBottomWimHofComponent);
          break;
        case 'notes':
          console.log('notes', command);
          this._bottomSheet.open(ShareBottomZettelComponent);
          break;
        case 'call':
          console.log('call', command);
          this._bottomSheet.open(ChatVideoComponent);
          break;
        case 'play music':
          console.log('play music', command);
          this.soundService.playBiNeural();
          break;
        case 'stop music':
          console.log('stop music', command);
          this.soundService.stopBiNeural();
          break;
        case 'hello':
          console.log('hello', command);
          this.isPanelExpanded = true;
          this.startRecording();
          break;
        case 'shut up':
          if (this.recognition) {
            this.recognition.abort();
          }
          this.isPanelExpanded = false;
          break;
        case 'start recording':
          console.log('start recording', command);
          this.startRecording();
          break;
        case 'stop recording':
          console.log('stop recording', command);
          this.stopRecording();
          break;
        case 'open dialog':
          console.log('open dialog', command);
          //this.dialog.open(SomeDialogComponent);
          break;
        case 'close dialog':
          console.log('close dialog', command);
          this.dialog.closeAll();
          break;
        case 'toggle button':
          console.log('toggle button', command);
          this.someButtonAction();
          break;
        default:
          console.log('Unknown command:', command);
      }
    });
  }

  someButtonAction(): void {
    // Implement the action you want to trigger with the voice command
    console.log('Button action triggered by voice command.');
  } //fim

  /* ==================Create Wave Surfer Play==================== */
  private createWaveSurferPlay(url: string): void {
    if (this.recordedUrl) {
      const container =
        this.elementRef.nativeElement.querySelector('#waveformPlay');
      if (!container) {
        console.error('WaveSurfer container element not found.');
        return;
      }

      if (container) {
        container.innerHTML = '';
      }
      //Play
      this.wavesurfer = WaveSurfer.create({
        container: this.waveformPlay.nativeElement,
        waveColor: 'rgb(128, 0, 0)',
        progressColor: 'rgb(255, 0, 0)',
        cursorColor: 'rgb(0, 0, 0)',
        cursorWidth: 6,
        barGap: 3,
        barWidth: 2,
        barHeight: 3,
        barRadius: 100,
        autoScroll: true,
        autoCenter: true,
        interact: true,
        dragToSeek: true,
        mediaControls: true,
        autoplay: true,
        fillParent: true,
        url: this.recordedUrl,
        backend: 'WebAudio'
      });

      // Add event listeners for playback events (optional)
      this.wavesurfer.on('ready', () => {
        console.log('WaveSurfer playback ready!');
      });

      this.wavesurfer.on('play', () => {
        console.log('Playback started!');
      });

      this.wavesurfer.on('pause', () => {
        console.log('Playback paused.');
      });

      this.wavesurfer.on('finish', () => {
        console.log('Playback finished.');
      });
    } else {
      console.error('Recorded URL not yet available');
    }
  } //fim

  /* ==================Toggle Recording==================== */
  toggleRecording() {
    if (!this.recordPlugin) {
      console.error('Recording plugin NOT initialized');
      return;
    }

    if (this.recordPlugin.isRecording() || this.recordPlugin.isPaused()) {
      this.recordPlugin.stopRecording();

      const audioBlob = new Blob(this.audioChunks, { type: 'audio/wav' });

      // Aqui é onde chamamos a função de transcrição passando o Blob de áudio
      this.transcribeAudio(audioPath); 
      // Lembre-se de limpar/resetar os audioChunks para uma nova gravação
      this.audioChunks = [];

      if (this.pauseButton) {
        this.pauseButton.nativeElement.style.display = 'none';
      }
      this.isRecording = true;
      return;
    }

    if (this.micSelectElement) {
      this.recordPlugin
        .startRecording({ deviceId: this.micSelectElement.nativeElement.value })
        .then(() => {
          if (this.pauseButton) {
            this.pauseButton.nativeElement.style.display = 'inline';
          }
          this.isRecording = false;
        })
        .catch((error: any) => {
          console.error('Error starting recording:', error);
        });
    } else {
      console.error('Mic SelectElement not initialized');
    }
  } //fim

  /* ==================Stop Recording==================== */
  stopRecording() {
    if (!this.recordPlugin) {
      console.error('Recording plugin NOT initialized');
      return;
    }

    if (this.recordPlugin.isRecording() || this.recordPlugin.isPaused()) {
      this.recordPlugin.stopRecording();

      const audioBlob = new Blob(this.audioChunks, { type: 'audio/wav' });

      this.audioChunks = [];

      if (this.pauseButton) {
        this.pauseButton.nativeElement.style.display = 'none';
      }
      this.isRecording = false;
    }
  }

  /* ==================Start Recording==================== */
  startRecording() {
    if (!this.recordPlugin) {
      console.error('Recording plugin NOT initialized');
      return;
    }

    if (!this.recordPlugin.isRecording() && !this.recordPlugin.isPaused()) {
      if (this.micSelectElement) {
        this.recordPlugin
          .startRecording({
            deviceId: this.micSelectElement.nativeElement.value
          })
          .then(() => {
            if (this.pauseButton) {
              this.pauseButton.nativeElement.style.display = 'inline';
            }
            this.isRecording = true;
          })
          .catch((error: any) => {
            console.error('Error starting recording:', error);
          });
      } else {
        console.error('Mic SelectElement not initialized');
      }
    }
  }

  /* ==================loadAudio==================== */
  loadAudio(url: string): void {
    this.audio = new Audio(url);
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

  /* ==================updateProgress==================== */
  updateProgress(time: number) {
    if (time === 0) {
      this.progressElement.nativeElement.textContent = '00:00';
      return;
    }
    const minutes = Math.floor((time % 3600000) / 60000);
    const seconds = Math.floor((time % 60000) / 1000);
    const formattedTime = `${minutes}:${seconds < 10 ? '0' + seconds : seconds}`;
    this.progressElement.nativeElement.textContent = formattedTime;
  } //fim

  /* ==================Transcribe Audio with Gemini==================== */
  transcribeAudio(audioPath: string) {
    console.log('Caminho do arquivo de áudio:', audioPath);

    // For file-based transcription, we need to convert to blob first
    // If audioPath is a URL, fetch it first
    if (audioPath.startsWith('blob:') || audioPath.startsWith('data:')) {
      fetch(audioPath)
        .then(response => response.blob())
        .then(audioBlob => {
          this.aiService.transcribe({ audioBlob }).subscribe({
            next: (response) => {
              this.transcribedText = response.text;
            },
            error: (error) => {
              console.log('Error transcribing audio:', error);
            }
          });
        })
        .catch(error => {
          console.log('Error fetching audio:', error);
        });
    } else {
      // For direct blob/file input
      console.log('Audio transcription requires blob input');
    }
  } //fim

  /* ==================Transcribe Audio Blob==================== */
  transcribeAudioBlob(audioBlob: Blob) {
    this.aiService.transcribe({ audioBlob }).subscribe({
      next: (response) => {
        this.transcribedText = response.text;
      },
      error: (error) => {
        console.log('Error transcribing audio:', error);
      }
    });
  } //fim
} //fim
