export interface DocumentAskSource {
  index: number;
  documentId: string;
  documentTitle: string;
  chunkIndex: number;
  snippet: string;
}

export interface DocumentAskResult {
  answer: string;
  sources: DocumentAskSource[];
}

export interface DocumentAskTurn {
  question: string;
  result: DocumentAskResult;
}
