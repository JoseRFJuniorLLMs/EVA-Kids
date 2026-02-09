import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { Aluno } from './aluno';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AlunoService {
  private apiUrl = `${environment.evaBack.apiUrl}/kids`;

  constructor(private http: HttpClient) {}

  getAlunoDataLogado(): Observable<Aluno | null> {
    return this.http.get<any>(`${this.apiUrl}/profile`).pipe(
      map(data => this.mapToAluno(data)),
      catchError(() => of(null))
    );
  }

  getAlunoById(id: string): Observable<Aluno | null> {
    if (!id) return of(null);
    return this.http.get<any>(`${this.apiUrl}/students/${id}`).pipe(
      map(data => this.mapToAluno(data)),
      catchError(() => of(null))
    );
  }

  getAlunos(): Observable<Aluno[]> {
    return this.http.get<any[]>(`${this.apiUrl}/students`).pipe(
      map(list => list.map(s => this.mapToAluno(s))),
      catchError(() => of([]))
    );
  }

  addAlunoData(alunoData: Omit<Aluno, '_id'>): Promise<any> {
    return this.http.post(`${this.apiUrl}/students`, {
      name: alunoData.nome,
      city: alunoData.enderecoPrincipal?.logradouro || undefined,
      gender: alunoData.sexo || undefined,
      phone: alunoData.contatos?.[0]?.valor || undefined,
    }).toPromise();
  }

  updateAlunoData(id: string, data: Partial<Aluno>): Promise<void> {
    if (!id) return Promise.reject(new Error('ID obrigatorio'));
    return this.http.put(`${this.apiUrl}/profile`, {
      name: data.nome,
    }).toPromise().then(() => {});
  }

  deleteAlunoData(id: string): Promise<void> {
    if (!id) return Promise.reject(new Error('ID obrigatorio'));
    return Promise.resolve();
  }

  searchAlunosPorNome(nome: string): Observable<Aluno[]> {
    return this.getAlunos().pipe(
      map(alunos => alunos.filter(a => a.nome?.toLowerCase().includes(nome.toLowerCase())))
    );
  }

  private mapToAluno(data: any): Aluno {
    return {
      _id: data.usuario_id?.toString() || data.id?.toString(),
      cdpes: data.id || 0,
      nome: data.name || data.usuario_nome || '',
      dtnasc: null,
      dtcad: new Date() as any,
      ativo: data.status === 'active',
      cpf: null,
      sexo: data.gender as any,
      fotoUrl: data.image_url,
      status: data.status,
    };
  }
}
