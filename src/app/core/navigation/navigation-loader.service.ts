import { Injectable, OnDestroy } from '@angular/core';
import { VexLayoutService } from '@vex/services/vex-layout.service';
import { BehaviorSubject, Observable, Subscription } from 'rxjs';
import { NavigationItem } from './navigation-item.interface';
import { DataListService } from 'src/app/pages/apps/note/list/data-list.service';

@Injectable({
  providedIn: 'root'
})
export class NavigationLoaderService implements OnDestroy {
  private readonly _items: BehaviorSubject<NavigationItem[]> = new BehaviorSubject<NavigationItem[]>([]);
  private totalNotesSubject: BehaviorSubject<number> = new BehaviorSubject<number>(0);
  private notesSub: Subscription | null = null;

  get items$(): Observable<NavigationItem[]> {
    return this._items.asObservable();
  }

  constructor(
    private readonly layoutService: VexLayoutService,
    private readonly dataListService: DataListService
  ) {
    this.loadNavigation();
    this.initializeTotalNotes();
  }

  private initializeTotalNotes(): void {
    this.notesSub = this.dataListService.getTotalNotesOfTheDay().subscribe(totalNotes => {
      this.totalNotesSubject.next(totalNotes);
      this.updateNotesBadges(totalNotes);
    });
  }

  ngOnDestroy(): void {
    this.notesSub?.unsubscribe();
  }

  loadNavigation(): void {
    this._items.next([
      {
        type: 'link',
        label: 'Entrar',
        route: '/login',
        icon: 'mat:login'
      },
      {
        type: 'subheading',
        label: 'Início',
        children: [
          {
            type: 'link',
            label: 'Começar a Aprender',
            route: '/',
            icon: 'mat:rocket_launch',
            routerLinkActiveOptions: { exact: true }
          }
        ]
      },
      {
        type: 'subheading',
        label: 'Atividades',
        children: [
          {
            type: 'dropdown',
            label: 'Jogos',
            icon: 'mat:sports_esports',
            children: [
              {
                type: 'link',
                label: 'Jogo das Frases',
                route: '/apps/voicegame',
                icon: 'mat:mic'
              },
              {
                type: 'link',
                label: 'Jogo do Diálogo',
                route: '/apps/voicegame2',
                icon: 'mat:chat'
              },
              {
                type: 'link',
                label: 'Jogo Escondido',
                route: '/apps/voicegame3',
                icon: 'mat:visibility_off'
              },
              {
                type: 'link',
                label: 'Jogo dos Fragmentos',
                route: '/apps/voicegame4',
                icon: 'mat:extension'
              },
              {
                type: 'link',
                label: 'Jogo Avançado',
                route: '/apps/voicegame5',
                icon: 'mat:star'
              },
              {
                type: 'link',
                label: 'Jogo da Memória',
                route: '/apps/card',
                icon: 'mat:grid_view'
              },
              {
                type: 'link',
                label: 'Tetris',
                route: '/apps/teris',
                icon: 'mat:view_module'
              },
              {
                type: 'link',
                label: 'Dinossauro',
                route: '/apps/dino',
                icon: 'mat:pets'
              },
              {
                type: 'link',
                label: 'Caça-Palavras',
                route: '/apps/word-search',
                icon: 'mat:search'
              },
              {
                type: 'link',
                label: 'Quebra-Cabeça',
                route: '/apps/quebra-cabeca',
                icon: 'mat:dashboard'
              }
            ]
          },
          {
            type: 'dropdown',
            label: 'Minhas Notas',
            icon: 'mat:sticky_note_2',
            children: [
              {
                type: 'link',
                label: 'Ver Notas',
                route: '/apps/list',
                icon: 'mat:list_alt',
                badge: {
                  value: this.totalNotesSubject.getValue().toString(),
                  bgClass: 'bg-purple-600',
                  textClass: 'text-white'
                }
              },
              {
                type: 'link',
                label: 'Mapa das Notas',
                route: '/apps/graph',
                icon: 'mat:bubble_chart'
              },
              {
                type: 'link',
                label: 'Criar Nota',
                route: '/apps/notes',
                icon: 'mat:add_circle'
              }
            ]
          },
          {
            type: 'dropdown',
            label: 'Livros',
            icon: 'mat:auto_stories',
            children: [
              {
                type: 'link',
                label: 'Ler Livros',
                route: '/apps/books',
                icon: 'mat:menu_book'
              },
              {
                type: 'link',
                label: 'Aprender Gramática',
                route: '/apps/grammar-analyzer',
                icon: 'mat:spellcheck'
              }
            ]
          },
          {
            type: 'link',
            label: 'Aulas',
            route: '/apps/clase',
            icon: 'mat:school'
          },
          {
            type: 'link',
            label: 'Meus Amigos',
            route: '/apps/aio-table',
            icon: 'mat:groups'
          },
          {
            type: 'link',
            label: 'Vídeos',
            route: '/apps/editor',
            icon: 'mat:play_circle'
          }
        ]
      },
      {
        type: 'subheading',
        label: 'Ajuda',
        children: [
          {
            type: 'link',
            label: 'Perguntas',
            route: '/pages/faq',
            icon: 'mat:help_outline'
          }
        ]
      },
      {
        type: 'subheading',
        label: 'Configurar',
        children: []
      },
      {
        type: 'link',
        label: 'Configurações',
        route: () => this.layoutService.openConfigpanel(),
        icon: 'mat:settings'
      },
      {
        type: 'link',
        label: 'Criar Conta',
        route: '/register',
        icon: 'mat:person_add'
      }
    ]);
  }

  updateNotesBadges(totalNotes: number): void {
    const updatedItems = this._items.getValue().map(item => {
      if (item.type === 'subheading' && item.label === 'Atividades') {
        item.children = item.children?.map(child => {
          if (child.type === 'dropdown' && child.label === 'Minhas Notas') {
            child.children = child.children?.map(noteChild => {
              if (noteChild.type === 'link' && (noteChild.label === 'Ver Notas')) {
                return {
                  ...noteChild,
                  badge: {
                    value: totalNotes.toString(),
                    bgClass: 'bg-purple-600',
                    textClass: 'text-white'
                  }
                };
              }
              return noteChild;
            });
          }
          return child;
        });
      }
      return item;
    });

    this._items.next(updatedItems);
  }
}
