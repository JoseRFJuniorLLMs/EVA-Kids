
import { Injectable } from '@angular/core';
import {
  HttpClient,
  HttpHeaders
} from '@angular/common/http';
import { MatSnackBar } from '@angular/material/snack-bar';
import { environment } from 'src/environments/environment';


@Injectable({
  providedIn: 'root'
})

export class NoteImgService {

    imagePrompt: string = '';
    generatedImageUrl: string = '';

    constructor(
        private _snackBar: MatSnackBar,
        private http: HttpClient,
      ) {
      }

/* ==================Generate Image From OpenAI==================== */
generateImageFromOpenAI(selectedText: string) {
    const openAIKey = environment.ai?.gemini?.apiKey || '';
    const headers = new HttpHeaders({
      Authorization: `Bearer ${openAIKey}`,
      'Content-Type': 'application/json'
    });
    const body = {
      model: 'dall-e-3',
      prompt: selectedText,
      quality: 'standard',
      size: '1024x1024',
      n: 1
    };
    this.http
      .post<any>('https://api.openai.com/v1/images/generations', body, {
        headers
      })
      .subscribe({
        next: (response) => {
          this.generatedImageUrl = response.data[0].url;
        },
        error: (error) => {
          console.error('Erro ao gerar a imagem:', error);
        }
      });
    } 


}//fim
