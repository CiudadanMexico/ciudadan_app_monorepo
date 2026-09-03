import { DocumentEntity } from '../entities/DocumentEntity';

export interface IDocumentRepository {
    /**
     * Obtiene los metadatos y fechas para armar el árbol
     */
    findAllForTree(): Promise<
        Pick<DocumentEntity, 'document_id' | 'path' | 'title' | 'created_at' | 'updated_at'>[]
    >;

    /**
     * Busca un documento únicamente por su ruta
    */
    findByPath(path: string): Promise<DocumentEntity | null>;

    /**
     * Buscador por coincidencia en título o ruta
    */
    searchByQuery(query: string): Promise<DocumentEntity[]>;

    /**
     * Guarda o actualiza un documento
    */
    save(document: DocumentEntity): Promise<void>;

    /**
     * Elimina un documento por su ruta
    */
    deleteByPath(path: string): Promise<void>;
}