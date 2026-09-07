import fs from 'node:fs';
import path  from 'node:path';
import { WikiService } from "./WikiService";

export class WikiWatcherService {
  private pathToWatch: string;
  private wikiService : WikiService;

  constructor(wikiService: WikiService) {
    this.wikiService = wikiService;

    const defaultPath = process.platform === 'win32'
      ? path.resolve('./wikis')
      : '/var/www/apps/wikis';

    this.pathToWatch = process.env.WIKI_ROOT_PATH || defaultPath;
  }

  public start(): void {
    // Asegurar que la carpeta wiki exista para que el watcher no falle al iniciar
    if(fs.existsSync(this.pathToWatch)) {
      fs.mkdirSync(this.pathToWatch, { recursive: true });
    }

    // Indexación inicial: poblar la BD con todos los .md existentes para que el árbol
    // no quede vacío aunque no ocurran cambios en tiempo real.
    this.indexAll();

    console.log(`👁️ [WikiWatcherService] Monitoreando cambios, carpetas y subcarpetas`);
    fs.watch(this.pathToWatch, {recursive: true}, (eventType, triggerFilename) => {
      // Aseguramos que filename sea un string único
      const filename = Array.isArray(triggerFilename) ? triggerFilename[0] : triggerFilename;
      if (!filename) return;

      const normalizedFilename = filename.replace(/\\/g, '/');

      if (!normalizedFilename.endsWith('.md') || normalizedFilename.includes('~')) return;

      console.log(`📂 [Watcher] Cambio detectado (${eventType}) en: ${normalizedFilename}`);

      // Retraso para asegurar que el archivo terminó de escribirse completamente en disco
      setTimeout(async () => {
          await this.processFileChange(normalizedFilename);
      }, 1200);
    });
  }

  /**
   * Recorre de forma recursiva la carpeta raíz de la wiki e indexa todos los .md
   * que encuentre, para que el árbol quede poblado desde el arranque.
  */
  private indexAll(): void {
    let count = 0;
    const walk = (dir: string): void => {
      let entries: fs.Dirent[] = [];
      try {
        entries = fs.readdirSync(dir, { withFileTypes: true });
      } catch (e) {
        return;
      }
      for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          walk(full);
        } else if (entry.isFile() && entry.name.endsWith('.md')) {
          const relative = path.relative(this.pathToWatch, full).replace(/\\/g, '/');
          // Procesamos en segundo plano (idempotente)
          this.processFileChange(relative).catch(() => {});
          count++;
        }
      }
    };

    if (fs.existsSync(this.pathToWatch)) {
      walk(this.pathToWatch);
    }
    console.log(`🗄️ [WikiWatcherService] Indexación inicial: ${count} archivos .md en ${this.pathToWatch}`);
  }

  private async processFileChange(normalizedFilename: string): Promise<void> {
    try {
      const fullFilePath = path.join(this.pathToWatch, normalizedFilename);

      if(fs.existsSync(fullFilePath)) {
        const normalizedPath = `wiki/${normalizedFilename}`;
        const fileContent = fs.readFileSync(fullFilePath, 'utf-8');
        const title = path.basename(normalizedFilename, '.md').replace(/[-_]/g, ' ');

        // Sincronizar metadatos en SQLite y crear archivo físico si faltara
        await this.wikiService.saveDocument(normalizedPath, title, fileContent);
        console.log(`🗄️ [Watcher DB] Documento sincronizado en SQLite: ${normalizedPath}`);
      }
    } catch (err) {
      console.error(`🛑 [WikiWatcher Error Procesando Archivo]:`, err);
    }
  }
}
