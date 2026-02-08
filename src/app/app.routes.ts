import { VexRoutes } from '@vex/interfaces/vex-route.interface';
import { LayoutComponent } from './layouts/layout/layout.component';
import { AuthGuard } from './pages/pages/auth/login/auth.guard';
import { StudentComponent } from './pages/apps/student/form/student.component';

export const appRoutes: VexRoutes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./pages/pages/auth/login/login.component').then(
        (m) => m.LoginComponent
      )
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./pages/pages/auth/register/register.component').then(
        (m) => m.RegisterComponent
      )
  },
  {
    path: 'forgot-password',
    loadComponent: () =>
      import('./pages/pages/auth/forgot-password/forgot-password.component').then(
        (m) => m.ForgotPasswordComponent
      )
  },
  {
    path: 'coming-soon',
    loadComponent: () =>
      import('./pages/pages/coming-soon/coming-soon.component').then(
        (m) => m.ComingSoonComponent
      )
  },
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  },
  {
    path: '',
    component: LayoutComponent,
    canActivate: [AuthGuard], // Protege todas as rotas dentro de LayoutComponent
    children: [
      {
        path: 'dashboards/analytics',
        loadComponent: () =>
          import('./pages/dashboards/dashboard-analytics/dashboard-analytics.component').then(
            (m) => m.DashboardAnalyticsComponent
          )
      },
      {
        path: 'apps',
        children: [
          {
            path: 'puzzle-block',
            loadComponent: () =>
              import('./pages/apps/puzzle-block/puzzle-block.component').then(
                (m) => m.PuzzleBlockComponent
              ),
            data: {
              toolbarShadowEnabled: false
            }
          },
          {
            path: 'app-student',
            loadComponent: () =>
              import('./pages/apps/student/form/student.component').then(
                (m) => m.StudentComponent
              ),
            data: {
              toolbarShadowEnabled: false
            }
          },
          {
            path: 'notes',
            loadComponent: () =>
              import('./pages/apps/note/note.component').then(
                (m) => m.NoteComponent
              ),
            data: {
              toolbarShadowEnabled: false
            }
          },
          {
            path: 'voicegame',
            loadComponent: () =>
              import('./pages/apps/voice-comand/game.component').then(
                (m) => m.GameComponent
              ),
            data: {
              toolbarShadowEnabled: false
            }
          },
          {
            path: 'voicegame4',
            loadComponent: () =>
              import('./pages/apps/voice-comand4/game4.component').then(
                (m) => m.Game4Component
              ),
            data: {
              toolbarShadowEnabled: false
            }
          },

          {
            path: 'voicegame5',
            loadComponent: () =>
              import('./pages/apps/voice-comand5/game5.component').then(
                (m) => m.Game5Component
              ),
            data: {
              toolbarShadowEnabled: false
            }
          },
     
          {
            path: 'teris',
            loadComponent: () =>
              import('./pages/apps/teris/tetris.component').then(
                (m) => m.TetrisComponent
              ),
            data: {
              toolbarShadowEnabled: false
            }
          },

          {
            path: 'quebra-cabeca',
            loadComponent: () =>
              import('./pages/apps/quebra/quebra-cabeca.component').then(
                (m) => m.QuebraCabecaComponent
              ),
            data: {
              toolbarShadowEnabled: false
            }
          },


          {
            path: 'dino',
            loadComponent: () =>
              import('./pages/apps/dino/dinossauro.component').then(
                (m) => m.DinossauroComponent
              ),
            data: {
              toolbarShadowEnabled: false
            }
          },

          {
            path: 'word-search',
            loadComponent: () =>
              import('./pages/apps/word-search/word-search.component').then(
                (m) => m.WordSearchComponent
              ),
            data: {
              toolbarShadowEnabled: false
            }
          },


          {
            path: 'card',
            loadComponent: () =>
              import('./pages/apps/memory/card.component').then(
                (m) => m.CardComponent
              ),
            data: {
              toolbarShadowEnabled: false
            }
          },
          {
            path: 'books',
            loadComponent: () =>
              import('./pages/apps/books/books.component').then(
                (m) => m.BooksComponent
              ),
            data: {
              toolbarShadowEnabled: false
            }
          },
          {
            path: 'book3',
            redirectTo: 'books',
            pathMatch: 'full'
          },
          {
            path: 'grammar-analyzer',
            loadComponent: () =>
              import('./pages/apps/book4/grammar-analyzer.component').then(
                (m) => m.GrammarAnalyzerComponent
              ),
            data: {
              toolbarShadowEnabled: false
            }
          },
          {
            path: 'voicegame2',
            loadComponent: () =>
              import('./pages/apps/voice-comand2/game2.component').then(
                (m) => m.Game2Component
              ),
            data: {
              toolbarShadowEnabled: false
            }
          },
          {
            path: 'voicegame3',
            loadComponent: () =>
              import('./pages/apps/voice-comand3/game3.component').then(
                (m) => m.Game3Component
              ),
            data: {
              toolbarShadowEnabled: false
            }
          },
          {
            path: 'list',
            loadComponent: () =>
              import('./pages/apps/note/list/note-list.component').then(
                (m) => m.NoteListComponent
              ),
            data: {
              toolbarShadowEnabled: false
            }
          },
          {
            path: 'book',
            redirectTo: 'books',
            pathMatch: 'full'
          },
          {
            path: 'book2',
            redirectTo: 'books',
            pathMatch: 'full'
          },
          {
            path: 'clase',
            loadComponent: () =>
              import('./pages/apps/clase/clase.component').then(
                (m) => m.ClaseComponent
              ),
            data: {
              toolbarShadowEnabled: false
            }
          },
          {
            path: 'aio-table',
            loadComponent: () =>
              import('./pages/apps/student/list/aio-table.component').then(
                (m) => m.AioTableComponent
              ),
            data: {
              toolbarShadowEnabled: false
            }
          },
          {
            path: 'chat-video',
            loadComponent: () =>
              import('./pages/apps/chat-video/chat-video.component').then(
                (m) => m.ChatVideoComponent
              ),
            data: {
              toolbarShadowEnabled: false
            }
          },
          {
            path: 'graph',
            loadComponent: () =>
              import('./pages/apps/graph/graph.component').then(
                (m) => m.GraphComponent
              ),
            data: {
              toolbarShadowEnabled: false
            }
          },
          {
            path: 'editor',
            loadComponent: () =>
              import('./pages/apps/editor/editor.component').then(
                (m) => m.EditorComponent
              ),
            data: {
              scrollDisabled: true
            }
          }
        ]
      },
      {
        path: 'pages',
        children: [
          {
            path: 'pricing',
            loadComponent: () =>
              import('./pages/pages/pricing/pricing.component').then(
                (m) => m.PricingComponent
              )
          },
          {
            path: 'faq',
            loadComponent: () =>
              import('./pages/pages/faq/faq.component').then(
                (m) => m.FaqComponent
              )
          },
          {
            path: 'invoice',
            loadComponent: () =>
              import('./pages/pages/invoice/invoice.component').then(
                (m) => m.InvoiceComponent
              )
          },
          {
            path: 'error-404',
            loadComponent: () =>
              import('./pages/pages/errors/error-404/error-404.component').then(
                (m) => m.Error404Component
              )
          },
          {
            path: 'error-500',
            loadComponent: () =>
              import('./pages/pages/errors/error-500/error-500.component').then(
                (m) => m.Error500Component
              )
          }
        ]
      },
      {
        path: 'ui',
        children: [
          {
            path: 'components',
            loadChildren: () =>
              import('./pages/ui/components/components.routes')
          },
          {
            path: 'forms/form-elements',
            loadComponent: () =>
              import('./pages/ui/forms/form-elements/form-elements.component').then(
                (m) => m.FormElementsComponent
              )
          },
          {
            path: 'forms/form-wizard',
            loadComponent: () =>
              import('./pages/ui/forms/form-wizard/form-wizard.component').then(
                (m) => m.FormWizardComponent
              )
          },
          {
            path: 'icons',
            loadChildren: () => import('./pages/ui/icons/icons.routes')
          },
          {
            path: 'page-layouts',
            loadChildren: () =>
              import('./pages/ui/page-layouts/page-layouts.routes')
          }
        ]
      },
      {
        path: '**',
        loadComponent: () =>
          import('./pages/pages/errors/error-404/error-404.component').then(
            (m) => m.Error404Component
          )
      }
    ]
  }
];
