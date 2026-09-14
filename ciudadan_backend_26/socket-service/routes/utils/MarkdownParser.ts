import { marked } from 'marked';
import { ParsedMarkdownResponseDTO, ParsedWikiLink } from '../../dto/WikiDTO';

export class MarkdownParser {
    /**
     * Procesa el contenido Markdown, extrae los WikiLinks ([[Enlace]]) 
     * y genera el HTML final con los enlaces convertidos.
     */
    public static parse(
        markdownContent: string,
        filePath?: string,
        resolveTarget?: (rawTarget: string, normalized: string) => string | null
    ): ParsedMarkdownResponseDTO {
        const wikiLinks: ParsedWikiLink[] = [];

        // RegEx para capturar [[WikiLink]] o [[WikiLink|Alias]]
        const wikiRegex = /\[\[([^\]]+)\]\]/g;

        // Extraer la lista de WikiLinks referenciados
        let match: RegExpExecArray | null;
        while ((match = wikiRegex.exec(markdownContent)) !== null) {
            const rawContent = match[1].trim();
            const parsedLink = this.parseSingleWikiLink(rawContent);

            // Intentar resolver a su ruta canónica si hay resolver disponible
            const known = resolveTarget
                ? resolveTarget(parsedLink.rawTarget, parsedLink.targetPath)
                : null;
            if (known) parsedLink.resolvedPath = known;

            if (!wikiLinks.some(l => l.raw === parsedLink.raw)) {
                wikiLinks.push(parsedLink);
            }
        }

        // Encontrar la sección actual (wiki/<seccion>/...) para relativizar hrefs
        const currentSection = this.detectSection(filePath || '');
        const wikiBase = currentSection ? `/wiki/${currentSection}/` : '/wiki/';

        // Reemplazar los corchetes [[Target|Alias]] por enlaces HTML <a>
        const processedMarkdown = markdownContent.replace(wikiRegex, (_, rawContent) => {
            const link = this.parseSingleWikiLink(rawContent.trim());
            
            // Resolver a la ruta canónica (o usar el nombre del target como última opción)
            const known = resolveTarget
                ? resolveTarget(link.rawTarget, link.targetPath)
                : null;
            if (known) link.resolvedPath = known;

            // href resoluble: primero el path canónico devuelto por el backend, si no,
            // relativizamos el nombre del target contra la sección actual.
            const hrefPath = link.resolvedPath
                ? link.resolvedPath
                : link.targetPath
                    ? `${wikiBase}${link.targetPath.replace(/^\/+/, '')}`
                    : link.displayText;

            const href = link.anchor
                ? `/${hrefPath.replace(/^\/+/, '')}#${link.anchor}`
                : `/${hrefPath.replace(/^\/+/, '')}`;

            const anchorAttr = link.anchor ? ` data-anchor="${link.anchor}"` : '';
            const targetAttr = link.rawTarget ? ` data-target="${escapeAttr(link.rawTarget)}"` : '';
            const pathAttr = link.resolvedPath ? ` data-path="${escapeAttr(link.resolvedPath)}"` : '';

            return `<a class="wiki-link" href="${href}"${targetAttr}${pathAttr}${anchorAttr}>${link.displayText}</a>`;
        });

        // 3. Extraer el título usando la estrategia de prioridades
        const title = this.extractTitle(markdownContent, filePath || '');

        // 4. Convertir el Markdown procesado a HTML usando marked
        const html = marked.parse(processedMarkdown) as string;

        return {
            title,
            html,
            wikiLinks
        };
    }

    /**
     * Deduce el título del documento evaluando fuentes en orden de prioridad.
    */
    public static extractTitle(content: string, filePath: string): string {
        // Prioridad 1: Primer H1 (# Título)
        const h1Match = content.match(/^#\s+(.+)$/m);
        if (h1Match && h1Match[1].trim()) {
            return h1Match[1].trim();
        }

        // Primer WikiLink en las primeras líneas
        const headerSnippet = content.slice(0, 300);
        const wikiMatch = headerSnippet.match(/\[\[([^\]]+)\]\]/);
        if (wikiMatch) {
            const parsed = this.parseSingleWikiLink(wikiMatch[1].trim());
            return parsed.displayText;
        }

        // Combinar "Subcarpeta - Archivo" si existe subcarpeta
        if (filePath) {
            const normalizedPath = filePath.replace(/\\/g, '/');
            const segments = normalizedPath.split('/').filter(Boolean);

            if (segments.length >= 2) {
                const fileName = segments.pop()!.replace(/\.md$/i, '');
                const parentFolder = segments.pop()!;

                const genericFolders = ['wiki', 'help', 'main', 'faq'];
                if (!genericFolders.includes(parentFolder.toLowerCase())) {
                    const cleanFolder = parentFolder.charAt(0).toUpperCase() + parentFolder.slice(1);
                    const cleanFile = fileName.charAt(0).toUpperCase() + fileName.slice(1);
                    return `${cleanFolder} - ${cleanFile}`;
                }
            }

            // Nombre limpio del archivo
            const rawFileName = segments.pop()?.replace(/\.md$/i, '');
            if (rawFileName) {
                return rawFileName.charAt(0).toUpperCase() + rawFileName.slice(1);
            }
        }

        return 'Documento sin Título';
    }

    /**
     * Descompone una expresión dentro de [[ ... ]] en un objeto ParsedWikiLink
     * Soporta: [[Doc]], [[Doc|Alias]], [[Doc#Seccion]], [[Doc#Seccion|Alias]], [[Doc^blockId]]
    */
    private static parseSingleWikiLink(raw: string): ParsedWikiLink {
        let targetAndAnchor = raw;
        let alias: string | undefined;

        if(raw.includes('|')) {
            const parts = raw.split('|');
            targetAndAnchor = parts[0].trim();
            alias = parts.slice(1).join('|').trim();
        }

        let targetPath = targetAndAnchor;
        let anchor: string | undefined;

        // Separar Ancla o Bloque con '#' o '^'
        const anchorIndex = Math.max(targetAndAnchor.indexOf('#'), targetAndAnchor.indexOf('^'));
        if(anchorIndex !== -1) {
            targetPath = targetAndAnchor.substring(0, anchorIndex).trim();
            anchor = targetAndAnchor.substring(anchorIndex + 1).trim();
        }

        // Normalizar targetPath para enlaces URL seguros (espacios por guiones)
        const cleanTargetPath = targetPath.replace(/\s+/g, '-');

        const displayText = alias || (anchor ? `${targetPath} (${anchor})` : targetPath);

        return {
            raw: `[[${raw}]]`,
            rawTarget: targetPath,
            targetPath: cleanTargetPath,
            anchor,
            alias,
            displayText
        }
    }

    /**
     * Detecta la sección actual a partir de la ruta (wiki/<seccion>/...).
     * Devuelve la sección si es válida (main/help/faq) o 'main' por defecto.
    */
    private static detectSection(filePath: string): string {
        const normalized = filePath.replace(/\\/g, '/').replace(/^\/+/, '');
        const segments = normalized.split('/').filter(Boolean);
        if (segments[0]?.toLowerCase() === 'wiki' && segments[1]) {
            const section = segments[1].toLowerCase();
            if (['main', 'help', 'faq'].includes(section)) return section;
        }
        return 'main';
    }
}

/** Escapa un valor para ser usado como atributo HTML (evita inyección). */
function escapeAttr(value: string): string {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}
