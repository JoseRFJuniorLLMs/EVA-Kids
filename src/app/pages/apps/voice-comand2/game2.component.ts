import { Component, ElementRef, Inject, Input, OnInit, ViewChild, NgZone, ChangeDetectorRef, AfterViewInit, OnDestroy, CUSTOM_ELEMENTS_SCHEMA, Renderer2 } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatBadgeModule } from '@angular/material/badge';
import { MatBottomSheetModule } from '@angular/material/bottom-sheet';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSlideToggleChange, MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSliderModule } from '@angular/material/slider';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { SoundService } from 'src/app/layouts/components/footer/sound.service';
import { fadeInUp400ms } from '@vex/animations/fade-in-up.animation';
import { stagger40ms } from '@vex/animations/stagger.animation';
import { UnifiedVoiceService } from 'src/app/core/services/voice/unified-voice.service';
import WaveSurfer from 'wavesurfer.js';
import screenfull from 'screenfull';
import { VexLayoutService } from '@vex/services/vex-layout.service';
import { VexConfigService } from '@vex/config/vex-config.service';

@Component({
  selector: 'game2-component',
  templateUrl: './game2-component.html',
  styleUrls: ['./game2-component.scss'],
  animations: [stagger40ms, fadeInUp400ms],
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [
    CommonModule,
    MatExpansionModule,
    MatTooltipModule,
    MatBadgeModule,
    MatBottomSheetModule,
    MatButtonModule,
    MatChipsModule,
    MatIconModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
    MatSlideToggleModule,
    MatSliderModule,
    FormsModule
  ]
})
export class Game2Component implements OnInit, AfterViewInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private playbackWavesurfer: WaveSurfer | null = null;

  questions: string[] = [
    "What is your name?", "How are you?", "Where are you from?", "What do you do?", "How old are you?",
    "What is your favorite color?", "Do you have any siblings?", "What is your hobby?", "What is your favorite food?",
    "Where do you live?", "What time is it?", "Can you help me?", "Do you like music?", "What is your favorite movie?",
    "What is your favorite book?", "Do you have pets?", "What is your favorite sport?", "Where do you work?",
    "What is your phone number?", "What is your email address?", "What is your favorite season?", "What is your favorite holiday?",
    "What is your favorite drink?", "Do you speak any other languages?", "What is your favorite animal?",
    "What is your favorite TV show?", "What is your favorite song?", "Do you play any instruments?",
    "What is your favorite place?", "Do you like to travel?", "Where have you traveled?", "What is your favorite fruit?",
    "What is your favorite vegetable?", "What is your favorite ice cream flavor?", "Do you have any allergies?",
    "What is your favorite subject in school?", "Do you like to read?", "What is your favorite hobby?",
    "Do you like to cook?", "What is your favorite thing to cook?", "Do you exercise?", "What kind of exercise do you do?",
    "Do you like to dance?", "What kind of music do you like?", "What is your dream job?", "What is your favorite restaurant?",
    "What is your favorite dessert?", "Do you like coffee or tea?", "What is your favorite cereal?", "What is your favorite candy?",
    "Do you like chocolate?", "What is your favorite sport to watch?", "What is your favorite team?", "Do you like to play video games?",
    "What is your favorite video game?", "Do you like to watch movies?", "What is your favorite genre of movie?",
    "What is your favorite board game?", "Do you like puzzles?", "What is your favorite puzzle?", "Do you like the beach?",
    "What is your favorite beach?", "Do you like hiking?", "Where is your favorite place to hike?", "What is your favorite city?",
    "Do you like camping?", "Where is your favorite place to camp?", "Do you like to fish?", "Where is your favorite place to fish?",
    "What is your favorite flower?", "Do you like gardening?", "What is your favorite plant?", "Do you like to swim?",
    "Where is your favorite place to swim?", "Do you like to run?", "What is your favorite time of day?", "Do you like the rain?",
    "What is your favorite type of weather?", "Do you like snow?", "What is your favorite thing to do on a snowy day?",
    "Do you like the sun?", "What is your favorite thing to do on a sunny day?", "Do you like the wind?", "What is your favorite thing to do on a windy day?",
    "Do you like thunderstorms?", "What is your favorite thing to do during a thunderstorm?", "Do you like the cold?",
    "What is your favorite thing to do when it's cold?", "Do you like the heat?", "What is your favorite thing to do when it's hot?",
    "Do you like to read magazines?", "What is your favorite magazine?", "Do you like to write?", "What do you like to write about?",
    "Do you like to draw?", "What do you like to draw?", "Do you like to paint?", "What do you like to paint?",
    "Do you like to build things?", "What do you like to build?", "Do you like to sew?", "What do you like to sew?",
    // Adding more questions for a total of 200
    "Do you like to play sports?", "What is your favorite sport to play?", "Do you enjoy cooking?", "What is your favorite recipe?",
    "Do you enjoy reading?", "What is the last book you read?", "Do you enjoy watching TV?", "What is the last show you watched?",
    "Do you enjoy listening to music?", "What is your favorite genre?", "Do you enjoy going to the beach?", "What is your favorite beach activity?",
    "Do you enjoy hiking?", "What is your favorite trail?", "Do you enjoy fishing?", "What is your favorite fishing spot?",
    "Do you enjoy camping?", "What is your favorite camping activity?", "Do you enjoy swimming?", "What is your favorite swimming stroke?",
    "Do you enjoy running?", "What is your favorite running route?", "Do you enjoy gardening?", "What is your favorite plant to grow?",
    "Do you enjoy playing board games?", "What is your favorite board game?", "Do you enjoy solving puzzles?", "What is your favorite type of puzzle?",
    "Do you enjoy traveling?", "What is your favorite travel destination?", "Do you enjoy visiting museums?", "What is your favorite museum?",
    "Do you enjoy attending concerts?", "What is the last concert you attended?", "Do you enjoy going to the movies?", "What is the last movie you saw?",
    "Do you enjoy eating out?", "What is your favorite restaurant?", "Do you enjoy drinking coffee?", "What is your favorite coffee shop?",
    "Do you enjoy drinking tea?", "What is your favorite tea?", "Do you enjoy playing video games?", "What is your favorite video game?",
    "Do you enjoy doing yoga?", "What is your favorite yoga pose?", "Do you enjoy meditating?", "What is your favorite meditation technique?",
    "Do you enjoy painting?", "What is your favorite painting style?", "Do you enjoy drawing?", "What is your favorite drawing subject?",
    "Do you enjoy writing?", "What is your favorite writing genre?", "Do you enjoy reading?", "What is your favorite book genre?",
    "Do you enjoy cooking?", "What is your favorite cuisine?", "Do you enjoy baking?", "What is your favorite thing to bake?",
    "Do you enjoy knitting?", "What is your favorite thing to knit?", "Do you enjoy sewing?", "What is your favorite sewing project?",
    "Do you enjoy playing sports?", "What is your favorite sport?", "Do you enjoy watching sports?", "What is your favorite sport to watch?",
    "Do you enjoy playing musical instruments?", "What is your favorite instrument?", "Do you enjoy singing?", "What is your favorite song to sing?",
    "Do you enjoy dancing?", "What is your favorite dance style?", "Do you enjoy acting?", "What is your favorite role you've played?",
    "Do you enjoy photography?", "What is your favorite subject to photograph?", "Do you enjoy videography?", "What is your favorite video you've made?",
    "Do you enjoy podcasting?", "What is your favorite podcast?", "Do you enjoy blogging?", "What is your blog about?",
    "Do you enjoy vlogging?", "What is your vlog about?", "Do you enjoy social media?", "What is your favorite social media platform?",
    "Do you enjoy graphic design?", "What is your favorite design project?", "Do you enjoy web design?", "What is your favorite website you've designed?",
    "Do you enjoy programming?", "What is your favorite programming language?", "Do you enjoy gaming?", "What is your favorite game?",
    "Do you enjoy drawing?", "What is your favorite drawing tool?", "Do you enjoy painting?", "What is your favorite paint medium?",
    "Do you enjoy sculpting?", "What is your favorite sculpting material?", "Do you enjoy woodworking?", "What is your favorite woodworking project?",
    "Do you enjoy metalworking?", "What is your favorite metalworking project?", "Do you enjoy crafting?", "What is your favorite craft?",
    "Do you enjoy DIY projects?", "What is your favorite DIY project?", "Do you enjoy home improvement?", "What is your favorite home improvement project?",
    "Do you enjoy gardening?", "What is your favorite garden plant?", "Do you enjoy nature?", "What is your favorite nature activity?",
    "Do you enjoy stargazing?", "What is your favorite constellation?", "Do you enjoy birdwatching?", "What is your favorite bird?",
    "Do you enjoy hiking?", "What is your favorite hike?", "Do you enjoy camping?", "What is your favorite camping spot?",
    "Do you enjoy fishing?", "What is your favorite fish to catch?", "Do you enjoy hunting?", "What is your favorite game to hunt?",
    "Do you enjoy cooking?", "What is your favorite dish to make?", "Do you enjoy baking?", "What is your favorite thing to bake?",
    "Do you enjoy gardening?", "What is your favorite flower to grow?", "Do you enjoy painting?", "What is your favorite painting technique?",
    "Do you enjoy drawing?", "What is your favorite drawing technique?", "Do you enjoy writing?", "What is your favorite writing technique?",
    "Do you enjoy reading?", "What is your favorite book?", "Do you enjoy music?", "What is your favorite song?",
    "Do you enjoy movies?", "What is your favorite movie?", "Do you enjoy TV shows?", "What is your favorite TV show?",
    "Do you enjoy sports?", "What is your favorite sport?", "Do you enjoy video games?", "What is your favorite video game?",
    "Do you enjoy board games?", "What is your favorite board game?", "Do you enjoy puzzles?", "What is your favorite puzzle?",
    "Do you enjoy hiking?", "What is your favorite hiking trail?", "Do you enjoy camping?", "What is your favorite camping spot?",
    "Do you enjoy fishing?", "What is your favorite fishing spot?", "Do you enjoy traveling?", "What is your favorite travel destination?",
    "Do you enjoy cooking?", "What is your favorite dish?", "Do you enjoy baking?", "What is your favorite thing to bake?",
    "Do you enjoy painting?", "What is your favorite painting style?", "Do you enjoy drawing?", "What is your favorite drawing style?",
    "Do you enjoy writing?", "What is your favorite writing style?", "Do you enjoy reading?", "What is your favorite book?",
    "Do you enjoy music?", "What is your favorite song?", "Do you enjoy movies?", "What is your favorite movie?",
    "Do you enjoy TV shows?", "What is your favorite TV show?", "Do you enjoy sports?", "What is your favorite sport?",
    "Do you enjoy video games?", "What is your favorite video game?", "Do you enjoy board games?", "What is your favorite board game?",
    "Do you enjoy puzzles?", "What is your favorite puzzle?", "Do you enjoy hiking?", "What is your favorite hiking trail?",
    "Do you enjoy camping?", "What is your favorite camping spot?", "Do you enjoy fishing?", "What is your favorite fishing spot?",
    "Do you enjoy traveling?", "What is your favorite travel destination?", "Do you enjoy cooking?", "What is your favorite dish?",
    "Do you enjoy baking?", "What is your favorite thing to bake?", "Do you enjoy painting?", "What is your favorite painting style?",
    "Do you enjoy drawing?", "What is your favorite drawing style?", "Do you enjoy writing?", "What is your favorite writing style?",
    "Do you enjoy reading?", "What is your favorite book?"
  ];
  
  answers: string[] = [
    "My name is Junior", "fine", "I'm from New York", "I'm a developer", "30 years old",
    "My favorite color is blue", "Yes, I have two brothers", "I like to play soccer", "My favorite food is pizza",
    "I live in Los Angeles", "It's 3 PM", "Sure, I can help you", "Yes, I love music", "My favorite movie is Inception",
    "My favorite book is Harry Potter", "Yes, I have a cat", "My favorite sport is basketball", "I work at a bank",
    "My phone number is 123-456-7890", "My email address is john@example.com", "My favorite season is spring", "My favorite holiday is Christmas",
    "My favorite drink is coffee", "Yes, I speak Spanish", "My favorite animal is a dog", "My favorite TV show is Friends",
    "My favorite song is Bohemian Rhapsody", "Yes, I play the guitar", "My favorite place is the beach", "Yes, I love to travel",
    "I've traveled to France, Italy, and Japan", "My favorite fruit is apple", "My favorite vegetable is carrot", "My favorite ice cream flavor is chocolate",
    "Yes, I have a peanut allergy", "My favorite subject in school is math", "Yes, I love to read", "My favorite hobby is painting",
    "Yes, I love to cook", "My favorite thing to cook is pasta", "Yes, I exercise regularly", "I do yoga and running",
    "Yes, I like to dance", "I like pop and rock music", "My dream job is to be a pilot", "My favorite restaurant is Olive Garden",
    "My favorite dessert is cheesecake", "I prefer tea", "My favorite cereal is Cheerios", "My favorite candy is Snickers",
    "Yes, I love chocolate", "My favorite sport to watch is football", "My favorite team is the New England Patriots", "Yes, I love to play video games",
    "My favorite video game is The Legend of Zelda", "Yes, I love to watch movies", "My favorite genre of movie is action",
    "My favorite board game is Monopoly", "Yes, I like puzzles", "My favorite puzzle is a jigsaw puzzle", "Yes, I love the beach",
    "My favorite beach is Miami Beach", "Yes, I love hiking", "My favorite place to hike is the Grand Canyon", "My favorite city is Paris",
    "Yes, I like camping", "My favorite place to camp is Yosemite", "Yes, I like to fish", "My favorite place to fish is Lake Tahoe",
    "My favorite flower is the rose", "Yes, I like gardening", "My favorite plant is the sunflower", "Yes, I love to swim",
    "My favorite place to swim is the ocean", "Yes, I like to run", "My favorite time of day is the evening", "Yes, I like the rain",
    "My favorite type of weather is sunny", "Yes, I like snow", "My favorite thing to do on a snowy day is build a snowman",
    "Yes, I like the sun", "My favorite thing to do on a sunny day is go to the park", "Yes, I like the wind", "My favorite thing to do on a windy day is fly a kite",
    "Yes, I like thunderstorms", "My favorite thing to do during a thunderstorm is watch a movie", "Yes, I like the cold",
    "My favorite thing to do when it's cold is drink hot chocolate", "Yes, I like the heat", "My favorite thing to do when it's hot is go swimming",
    "Yes, I like to read magazines", "My favorite magazine is National Geographic", "Yes, I like to write", "I like to write stories",
    "Yes, I like to draw", "I like to draw landscapes", "Yes, I like to paint", "I like to paint portraits",
    "Yes, I like to build things", "I like to build model airplanes", "Yes, I like to sew", "I like to sew clothes",
    // Adding more answers for a total of 200
    "Yes, I love to play sports", "My favorite sport to play is soccer", "Yes, I enjoy cooking", "My favorite recipe is lasagna",
    "Yes, I enjoy reading", "The last book I read was The Great Gatsby", "Yes, I enjoy watching TV", "The last show I watched was Stranger Things",
    "Yes, I enjoy listening to music", "My favorite genre is jazz", "Yes, I enjoy going to the beach", "My favorite beach activity is swimming",
    "Yes, I enjoy hiking", "My favorite trail is the Appalachian Trail", "Yes, I enjoy fishing", "My favorite fishing spot is the Florida Keys",
    "Yes, I enjoy camping", "My favorite camping activity is roasting marshmallows", "Yes, I enjoy swimming", "My favorite swimming stroke is freestyle",
    "Yes, I enjoy running", "My favorite running route is through the park", "Yes, I enjoy gardening", "My favorite plant to grow is tomatoes",
    "Yes, I enjoy playing board games", "My favorite board game is Catan", "Yes, I enjoy solving puzzles", "My favorite type of puzzle is crossword",
    "Yes, I enjoy traveling", "My favorite travel destination is Japan", "Yes, I enjoy visiting museums", "My favorite museum is the Louvre",
    "Yes, I enjoy attending concerts", "The last concert I attended was a Coldplay concert", "Yes, I enjoy going to the movies", "The last movie I saw was Avengers",
    "Yes, I enjoy eating out", "My favorite restaurant is the Cheesecake Factory", "Yes, I enjoy drinking coffee", "My favorite coffee shop is Starbucks",
    "Yes, I enjoy drinking tea", "My favorite tea is green tea", "Yes, I enjoy playing video games", "My favorite video game is Minecraft",
    "Yes, I enjoy doing yoga", "My favorite yoga pose is the downward dog", "Yes, I enjoy meditating", "My favorite meditation technique is mindfulness",
    "Yes, I enjoy painting", "My favorite painting style is abstract", "Yes, I enjoy drawing", "My favorite drawing subject is animals",
    "Yes, I enjoy writing", "My favorite writing genre is fiction", "Yes, I enjoy reading", "My favorite book genre is fantasy",
    "Yes, I enjoy cooking", "My favorite cuisine is Italian", "Yes, I enjoy baking", "My favorite thing to bake is cookies",
    "Yes, I enjoy knitting", "My favorite thing to knit is scarves", "Yes, I enjoy sewing", "My favorite sewing project is making dresses",
    "Yes, I love playing sports", "My favorite sport is basketball", "Yes, I love watching sports", "My favorite sport to watch is soccer",
    "Yes, I enjoy playing musical instruments", "My favorite instrument is the piano", "Yes, I enjoy singing", "My favorite song to sing is Imagine",
    "Yes, I enjoy dancing", "My favorite dance style is salsa", "Yes, I enjoy acting", "My favorite role I've played is Hamlet",
    "Yes, I enjoy photography", "My favorite subject to photograph is nature", "Yes, I enjoy videography", "My favorite video I've made is a travel vlog",
    "Yes, I enjoy podcasting", "My favorite podcast is This American Life", "Yes, I enjoy blogging", "My blog is about food and recipes",
    "Yes, I enjoy vlogging", "My vlog is about my daily life", "Yes, I enjoy social media", "My favorite social media platform is Instagram",
    "Yes, I enjoy graphic design", "My favorite design project was creating a logo", "Yes, I enjoy web design", "My favorite website I've designed is my portfolio",
    "Yes, I enjoy programming", "My favorite programming language is Python", "Yes, I enjoy gaming", "My favorite game is The Witcher 3",
    "Yes, I enjoy drawing", "My favorite drawing tool is a pencil", "Yes, I enjoy painting", "My favorite paint medium is watercolor",
    "Yes, I enjoy sculpting", "My favorite sculpting material is clay", "Yes, I enjoy woodworking", "My favorite woodworking project is making furniture",
    "Yes, I enjoy metalworking", "My favorite metalworking project is making jewelry", "Yes, I enjoy crafting", "My favorite craft is scrapbooking",
    "Yes, I enjoy DIY projects", "My favorite DIY project is building shelves", "Yes, I enjoy home improvement", "My favorite home improvement project is remodeling the kitchen",
    "Yes, I enjoy gardening", "My favorite garden plant is roses", "Yes, I enjoy nature", "My favorite nature activity is hiking",
    "Yes, I enjoy stargazing", "My favorite constellation is Orion", "Yes, I enjoy birdwatching", "My favorite bird is the cardinal",
    "Yes, I enjoy hiking", "My favorite hike is to a waterfall", "Yes, I enjoy camping", "My favorite camping spot is in the mountains",
    "Yes, I enjoy fishing", "My favorite fish to catch is trout", "Yes, I enjoy hunting", "My favorite game to hunt is deer",
    "Yes, I enjoy cooking", "My favorite dish to make is lasagna", "Yes, I enjoy baking", "My favorite thing to bake is bread",
    "Yes, I enjoy gardening", "My favorite flower to grow is tulips", "Yes, I enjoy painting", "My favorite painting technique is acrylic",
    "Yes, I enjoy drawing", "My favorite drawing technique is sketching", "Yes, I enjoy writing", "My favorite writing technique is freewriting",
    "Yes, I enjoy reading", "My favorite book is To Kill a Mockingbird", "Yes, I enjoy music", "My favorite song is Yesterday",
    "Yes, I enjoy movies", "My favorite movie is The Shawshank Redemption", "Yes, I enjoy TV shows", "My favorite TV show is Game of Thrones",
    "Yes, I enjoy sports", "My favorite sport is tennis", "Yes, I enjoy video games", "My favorite video game is Fortnite",
    "Yes, I enjoy board games", "My favorite board game is Chess", "Yes, I enjoy puzzles", "My favorite puzzle is Sudoku",
    "Yes, I enjoy hiking", "My favorite hiking trail is the Pacific Crest Trail", "Yes, I enjoy camping", "My favorite camping spot is near a lake",
    "Yes, I enjoy fishing", "My favorite fishing spot is the river", "Yes, I enjoy traveling", "My favorite travel destination is Italy",
    "Yes, I enjoy cooking", "My favorite dish is spaghetti", "Yes, I enjoy baking", "My favorite thing to bake is cake",
    "Yes, I enjoy painting", "My favorite painting style is realism", "Yes, I enjoy drawing", "My favorite drawing style is cartoon",
    "Yes, I enjoy writing", "My favorite writing style is narrative", "Yes, I enjoy reading", "My favorite book is 1984"
  ];
 
  
  currentQuestionIndex: number = 0;
  currentAnswer: string = '';
  currentQuestion: string = '';
  commandCounter: number = 0;
  message: string = '';
  speak: string = '';

  @ViewChild('mic') micElement!: ElementRef<HTMLDivElement>;
  @ViewChild('waveformPlay') waveformPlay!: ElementRef;

  constructor(
    private zone: NgZone,
    private cdRef: ChangeDetectorRef,
    private soundService: SoundService,
    private readonly configService: VexConfigService,
    private voiceService: UnifiedVoiceService,
    private layoutService: VexLayoutService,
    private renderer: Renderer2,
    private changeDetectorRef: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.voiceService.usePreset('game');

    this.startVoiceRecognition();
    this.askNextQuestion();

    setTimeout(() => {
      this.layoutService.collapseSidenav();
      this.changeDetectorRef.detectChanges();
    });

    this.changeBackgroundImage();

    if (screenfull.isEnabled) {
      screenfull.request();
    }

    this.voiceService.command$.pipe(takeUntil(this.destroy$)).subscribe(command => {
      this.zone.run(() => this.executeVoiceCommand(command));
    });

    this.voiceService.recordingEnded$.pipe(takeUntil(this.destroy$)).subscribe(url => {
      this.createWaveSurferPlay(url);
    });

    const mockEvent = { checked: false } as MatSlideToggleChange;
    this.footerVisibleChange(mockEvent);
  }

  ngAfterViewInit(): void {
    this.voiceService.setupWaveSurfer(this.micElement);
    this.startRecording();
    this.changeBackgroundImage();
  }

  footerVisibleChange(change: MatSlideToggleChange): void {
    this.configService.updateConfig({
      footer: {
        visible: change.checked
      }
    });
  }

  startVoiceRecognition(): void {
    this.voiceService.startListening();
  }

  startRecording(): void {
    this.voiceService.startRecording();
  }

  askNextQuestion(): void {
    if (this.currentQuestionIndex < this.questions.length) {
      this.currentQuestion = this.questions[this.currentQuestionIndex];
      this.currentAnswer = this.answers[this.currentQuestionIndex];
      this.speakText(this.currentQuestion);
    } else {
      console.log('All questions have been asked.');
    }
  }

  skipToNextQuestion(): void {
    this.changeBackgroundImage();
    this.currentQuestionIndex++;
    if (this.currentQuestionIndex < this.questions.length) {
      this.askNextQuestion();
    } else {
      console.log('All questions have been asked.');
    }
  }

  speakText(text: string): void {
    const utterance = new SpeechSynthesisUtterance(this.cleanText(text));
    utterance.lang = 'en-GB';

    const setVoice = () => {
      const voices = window.speechSynthesis.getVoices();
      const femaleVoice = voices.find(voice => voice.name === 'Google UK English Female');

      if (femaleVoice) {
        utterance.voice = femaleVoice;
      } else {
        console.warn('Voz default');
      }

      window.speechSynthesis.speak(utterance);
    };

    if (window.speechSynthesis.getVoices().length === 0) {
      window.speechSynthesis.onvoiceschanged = setVoice;
    } else {
      setVoice();
    }
  }

  cleanText(text: string): string {
    return text.replace(/'/g, ' ').replace(/,/g, '');
  }

  repeatQuestion(): void {
    this.speakText(this.currentQuestion);
  }

  repeatAnswer(): void {
    this.speakText(this.currentAnswer);
  }

  executeVoiceCommand(command: string): void {
    const cleanedCommand = this.cleanCommand(command);
    console.warn(`Executing command: ${cleanedCommand}`);
    
    this.currentAnswer = this.answers[this.currentQuestionIndex];

    if (cleanedCommand === this.currentAnswer.toLowerCase()) {
      this.soundService.playDone();
      this.currentQuestionIndex++;
      this.commandCounter++;
      this.askNextQuestion();
    } else {
      this.soundService.playErro();
      console.warn(`Incorrect answer: ${cleanedCommand}`);
      this.message = `The correct answer is: ${this.currentAnswer}`;
      this.speakText(this.message); 
    }

    this.cdRef.detectChanges();
  }

  cleanCommand(command: string): string {
    return command.trim().toLowerCase().replace(/\s+/g, ' ');
  }

  createWaveSurferPlay(url: string): void {
    if (!this.waveformPlay || !this.waveformPlay.nativeElement) {
      return;
    }

    if (this.playbackWavesurfer) {
      this.playbackWavesurfer.destroy();
    }

    this.playbackWavesurfer = WaveSurfer.create({
      container: this.waveformPlay.nativeElement,
      waveColor: 'black',
      progressColor: 'gray',
      barWidth: 2,
      cursorWidth: 1,
      height: 60,
      barGap: 3,
      backend: 'WebAudio',
    });

    this.playbackWavesurfer.load(url);
  }

  changeBackgroundImage(): void {
    const images = [
      'url("../../../../assets/img/game/fraj.png")',
      'url("../../../../assets/img/game/fraj2.png")',
      'url("../../../../assets/img/game/fraj3.png")',
      'url("../../../../assets/img/game/fraj4.png")',
      'url("../../../../assets/img/game/fraj5.png")',
      'url("../../../../assets/img/game/fraj6.png")',
      'url("../../../../assets/img/game/fraj7.png")',
      'url("../../../../assets/img/game/fraj8.png")',
      'url("../../../../assets/img/game/fraj9.png")',
      'url("../../../../assets/img/game/fraj10.png")',
      'url("../../../../assets/img/game/fraj11.png")',
      'url("../../../../assets/img/game/fraj12.png")'
    ];

    const randomImage = images[Math.floor(Math.random() * images.length)];
    console.log('Aplicando imagem de fundo:', randomImage);
    this.renderer.setStyle(document.querySelector('.game-container'), 'background-image', randomImage);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();

    if (this.playbackWavesurfer) {
      this.playbackWavesurfer.destroy();
    }

    this.voiceService.stopListening();
    this.voiceService.stopRecording();

    if (typeof speechSynthesis !== 'undefined') {
      speechSynthesis.cancel();
    }

    const mockEvent = { checked: true } as MatSlideToggleChange;
    this.footerVisibleChange(mockEvent);
  }
}