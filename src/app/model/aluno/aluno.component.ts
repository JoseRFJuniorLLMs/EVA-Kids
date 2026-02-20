// Possível caminho: src/app/components/aluno/aluno.component.ts
import { Component, OnInit, OnDestroy, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms'; // Se for usar formulários aqui
import { Observable, Subscription, of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar'; // Exemplo
import { MatDialog, MatDialogModule } from '@angular/material/dialog'; // Exemplo
import { MatButtonModule } from '@angular/material/button'; // Exemplo
import { MatIconModule } from '@angular/material/icon'; // Exemplo
import { MatCardModule } from '@angular/material/card'; // Exemplo
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner'; // Exemplo

// Importe o serviço e a interface que definimos
import { AlunoService } from '../aluno/aluno.service'; // Ajuste o caminho
import { Aluno } from '../../model/aluno/aluno'; // Ajuste o caminho

// Importe componentes de diálogo (se for usar, precisam ser criados)
// import { EditAlunoDialogComponent } from './edit-aluno-dialog/edit-aluno-dialog.component';
// import { DeleteAlunoDialogComponent } from './delete-aluno-dialog/delete-aluno-dialog.component';

// Importe o AuthService se precisar obter o UID do usuário logado
import { AuthService } from 'src/app/pages/pages/auth/login/auth.service';

@Component({
  selector: 'app-aluno', // Nome do seletor do seu componente
  templateUrl: './aluno.component.html', // Arquivo HTML a ser criado
  styleUrls: ['./aluno.component.scss'], // Arquivo SCSS a ser criado
  standalone: true, // Usando componente standalone como no exemplo
  imports: [
    CommonModule,
    FormsModule, // Adicionar se usar [(ngModel)]
    ReactiveFormsModule, // Adicionar se usar Reactive Forms
    MatSnackBarModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatProgressSpinnerModule,
    // Adicionar outros módulos do Angular Material ou de terceiros necessários
    // EditAlunoDialogComponent, // Importar se usar
    // DeleteAlunoDialogComponent // Importar se usar
  ]
})
export class AlunoComponent implements OnInit, OnDestroy {

  // Propriedades para armazenar os dados
  aluno$: Observable<Aluno | null> | null = null; // Para exibir dados de um aluno específico (ex: logado ou selecionado)
  // Ou talvez uma lista?
  // alunos$: Observable<Aluno[]> | null = null;

  isLoading: boolean = false;
  error: string | null = null;
  private subscriptions = new Subscription(); // Para gerenciar subscriptions

  // ID do aluno a ser carregado (pode vir de um Input, Rota, ou ser o UID do usuário logado)
  alunoId: string | null = null; // Exemplo: você precisará definir como obter este ID

  constructor(
    private alunoService: AlunoService,
    private authService: AuthService, // Injetar se precisar do UID
    public dialog: MatDialog, // Injetar se usar MatDialog
    private snackBar: MatSnackBar // Injetar se usar MatSnackBar
  ) {}

  ngOnInit(): void {
    // Decida como obter o ID do aluno a ser exibido
    // Exemplo 1: Obter ID do usuário logado
    // this.loadAlunoLogado();

    // Exemplo 2: Se o ID vier de uma rota ou Input()
    // if (this.alunoId) {
    //   this.loadAlunoById(this.alunoId);
    // } else {
    //   console.error("ID do Aluno não fornecido.");
    //   this.error = "ID do Aluno não fornecido.";
    // }

    // Chame aqui o método para carregar os dados iniciais
  }

  ngOnDestroy(): void {
    // Cancela todas as subscriptions para evitar memory leaks
    this.subscriptions.unsubscribe();
  }

  // --- Métodos para Carregar Dados ---

  loadAlunoLogado(): void {
    this.isLoading = true;
    this.error = null;
    this.aluno$ = this.alunoService.getAlunoDataLogado().pipe(
      tap(data => {
        this.isLoading = false;
        if (!data) {
            this.error = 'Aluno não encontrado.';
        }
      }),
      catchError(err => {
        this.isLoading = false;
        this.error = 'Erro ao carregar dados do aluno.';
        return of(null); // Retorna null em caso de erro
      })
    );
  }

  loadAlunoById(id: string): void {
     if (!id) {
        this.error = 'ID inválido para busca.';
        return;
     }
     this.isLoading = true;
     this.error = null;
     this.aluno$ = this.alunoService.getAlunoById(id).pipe(
       tap(data => {
         this.isLoading = false;
         if (!data) {
           this.error = 'Aluno não encontrado.';
         }
       }),
       catchError(err => {
         this.isLoading = false;
         this.error = 'Erro ao carregar dados do aluno.';
         return of(null);
       })
     );
  }

  // --- Métodos para Ações (Exemplos) ---

  // Exemplo: Método chamado por um botão de editar no template
  editarAluno(aluno: Aluno): void {
     if (!aluno._id) {
        this.showSnackbar('Erro: Aluno sem ID.');
        return;
     }
     // LÓGICA PARA ABRIR DIÁLOGO DE EDIÇÃO:
     // const dialogRef = this.dialog.open(EditAlunoDialogComponent, {
     //   width: '80vw', // Ou o tamanho desejado
     //   data: { ...aluno } // Passa uma cópia dos dados para o diálogo
     // });
     //
     // const sub = dialogRef.afterClosed().subscribe(result => {
     //   if (result) { // Se o usuário salvou no diálogo (o diálogo retorna os dados atualizados)
     //     this.updateAluno(aluno._id!, result);
     //   }
     // });
     // this.subscriptions.add(sub); // Adiciona ao gerenciador de subscriptions

     alert('Lógica para abrir diálogo de edição não implementada.'); // Placeholder
  }

  // Exemplo: Método para atualizar o aluno (chamado após fechar diálogo, por exemplo)
  updateAluno(id: string, data: Partial<Aluno>): void {
     this.isLoading = true; // Pode querer um loading específico para update
     // LÓGICA PARA CHAMAR O SERVIÇO DE UPDATE:
     // this.alunoService.updateAlunoData(id, data)
     //   .then(() => {
     //     this.isLoading = false;
     //     console.log(`Aluno ${id} atualizado com sucesso.`);
     //     this.showSnackbar('Aluno atualizado com sucesso!');
     //     // Recarregar dados se necessário this.loadAlunoById(id);
     //   })
     //   .catch(error => {
     //     this.isLoading = false;
     //     console.error(`Erro ao atualizar aluno ${id}:`, error);
     //     this.showSnackbar('Erro ao atualizar aluno.');
     //   });

     alert('Lógica de atualização não implementada.'); // Placeholder
     this.isLoading = false;
  }

  // Exemplo: Método chamado por um botão de deletar no template
  deletarAluno(aluno: Aluno): void {
    if (!aluno._id) {
        this.showSnackbar('Erro: Aluno sem ID.');
        return;
     }
     // LÓGICA PARA ABRIR DIÁLOGO DE CONFIRMAÇÃO:
     // const dialogRef = this.dialog.open(DeleteAlunoDialogComponent, {
     //   width: '350px',
     //   data: { nome: aluno.nome } // Passa dados para confirmação
     // });
     //
     // const sub = dialogRef.afterClosed().subscribe(result => {
     //   if (result) { // Se o usuário confirmou
     //     this.confirmDelete(aluno._id!);
     //   }
     // });
     // this.subscriptions.add(sub);

     alert('Lógica para abrir diálogo de deleção não implementada.'); // Placeholder
  }

  // Exemplo: Método para confirmar a deleção (chamado após fechar diálogo)
  confirmDelete(id: string): void {
     this.isLoading = true; // Pode querer um loading específico para delete
     // LÓGICA PARA CHAMAR O SERVIÇO DE DELETE:
     // this.alunoService.deleteAlunoData(id)
     //   .then(() => {
     //     this.isLoading = false;
     //     console.log(`Aluno ${id} deletado com sucesso.`);
     //     this.showSnackbar('Aluno deletado com sucesso!');
     //     // Redirecionar ou limpar a view se necessário
     //     this.aluno$ = of(null);
     //     this.error = 'Aluno foi deletado.';
     //   })
     //   .catch(error => {
     //     this.isLoading = false;
     //     console.error(`Erro ao deletar aluno ${id}:`, error);
     //     this.showSnackbar('Erro ao deletar aluno.');
     //   });

     alert('Lógica de deleção não implementada.'); // Placeholder
     this.isLoading = false;
  }

  // --- Métodos Auxiliares ---

  showSnackbar(message: string, action: string = 'Fechar'): void {
    this.snackBar.open(message, action, {
      duration: 3000, // Duração em milissegundos
      verticalPosition: 'top', // Ou 'bottom'
      horizontalPosition: 'center' // Ou 'start', 'end'
    });
  }
}