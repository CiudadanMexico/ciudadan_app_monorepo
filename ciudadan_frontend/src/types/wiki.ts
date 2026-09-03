export interface TreeNodeDTO {
  name: string;
  type: 'folder' | 'file';
  path: string;
  children?: TreeNodeDTO[];
}

export interface WikiLinkDTO {
  raw: string;
  targetPath: string;
  anchor?: string;
  alias?: string;
  displayText: string;
}

export interface DocumentResponseDTO {
  path: string;
  title: string;
  htmlContent: string;
  rawContent: string;
  wikiLinks: WikiLinkDTO[];
  updatedAt?: string;
}

export interface SearchResultDTO {
  path: string;
  title: string;
  snippet?: string;
}