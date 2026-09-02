import { Router, Request, Response, NextFunction } from 'express';
import { ConfigDatabase } from '../config/ConfigDatabase';
import { DocumentRepositoryImpl } from '../repository/impl/DocumentRepositoryImpl';
import { WikiService } from '../services/WikiService';

type WikiSection = 'help' | 'main' | 'faq';

const router = Router();

// Inyección de dependencias interna de la Wiki
const db = ConfigDatabase.getConnection();
const documentRepository = new DocumentRepositoryImpl(db);
const wikiService = new WikiService(documentRepository);

// Middleware de validación
const validateSection = (req: Request, res: Response, next: NextFunction): void => {
    const { section } = req.params;
    const validSections: WikiSection[] = ['help', 'main', 'faq'];

    if (!validSections.includes(section as WikiSection)) {
        res.status(400).json({
            ok: false,
            error: `Sección no válida: "${section}". Las secciones permitidas son: ${validSections.join(', ')}`
        });
        return;
    }

    next();
};

// GET para obtener todos los documentos del árbol de la wiki por sección
router.get('/:section', validateSection, async (req: Request, res: Response): Promise<void> => {
    try {
        const rawSection = req.params.section;
        const section = Array.isArray(rawSection) ? rawSection[0] : (rawSection || '');

        // El backend procesa el árbol completo y oculta el nodo 'main' visualmente
        const wikiSectionData = await wikiService.getWikiSection(section);

        res.status(200).json({
            ok: true,
            section: wikiSectionData.section,
            title: wikiSectionData.title,
            nodes: wikiSectionData.tree // Enviamos el árbol estructurado directamente
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        res.status(500).json({ ok: false, error: message });
    }
});

// GET /:section/:path(*) - Permite leer un documento individual por su sección y ruta (Sin prefijo /doc)
router.get('/:section/:path(*)', validateSection, async (req: Request, res: Response): Promise<void> => {
    try {
        const section = req.params.section;
        const subPath = req.params.path;

        // Nos aseguramos de que subPath sea un string antes de usar replace
        const cleanSubPath = Array.isArray(subPath) ? subPath[0] : subPath;

        // Reconstruye la ruta exacta: "wiki/main/mi-primer-articulo.md"
        const fullDocPath = `wiki/${section}/${cleanSubPath.replace(/^[\/\\]+/, '')}`;

        const document = await wikiService.getDocument(fullDocPath);

        if (!document) {
            res.status(404).json({ ok: false, error: 'Documento no encontrado' });
            return;
        }

        res.status(200).json({
            ok: true,
            ...document
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Error desconocido';
        console.error(`🛑 [WikiRouter Doc Error]: ${message}`);
        res.status(500).json({ ok: false, error: 'Error interno al obtener el documento.' });
    }
});

// POST /save/:section
router.post('/save/:section', validateSection, async (req: Request, res: Response): Promise<void> => {
    try {
        const section = req.params.section as WikiSection;
        const { fileName, title, content } = req.body;

        if (!fileName) {
            res.status(400).json({
                ok: false,
                error: 'Se requiere el campo "fileName" en el cuerpo de la petición.'
            });
            return;
        }

        const fullPath = `wiki/${section}/${fileName.replace(/^[\/\\]+/, '')}`;

        // Si no mandan título, lo autogeneramos limpiando el nombre del archivo
        const resolvedTitle = title || fileName.replace(/\.[^/.]+$/, "").replace(/[\/\\]/g, ' ');

        let fileContent = content;

        if (!fileContent || fileContent.endsWith('.md')) {
            const fs = require('fs');
            const path = require('path');
            const absolutePath = path.resolve(process.cwd(), fullPath);

            if (fs.existsSync(absolutePath)) {
                fileContent = fs.readFileSync(absolutePath, 'utf-8');
            } else {
                fileContent = `# ${resolvedTitle}\n\nDocumento inicial generado automáticamente.`;
            }
        }

        const document = await wikiService.saveDocument(fullPath, resolvedTitle, fileContent);

        res.status(201).json({
            ok: true,
            message: 'Documento procesado y guardado con éxito',
            data: document
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`🛑 [WikiRouter Save Error]: ${message}`);
        res.status(500).json({ ok: false, error: message });
    }
});

export = router;
