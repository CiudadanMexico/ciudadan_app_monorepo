import { TreeNodeDTO } from "./TreeNodeDTO";

export interface ParsedWikiLink {
    raw: string;
    /** Target tal como aparece (sin ancla/alias), ej. 'Mi Articulo'. */
    rawTarget: string;
    /** Target normalizado para URL (espacios por guiones). */
    targetPath: string;
    anchor?: string;
    alias?: string;
    displayText: string;
    /** Ruta canónica resuelta (ej. 'wiki/main/mi-articulo.md') cuando se pudo vincular. */
    resolvedPath?: string;
}

export interface WikiSectionResponseDTO {
    section: string;
    title: string;
    tree: TreeNodeDTO[];
}

export interface ParsedMarkdownResponseDTO {
    title: string;
    html: string;
    wikiLinks: ParsedWikiLink[];
}