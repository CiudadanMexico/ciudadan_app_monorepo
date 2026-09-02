import { ParsedWikiLink } from "./WikiDTO";

export interface TreeNodeDTO {
    name: string;
    type: 'folder' | 'file';
    path: string;
    documentId?: string;
    createdAt?: string;
    updatedAt?: string;
    children?: TreeNodeDTO[];
}

export interface DocumentResponseDTO {
    documentId: string;
    title: string;
    path: string;
    rawContent: string;
    htmlContent: string;
    wikiLinks: ParsedWikiLink[];
    createdAt: string;
    updatedAt: string;
}

// DTO para los resultados de búsqueda de archivos y carpetas
export interface SearchResultDTO {
    name: string;
    type: 'folder' | 'file';
    path: string;
    documentId?: string;
    createdAt?: string;
    updatedAt?: string;
}
