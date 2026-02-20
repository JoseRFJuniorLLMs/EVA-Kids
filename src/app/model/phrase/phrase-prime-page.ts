import { PhrasePrime } from './phrase-prime';

export interface PhrasePrimePage {
  phases: PhrasePrime[];
  totalElements: number;
  totalPages?: number;
}
