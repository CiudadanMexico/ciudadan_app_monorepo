import fs from 'node:fs';
import path from 'node:path';
import { WikiService } from "./WikiService";

/**
 * Observa la carpeta de la wiki y sincroniza los .md con la BD (metadatos) SIN reescribir
 * los archivos en disco (eso evitaba bucles de sincronización infinitos).
 *
 * - Al iniciar hace una indexación inicial de todos los .md existentes (idempotente).
 * - Ante cambios en tiempo real usa un "debounce" por archivo: si en una ventana corta
 *   llegan varios eventos del MISMO archivo (típico de fs.watch en Windows), solo procesa
 *   el último. Eso evita re-sincronizaciones repetidas sin motivo.
 */
export class WikiWatcherService {
  private pathToWatch: string;
  private wikiService: WikiService;
  private debounceTimers = new Map<string, NodeJS.Timeout>();

  constructor(wikiService: WikiService) {
    this.wikiService = wikiService;
    const defaultPath = process.platform === 'win32'
      ? path.resolve('./wikis')
      : '/var/www/apps/wikis';
    this.pathToWatch = process.env.WIKI_ROOT_PATH || defaultPath;
  }

  public start(): void {
    // Asegurar que la carpeta wiki exista para que el watcher no falle al iniciar
    if (fs.existsSync(this.pathToWatch)) {
      fs.mkdirSync(this.pathToWatch, { recursive: true });
    }

    // Indexación inicial: poblar la BD con todos los .md existentes para que el árbol
    // no quede vacío aunque no ocurran cambios en tiempo real.
    this.indexAll();

    console.log(`👁️ [WikiWatcherService] Monitoreando cambios, carpetas y subcarpetas en ${this.pathToWatch}`);
    fs.watch(this.pathToWatch, { recursive: true }, (eventType, triggerFilename) => {
      const filename = Array.isArray(triggerFilename) ? triggerFilename[0] : triggerFilename;
      if (!filename) return;

      const normalizedFilename = filename.replace(/\\/g, '/');
      if (!normalizedFilename.endsWith('.md') || normalizedFilename.includes('~')) return;

      // Debounce: cancelar timers previos del mismo archivo y agendar uno nuevo.
      const key = normalizedFilename;
      const existing = this.debounceTimers.get(key);
      if (existing) clearTimeout(existing);

      const timer = setTimeout(() => {
        this.debounceTimers.delete(key);
        console.log(`📂 [Watcher] Cambio detectado (${eventType}) en: ${normalizedFilename}`);
        this.processFileChange(normalizedFilename).catch((e) => {
          console.error(`🛑 [WikiWatcher Error Procesando Archivo]:`, e);
        });
      }, 800); // ventana corta: colapsa eventos repetidos del mismo archivo

      this.debounceTimers.set(key, timer);
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
          // Procesamos en segundo plano (idempotente: no escribe disco, solo BD si cambió hash)
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

      if (fs.existsSync(fullFilePath)) {
        const normalizedPath = `wiki/${normalizedFilename}`;
        const fileContent = fs.readFileSync(fullFilePath, 'utf-8');

        // Solo actualiza la BD (updateIndex usa writeToDisk=false). Es idempotente: si el
        // contenido no cambió, no reescribe → no provoca bucles de sincronización.
        const changed = await this.wikiService.updateIndex(normalizedPath, fileContent);
        if (changed) {
          console.log(`🗄️ [Watcher DB] Documento sincronizado en SQLite: ${normalizedPath}`);
        } else {
          console.log(`[Watcher DB] Sin cambios (ya indexado): ${normalizedPath}`);
        }
      }
    } catch (err) {
      console.error(`🛑 [WikiWatcher Error Procesando Archivo]:`, err);
    }
  }
}