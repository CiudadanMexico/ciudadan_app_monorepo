import { TreeNodeDTO } from "./TreeNodeDTO";

export interface ParsedWikiLink {
    raw: string;
    targetPath: string;
    anchor?: string;
    alias?: string;
    displayText: string;
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