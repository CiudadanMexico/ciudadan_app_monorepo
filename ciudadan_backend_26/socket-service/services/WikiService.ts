import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { IDocumentRepository } from '../repository/IDocumentRepository';
import {
    TreeNodeDTO,
    DocumentResponseDTO,
    SearchResultDTO
} from '../dto/TreeNodeDTO';
import { DocumentEntity } from '../entities/DocumentEntity';
import { MarkdownParser } from '../routes/utils/MarkdownParser';
import { WikiSectionResponseDTO } from '../dto/WikiDTO';

export class WikiService {
    constructor(private readonly documentRepository: IDocumentRepository) {}

    /**
     * Obtiene el árbol jerárquico de archivos filtrado por la sección solicitada (help, main, faq)
    */
    async getWikiSection(section: string): Promise<WikiSectionResponseDTO> {
        const allDocs = await this.documentRepository.findAllForTree();

        const cleanSection = section.toLowerCase().trim();
        const sectionPrefix = `wiki/${cleanSection}/`;

        // Filtrar solo los documentos que pertenecen a esta sección asegurando normalización de rutas
        const sectionDocs = allDocs.filter(doc => {
            if (!doc.path) return false;
            const normalizedPath = doc.path.replace(/\\/g, '/').replace(/^\/+/, '').toLowerCase();
            return normalizedPath.startsWith(sectionPrefix);
        });

        // Mapear los documentos recortando limpiamente el prefijo de la sección
        const preparedDocs = sectionDocs.map(doc => {
            const normalized = doc.path.replace(/\\/g, '/').replace(/^\/+/, '');
            const lowerNorm = normalized.toLowerCase();
            const index = lowerNorm.indexOf(sectionPrefix);

            const relativePath = index !== -1
                ? normalized.substring(index + sectionPrefix.length)
                : normalized;

            return {
                document_id: doc.document_id,
                title: doc.title,
                relativePath: relativePath,
                fullPath: doc.path,
                created_at: doc.created_at || new Date().toISOString(),
                updated_at: doc.updated_at || new Date().toISOString()
            };
        });

        const tree = this.buildSectionFileTree(preparedDocs);

        return {
            section,
            title: `Explorador de Archivos - ${section.toUpperCase()}`,
            tree
        };
    }

    /**
     * Guarda o actualiza un documento en la base de datos controlando fechas
    */
    async saveDocument(
        filePath: string,
        title: string,
        content: string
    ): Promise<DocumentEntity> {
        // Normalizar ruta para almacenamiento uniforme (formato UNIX posix)
        const normalizedFilePath = filePath.replace(/\\/g, '/').replace(/^\/+/, '');
        const contentHash = crypto.createHash('sha256').update(content, 'utf-8').digest('hex');
        const now = new Date().toISOString();

        // 1. Crear directorios físicos y escribir el archivo en disco (FS)
        const fullDiskPath = path.resolve(process.cwd(), filePath);
        const folderPath = path.dirname(fullDiskPath);

        // Si la subcarpeta no existe en disco, se crea
        if (!fs.existsSync(folderPath)) {
            fs.mkdirSync(folderPath, { recursive: true });
        }

        // Escribir el archivo físico .md con el contenido
        fs.writeFileSync(fullDiskPath, content, 'utf-8');

        // Persistir metadatos en SQLite (ciudadan.db)
        const existingDoc = await this.documentRepository.findByPath(normalizedFilePath);

        const docEntity: DocumentEntity = {
            document_id: existingDoc ? existingDoc.document_id : `doc_${crypto.randomUUID()}`,
            path: normalizedFilePath,
            title: title || 'Sin Título',
            content_hash: contentHash,
            created_at: existingDoc?.created_at || now,
            updated_at: now,
            wiki_id: existingDoc?.wiki_id,
            node_id: existingDoc?.node_id,
            origin_node: existingDoc?.origin_node,
            authority_node: existingDoc?.authority_node
        };

        await this.documentRepository.save(docEntity);
        return docEntity;
    }

    /**
     * Método puente para mantener compatibilidad con el router (`wikiService.getDocument`)
     */
    async getDocument(docPath: string): Promise<DocumentResponseDTO | null> {
        return this.getDocumentByPath(docPath);
    }

