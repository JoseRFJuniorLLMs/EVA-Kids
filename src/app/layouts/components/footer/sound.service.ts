import { EventEmitter, Injectable, Output } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class SoundService {
  volume: number = 0.5; 
  audioPlayer: HTMLAudioElement | null = null;
  timer: any;
  paused: boolean = false;
  isPlaying = false;

  stopBiNeural() {
    if (this.audioPlayer) {
      this.audioPlayer.pause();
      this.audioPlayer.currentTime = 0; // Volta para o início do áudio
      this.isPlaying = false;
      this.audioPlayer = null;
    }
  }

  // Método playBiNeural modificado para usar a propriedade 'volume'
  playBiNeural() {
    if (this.audioPlayer && !this.audioPlayer.paused) {
      this.audioPlayer.pause();
      this.isPlaying = false;
    } else {
      if (!this.audioPlayer) {
        this.audioPlayer = new Audio('../../../../assets/audio/music.mp3');
        this.audioPlayer.volume = this.volume; // Defina o volume do player de áudio
      }
      this.audioPlayer
        .play()
        .then(() => {
          this.isPlaying = true;
        })
        .catch(() => {});

      this.audioPlayer.onended = () => {
        this.isPlaying = false;
        this.audioPlayer = null;
      };
    }
  }

  playToc() {
    if (this.audioPlayer && !this.audioPlayer.paused) {
      this.audioPlayer.pause();
      this.isPlaying = false;
    } else {
      if (!this.audioPlayer) {
        this.audioPlayer = new Audio('../../../../assets/audio/toc.wav');
        this.audioPlayer.volume = this.volume; // Defina o volume do player de áudio
      }
      this.audioPlayer
        .play()
        .then(() => {
          this.isPlaying = true;
        })
        .catch(() => {});

      this.audioPlayer.onended = () => {
        this.isPlaying = false;
        this.audioPlayer = null;
      };
    }
  }

  playOpen() {
    if (this.audioPlayer && !this.audioPlayer.paused) {
      this.audioPlayer.pause();
      this.isPlaying = false;
    } else {
      if (!this.audioPlayer) {
        this.audioPlayer = new Audio('../../../../assets/audio/open.mp3');
        this.audioPlayer.volume = this.volume; // Defina o volume do player de áudio
      }
      this.audioPlayer
        .play()
        .then(() => {
          this.isPlaying = true;
        })
        .catch(() => {});

      this.audioPlayer.onended = () => {
        this.isPlaying = false;
        this.audioPlayer = null;
      };
    }
  }

  playDone() {
    if (this.audioPlayer && !this.audioPlayer.paused) {
      this.audioPlayer.pause();
      this.isPlaying = false;
    } else {
      if (!this.audioPlayer) {
        this.audioPlayer = new Audio('../../../../assets/audio/done.mp3');
        this.audioPlayer.volume = this.volume; // Defina o volume do player de áudio
      }
      this.audioPlayer
        .play()
        .then(() => {
          this.isPlaying = true;
        })
        .catch(() => {});

      this.audioPlayer.onended = () => {
        this.isPlaying = false;
        this.audioPlayer = null;
      };
    }
  }

  playOn() {
    if (this.audioPlayer && !this.audioPlayer.paused) {
      this.audioPlayer.pause();
      this.isPlaying = false;
    } else {
      if (!this.audioPlayer) {
        this.audioPlayer = new Audio('../../../../assets/audio/on.mp3');
        this.audioPlayer.volume = this.volume; // Defina o volume do player de áudio
      }
      this.audioPlayer
        .play()
        .then(() => {
          this.isPlaying = true;
        })
        .catch(() => {});

      this.audioPlayer.onended = () => {
        this.isPlaying = false;
        this.audioPlayer = null;
      };
    }
  }

  playOnline() {
    if (this.audioPlayer && !this.audioPlayer.paused) {
      this.audioPlayer.pause();
      this.isPlaying = false;
    } else {
      if (!this.audioPlayer) {
        this.audioPlayer = new Audio('../../../../assets/audio/online.mp3');
        this.audioPlayer.volume = this.volume; // Defina o volume do player de áudio
      }
      this.audioPlayer
        .play()
        .then(() => {
          this.isPlaying = true;
        })
        .catch(() => {});

      this.audioPlayer.onended = () => {
        this.isPlaying = false;
        this.audioPlayer = null;
      };
    }
  }

  playClose() {
    if (this.audioPlayer && !this.audioPlayer.paused) {
      this.audioPlayer.pause();
      this.isPlaying = false;
    } else {
      if (!this.audioPlayer) {
        this.audioPlayer = new Audio('../../../../assets/audio/close.mp3');
        this.audioPlayer.volume = this.volume; // Defina o volume do player de áudio
      }
      this.audioPlayer
        .play()
        .then(() => {
          this.isPlaying = true;
        })
        .catch(() => {});

      this.audioPlayer.onended = () => {
        this.isPlaying = false;
        this.audioPlayer = null;
      };
    }
  }

  playErro() {
    if (this.audioPlayer && !this.audioPlayer.paused) {
      this.audioPlayer.pause();
      this.isPlaying = false;
    } else {
      if (!this.audioPlayer) {
        this.audioPlayer = new Audio('../../../../assets/audio/erro.mp3');
        this.audioPlayer.volume = this.volume; // Defina o volume do player de áudio
      }
      this.audioPlayer
        .play()
        .then(() => {
          this.isPlaying = true;
        })
        .catch(() => {});

      this.audioPlayer.onended = () => {
        this.isPlaying = false;
        this.audioPlayer = null;
      };
    }
  }

  playEnd() {
    if (this.audioPlayer && !this.audioPlayer.paused) {
      this.audioPlayer.pause();
      this.isPlaying = false;
    } else {
      if (!this.audioPlayer) {
        this.audioPlayer = new Audio('../../../../assets/audio/ChildofLight.mp3');
        this.audioPlayer.volume = this.volume; // Defina o volume do player de áudio
      }
      this.audioPlayer
        .play()
        .then(() => {
          this.isPlaying = true;
        })
        .catch(() => {});

      this.audioPlayer.onended = () => {
        this.isPlaying = false;
        this.audioPlayer = null;
      };
    }
  }

  playToasty() {
    if (this.audioPlayer && !this.audioPlayer.paused) {
      this.audioPlayer.pause();
      this.isPlaying = false;
    } else {
      if (!this.audioPlayer) {
        this.audioPlayer = new Audio('../../../../assets/audio/toasty.mp3');
        this.audioPlayer.volume = this.volume; // Defina o volume do player de áudio
      }
      this.audioPlayer
        .play()
        .then(() => {
          this.isPlaying = true;
        })
        .catch(() => {});

      this.audioPlayer.onended = () => {
        this.isPlaying = false;
        this.audioPlayer = null;
      };
    }
  }


}
