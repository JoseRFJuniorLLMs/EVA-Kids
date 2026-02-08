// Possível caminho: src/app/services/aluno.service.ts
import { Injectable } from '@angular/core';
import { AngularFirestore, AngularFirestoreDocument, AngularFirestoreCollection, DocumentReference } from '@angular/fire/compat/firestore';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { Observable, of, from, throwError } from 'rxjs';
import { switchMap, map, catchError } from 'rxjs/operators';
import firebase from 'firebase/compat/app'; // Para Timestamp e DocumentReference

// Importa a interface Aluno detalhada que criamos anteriormente
// Ajuste o caminho se necessário
import { Aluno } from './aluno';

@Injectable({
  providedIn: 'root'
})
export class AlunoService {
  // Nome da coleção principal onde os dados da pessoa/aluno são armazenados
  // Baseado na análise do SQL, 'pessoas' parece mais adequado que 'alunos'
  private pessoaCollectionName = 'pessoas';
  // Pode ser necessário interagir com outras coleções (matriculas, etc.)

  constructor(
    private afs: AngularFirestore,
    private afAuth: AngularFireAuth
  ) {}

  /**
   * Obtém os dados do Aluno associado ao usuário autenticado atualmente.
   * Assume que o UID do usuário autenticado é o ID do documento na coleção 'pessoas'.
   * @returns Observable<Aluno | null>
   */
  getAlunoDataLogado(): Observable<Aluno | null> {
    return this.afAuth.authState.pipe(
      switchMap(user => {
        if (user?.uid) {
          console.log(`Buscando dados para Aluno/Pessoa com UID: ${user.uid}`);
          return this.afs.doc<Aluno>(`${this.pessoaCollectionName}/${user.uid}`)
            .valueChanges({ idField: '_id' }) // Inclui o ID do documento no objeto
            .pipe(
              map(aluno => aluno || null), // Retorna null se o documento não existir
              catchError(error => {
                console.error(`Erro ao buscar dados do aluno ${user.uid}:`, error);
                return of(null); // Retorna null em caso de erro
              })
            );
        } else {
          // Nenhum usuário autenticado
          return of(null);
        }
      })
    );
  }

  /**
   * Obtém os dados de um Aluno/Pessoa específico pelo seu ID de documento Firestore.
   * @param id ID do documento na coleção 'pessoas'.
   * @returns Observable<Aluno | null>
   */
  getAlunoById(id: string): Observable<Aluno | null> {
    if (!id) return of(null);
    console.log(`Buscando dados para Aluno/Pessoa com ID: ${id}`);
    return this.afs.doc<Aluno>(`${this.pessoaCollectionName}/${id}`)
      .valueChanges({ idField: '_id' }) // Inclui o ID do documento no objeto
      .pipe(
        map(aluno => aluno || null),
        catchError(error => {
          console.error(`Erro ao buscar dados do aluno ${id}:`, error);
          return of(null);
        })
      );
  }

  /**
   * Obtém uma lista de todos os Alunos/Pessoas.
   * ATENÇÃO: Buscar *todos* os documentos com ~92 campos cada pode ser ineficiente.
   * Considere adicionar filtros ou paginação aqui (ex: por nome, status, etc.).
   * @returns Observable<Aluno[]>
   */
  getAlunos(): Observable<Aluno[]> {
    console.log(`Buscando todos os documentos da coleção ${this.pessoaCollectionName}`);
    return this.afs.collection<Aluno>(this.pessoaCollectionName)
      .snapshotChanges() // Use snapshotChanges para obter ID e dados
      .pipe(
        map(actions => actions.map(a => {
          const data = a.payload.doc.data() as Aluno;
          const id = a.payload.doc.id;
          return { _id: id, ...data }; // Combina ID do documento com os dados
        })),
        catchError(error => {
          console.error(`Erro ao buscar lista de alunos:`, error);
          return of([]); // Retorna array vazio em caso de erro
        })
      );

    // TODO: Implementar filtros, paginação ou queries mais específicas se necessário,
    // por exemplo, para buscar apenas pessoas com papel 'aluno':
    // return this.afs.collection<Aluno>(this.pessoaCollectionName, ref => ref.where('papeis', 'array-contains', 'aluno'))
    //   .snapshotChanges()...
  }

