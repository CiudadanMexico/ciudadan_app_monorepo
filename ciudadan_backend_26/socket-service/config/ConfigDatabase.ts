import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import Database from 'better-sqlite3';

export class ConfigDatabase {
    private static instance: Database.Database;

    public static getConnection(): Database.Database {
        if(!ConfigDatabase.instance) {
            ConfigDatabase.instance = new Database('ciudadadan.db');
            ConfigDatabase.initializeSchema(ConfigDatabase.instance);
        }

        return ConfigDatabase.instance;
    }

    private static initializeSchema(db: Database.Database): void {
        try {
            const schemaPath = path.resolve(__dirname, 'schema.sql');

            if(fs.existsSync(schemaPath)) {
                const schemaSql = fs.readFileSync(schemaPath, 'utf-8');
                
                // Ejecuta DDL y PRAGMAs del archivo schema.sql
                db.exec(schemaSql);
                console.log('✅ [Database] Esquema SQLite cargado correctamente desde config/schema.sql');

                // Ejecutamos el bootstrap automático
                ConfigDatabase.initializeBootstrap(db);
            } else {
                throw new Error(`No se encontró el archivo schema.sql en la ruta: ${schemaPath}`);
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            console.error('🛑 [Database Error] Fallo al inicializar el esquema:', message);
            throw new Error(`Error en inicialización de BD: ${message}`);
        }
    }

    private static initializeBootstrap(db: Database.Database): void {
        // Declaramos la variable fuera del if/else para que tenga alcance global en la función
        let localNodeId: string;

        // Buscamos si ya existe un nodo propio
        const selfNode = db.prepare("SELECT node_id FROM nodes WHERE is_self = 1 LIMIT 1").get() as { node_id: string } | undefined;

        if (!selfNode) {
            const hostName = os.hostname();
            localNodeId = `node-${hostName}-${crypto.randomBytes(4).toString('hex')}`;
            const dummyPublicKey = crypto.randomBytes(32).toString('hex');

            db.prepare(`
                INSERT INTO nodes (node_id, name, public_key, is_self, status)
                VALUES (?, ?, ?, 1, 'active')
            `).run(localNodeId, `Server (${hostName})`, dummyPublicKey);

            console.log(`[Bootstrap] Nodo local creado automáticamente: ${localNodeId}`);
        } else {
            localNodeId = selfNode.node_id;
        }

        // Asegurar Wikis base asociadas al nodo local
        const defaultWikis = [
            { id: 'main', name: 'Wiki Principal', slug: 'main' },
            { id: 'help', name: 'Sección de Ayuda', slug: 'help' },
            { id: 'faq', name: 'Preguntas Frecuentes', slug: 'faq' }
        ];

        const insertWiki = db.prepare(`
            INSERT OR IGNORE INTO wikis (wiki_id, node_id, name, slug, scope, visibility)
            VALUES (?, ?, ?, ?, 'global', 'public')
        `);

        for (const wiki of defaultWikis) {
            insertWiki.run(wiki.id, localNodeId, wiki.name, wiki.slug);
        }
    }
}