    /**
     * Obtiene un documento por su ruta y devuelve el HTML parseado con sus fechas
    */
    async getDocumentByPath(
        docPath: string,
        rawContentMock?: string
    ): Promise<DocumentResponseDTO | null> {
        const normalizedPath = docPath.replace(/\\/g, '/').replace(/^\/+/, '');

        // 1. Intentamos buscar el documento en la base de datos
        let doc = await this.documentRepository.findByPath(normalizedPath);

        // 2. Ruta absoluta en el disco del servidor
        const fullDiskPath = path.resolve(process.cwd(), normalizedPath);

        // 3. FALLBACK: Si no está registrado en BD pero sí existe físicamente en disco, creamos un DTO virtual
        if (!doc) {
            if (fs.existsSync(fullDiskPath)) {
                const inferredTitle = path.basename(normalizedPath, '.md').replace(/[-_]/g, ' ');
                doc = {
                    document_id: `doc_virtual_${crypto.randomUUID()}`,
                    path: normalizedPath,
                    title: inferredTitle.charAt(0).toUpperCase() + inferredTitle.slice(1),
                    content_hash: '',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                };
            } else {
                return null; // No existe ni en BD ni en disco (404 real)
            }
        }

        let markdown = rawContentMock;

        // Leer el contenido directamente del disco si no se provee un mock
        if (!markdown) {
            if (fs.existsSync(fullDiskPath)) {
                markdown = fs.readFileSync(fullDiskPath, 'utf-8');
            } else {
                markdown = `# ${doc.title}\n\n⚠️ El archivo físico no se encontró en la ruta: ${normalizedPath}`;
            }
        }

        const { html, wikiLinks } = MarkdownParser.parse(markdown, normalizedPath);

        return {
            documentId: doc.document_id,
            title: doc.title,
            path: doc.path,
            rawContent: markdown,
            htmlContent: html,
            wikiLinks,
            createdAt: doc.created_at,
            updatedAt: doc.updated_at
        };
    }

    /**
     * Busca tanto CARPETAS como ARCHIVOS dentro del árbol que coincidan con la búsqueda
     */
    async searchNodes(query: string, section?: string): Promise<SearchResultDTO[]> {
        const cleanQuery = query.toLowerCase().trim();
        if (!cleanQuery) return [];

        const allDocs = await this.documentRepository.findAllForTree();

        // Filtrar por sección si se especifica
        const docs = section
            ? allDocs.filter(d => d.path.replace(/\\/g, '/').toLowerCase().startsWith(`wiki/${section.toLowerCase()}/`))
            : allDocs;

        const resultsMap = new Map<string, SearchResultDTO>();

        for (const doc of docs) {
            const cleanPath = doc.path.replace(/\\/g, '/').replace(/^\//, '');
            const parts = cleanPath.split('/');

            let pathAccumulator = '';

            for (let i = 0; i < parts.length; i++) {
                const part = parts[i];
                const isFile = i === parts.length - 1;

                pathAccumulator = pathAccumulator ? `${pathAccumulator}/${part}` : part;

                if (part.toLowerCase().includes(cleanQuery)) {
                    if (!resultsMap.has(pathAccumulator)) {
                        resultsMap.set(pathAccumulator, {
                            name: isFile ? doc.title : part,
                            type: isFile ? 'file' : 'folder',
                            path: pathAccumulator,
                            documentId: isFile ? doc.document_id : undefined,
                            createdAt: doc.created_at,
                            updatedAt: doc.updated_at
                        });
                    }
                }
            }
        }

        return Array.from(resultsMap.values());
    }

    /**
     * Construye el árbol jerárquico dentro de una sección específica ocultando el nivel 'main'.
    */
    private buildSectionFileTree(
        rows: { document_id: string; relativePath: string; fullPath: string; title: string; created_at: string; updated_at: string }[]
    ): TreeNodeDTO[] {
        const root: TreeNodeDTO[] = [];

        for (const row of rows) {
            const cleanPath = row.relativePath ? row.relativePath.replace(/\\/g, '/').replace(/^\//, '') : '';
            let parts = cleanPath.split('/').filter(Boolean);

            if (parts.length > 0 && parts[0].toLowerCase() === 'main') {
                parts = parts.slice(1);
            }

            if (parts.length === 0) continue;

            let currentLevel = root;
            let currentRelativeAccumulator = '';

            for (let i = 0; i < parts.length; i++) {
                const part = parts[i];
                const isFile = i === parts.length - 1;

                currentRelativeAccumulator = currentRelativeAccumulator
                    ? `${currentRelativeAccumulator}/${part}`
                    : part;

                if (isFile) {
                    currentLevel.push({
                        name: row.title || part,
                        type: 'file',
                        path: row.fullPath,
                        documentId: row.document_id,
                        createdAt: row.created_at,
                        updatedAt: row.updated_at
                    });
                } else {
                    let folderNode = currentLevel.find(
                        (node) => node.type === 'folder' && node.name.toLowerCase() === part.toLowerCase()
                    );

                    if (!folderNode) {
                        folderNode = {
                            name: part,
                            type: 'folder',
                            path: currentRelativeAccumulator,
                            createdAt: row.created_at,
                            updatedAt: row.updated_at,
                            children: []
                        };
                        currentLevel.push(folderNode);
                    } else {
                        if (new Date(row.updated_at) > new Date(folderNode.updatedAt || 0)) {
                            folderNode.updatedAt = row.updated_at;
                        }
                    }

                    if (!folderNode.children) {
                        folderNode.children = [];
                    }

                    currentLevel = folderNode.children;
                }
            }
        }

        return root;
    }
}

