import Database from 'better-sqlite3';
import { IDocumentRepository } from '../IDocumentRepository';
import { DocumentEntity } from '../../entities/DocumentEntity';

export class DocumentRepositoryImpl implements IDocumentRepository {
    constructor(private readonly db: Database.Database) {}

    /**
     * Obtiene los metadatos y fechas necesarios para armar el árbol
    */
    async findAllForTree(): Promise<
        Pick<DocumentEntity, 'document_id' | 'path' | 'title' | 'created_at' | 'updated_at'>[]
    > {
        const stmt = this.db.prepare(`
            SELECT document_id, path, title, created_at, updated_at 
            FROM documents 
            ORDER BY path ASC;
        `);
        return stmt.all() as Pick<DocumentEntity, 'document_id' | 'path' | 'title' | 'created_at' | 'updated_at'>[];
    }

    /**
     * Busca un documento únicamente por su ruta
    */
    async findByPath(path: string): Promise<DocumentEntity | null> {
        const stmt = this.db.prepare(
            'SELECT * FROM documents WHERE path = ? LIMIT 1;'
        );
        const row = stmt.get(path) as DocumentEntity | undefined;
        return row || null;
    }

    /**
     * Busca coincidencias parciales en título o ruta para el buscador
    */
    async searchByQuery(query: string): Promise<DocumentEntity[]> {
        const stmt = this.db.prepare(`
            SELECT * FROM documents 
            WHERE path LIKE ? OR title LIKE ?
            ORDER BY updated_at DESC;
        `);
        const searchPattern = `%${query}%`;
        return stmt.all(searchPattern, searchPattern) as DocumentEntity[];
    }

    /**
     * Inserta o actualiza un documento conservando o definiendo created_at y updated_at
    */
    async save(doc: DocumentEntity): Promise<void> { 
        const selfNode = this.db.prepare("SELECT node_id FROM nodes WHERE is_self = 1 LIMIT 1").get() as { node_id: string } | undefined;
        const localNodeId = selfNode ? selfNode.node_id : 'local-node';

        const pathParts = doc.path.split('/');
        const wikiId = doc.wiki_id || pathParts[1] || 'main';

        const stmt = this.db.prepare(`
            INSERT INTO documents (document_id, wiki_id, node_id, path, title, content_hash, origin_node, authority_node)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(wiki_id, path) 
            DO UPDATE SET 
                title = excluded.title,
                content_hash = excluded.content_hash,
                updated_at = CURRENT_TIMESTAMP;`
        );

        stmt.run(
            doc.document_id,
            wikiId,
            localNodeId,
            doc.path,
            doc.title,
            doc.content_hash,
            localNodeId,
            localNodeId
        );
    }

    /**
     * Elimina un documento por su ruta
    */
    async deleteByPath(path: string): Promise<void> {
        const stmt = this.db.prepare('DELETE FROM documents WHERE path = ?;');
        stmt.run(path);
    }
}