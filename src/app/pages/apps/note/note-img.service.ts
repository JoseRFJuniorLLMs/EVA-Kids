import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class NoteImgService {
  imagePrompt = '';
  generatedImageUrl = '';

  private apiKey: string;
  private baseUrl = 'https://generativelanguage.googleapis.com/v1beta';

  constructor(private http: HttpClient) {
    this.apiKey = (environment as any).geminiApiKey ||
      environment.ai?.gemini?.apiKey || '';
  }

  generateImage(selectedText: string): void {
    if (!this.apiKey) return;

    const url = `${this.baseUrl}/models/gemini-1.5-flash:generateContent?key=${this.apiKey}`;

    this.http.post<any>(url, {
      contents: [{
        parts: [{
          text: `Create a simple, child-friendly description of an image for: "${selectedText}". Respond with only a URL-safe description.`
        }]
      }]
    }).subscribe({
      next: (response) => {
        const text = response?.candidates?.[0]?.content?.parts?.[0]?.text;
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