  /**
   * Adiciona um novo documento de Aluno/Pessoa no Firestore.
   * @param alunoData Objeto Aluno (sem o _id, que será gerado ou é o UID).
   * Certifique-se de que o objeto contenha todos os campos necessários
   * e que as referências (DocumentReference) sejam válidas.
   * @returns Promise<DocumentReference> Retorna a referência ao documento criado.
   */
  addAlunoData(alunoData: Omit<Aluno, '_id'>): Promise<DocumentReference> {
     console.log("Adicionando novo Aluno/Pessoa:", alunoData);
    // LÓGICA FIRESTORE PARA ADICIONAR DADOS:
    // Exemplo:
    // const dataComTimestamp: Aluno = {
    //   ...alunoData,
    //   dtcad: firebase.firestore.FieldValue.serverTimestamp(), // Garante timestamp do servidor
    //   ultimaAtualizacao: firebase.firestore.FieldValue.serverTimestamp()
    // };
    // // Se o ID for gerado automaticamente:
    // // return this.afs.collection<Aluno>(this.pessoaCollectionName).add(dataComTimestamp);
    //
    // // Se o ID for o UID do Auth (precisaria receber o UID como parâmetro):
    // // const uid = ???; // Obter de algum lugar
    // // return this.afs.doc<Aluno>(`${this.pessoaCollectionName}/${uid}`).set(dataComTimestamp)
    // //   .then(() => this.afs.doc(`${this.pessoaCollectionName}/${uid}`).ref); // Retorna a referência

     return Promise.reject(new Error('Implementação Firestore não gerada automaticamente.')); // Placeholder
  }

  /**
   * Atualiza os dados de um Aluno/Pessoa existente no Firestore.
   * @param id ID do documento a ser atualizado.
   * @param data Objeto parcial com os campos a serem atualizados.
   * Use FieldValue.serverTimestamp() para atualizar timestamps.
   * Use FieldValue.delete() para remover campos.
   * @returns Promise<void>
   */
  updateAlunoData(id: string, data: Partial<Aluno>): Promise<void> {
    if (!id) {
      return Promise.reject(new Error('ID do Aluno/Pessoa é obrigatório para atualização.'));
    }
    console.log(`Atualizando Aluno/Pessoa ${id} com dados:`, data);
    // LÓGICA FIRESTORE PARA ATUALIZAR DADOS:
    // Exemplo:
    // const dataComTimestamp = {
    //   ...data,
    //   ultimaAtualizacao: firebase.firestore.FieldValue.serverTimestamp()
    // };
    // return this.afs.doc<Aluno>(`${this.pessoaCollectionName}/${id}`).update(dataComTimestamp);

     return Promise.reject(new Error('Implementação Firestore não gerada automaticamente.')); // Placeholder
  }

  /**
   * Deleta um documento de Aluno/Pessoa do Firestore.
   * ATENÇÃO: Isso deleta permanentemente os dados no Firestore.
   * Considere implementar uma exclusão lógica (campo 'ativo: false') em vez disso.
   * @param id ID do documento a ser deletado.
   * @returns Promise<void>
   */
  deleteAlunoData(id: string): Promise<void> {
    if (!id) {
      return Promise.reject(new Error('ID do Aluno/Pessoa é obrigatório para deleção.'));
    }
    console.warn(`Deletando Aluno/Pessoa com ID: ${id}`);
    // LÓGICA FIRESTORE PARA DELETAR DADOS:
    // return this.afs.doc<Aluno>(`${this.pessoaCollectionName}/${id}`).delete();

     return Promise.reject(new Error('Implementação Firestore não gerada automaticamente.')); // Placeholder
  }

  // --- Métodos Adicionais (Exemplos) ---

  /**
   * Exemplo: Buscar alunos por nome (requer criação de índices no Firestore se complexo).
   * @param nome Termo de busca para o nome.
   * @returns Observable<Aluno[]>
   */
  searchAlunosPorNome(nome: string): Observable<Aluno[]> {
    console.log(`Buscando alunos por nome: ${nome}`);
    // LÓGICA FIRESTORE PARA BUSCA:
    // // Busca simples por igualdade (case-sensitive):
    // // return this.afs.collection<Aluno>(this.pessoaCollectionName, ref => ref.where('nome', '==', nome))
    // //   .snapshotChanges().pipe(map(...));
    //
    // // Busca mais flexível (ex: "começa com", requer nomeNormalizado, pode precisar de índices):
    // const nomeNorm = nome.toLowerCase(); // Normalizar busca
    // return this.afs.collection<Aluno>(
    //     this.pessoaCollectionName,
    //     ref => ref.where('nomeNormalizado', '>=', nomeNorm)
    //               .where('nomeNormalizado', '<=', nomeNorm + '\uf8ff')
    //               .orderBy('nomeNormalizado') // Necessário para range query
    //   )
    //   .snapshotChanges().pipe(map(...));

     return throwError(() => new Error('Implementação Firestore não gerada automaticamente.')); // Placeholder
  }

  /**
   * Método auxiliar para converter DocumentReference para seu ID string (se necessário).
   * @param ref DocumentReference
   * @returns string | null
   */
  getRefId(ref: DocumentReference | null | undefined): string | null {
    return ref ? ref.id : null;
  }

  /**
   * Método auxiliar para criar uma DocumentReference a partir de um ID e coleção (se necessário).
   * @param collectionPath Caminho da coleção (ex: 'cidades')
   * @param id ID do documento
   * @returns DocumentReference | null
   */
  createRef(collectionPath: string, id: string | null | undefined): DocumentReference | null {
   // return id ? this.afs.doc(`${collectionPath}/${id}`).ref : null;
  }

}