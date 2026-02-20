import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class NoteImgService {
  imagePrompt = '';
  generatedImageUrl = '';

  private chatUrl: string;

  constructor(private http: HttpClient) {
    this.chatUrl = environment.eva?.chatUrl || 'https://eva-ia.org:8091/api/chat';
  }

  generateImage(selectedText: string): void {
    if (!selectedText) return;

    this.http.post<any>(this.chatUrl, {
      message: `Create a simple, child-friendly description of an image for: "${selectedText}". Respond with only a URL-safe description.`
    }).subscribe({
      next: (response) => {
        const text = response?.response || response?.text || '';
        if (text) {
          this.generatedImageUrl = `https://via.placeholder.com/256?text=${encodeURIComponent(selectedText.slice(0, 20))}`;
        }
      },
      error: () => {
        this.generatedImageUrl = '';
      }
    });
  }
}
