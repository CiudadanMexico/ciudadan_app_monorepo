-- Configuraciones PRAGMA de rendimiento y concurrencia
PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;

-- =============================================================================
-- TABLAS DEL SISTEMA
-- =============================================================================

-- Nodos
CREATE TABLE IF NOT EXISTS nodes (
    node_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    domain TEXT,
    public_key TEXT NOT NULL,
    private_key TEXT,
    is_self INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'active',
    last_seen DATETIME,
    metadata TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Wikis
CREATE TABLE IF NOT EXISTS wikis (
    wiki_id TEXT PRIMARY KEY,
    node_id TEXT NOT NULL,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    scope TEXT NOT NULL CHECK(scope IN ('global', 'national', 'local', 'knowledge')),
    visibility TEXT NOT NULL DEFAULT 'public',
    description TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (node_id) REFERENCES nodes(node_id) ON DELETE CASCADE
);

-- Documentos
CREATE TABLE IF NOT EXISTS documents (
    document_id TEXT PRIMARY KEY,
    wiki_id TEXT NOT NULL,
    node_id TEXT NOT NULL,
    path TEXT NOT NULL,
    title TEXT NOT NULL,
    content_hash TEXT NOT NULL,
    origin_node TEXT NOT NULL,
    authority_node TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (wiki_id) REFERENCES wikis(wiki_id) ON DELETE CASCADE,
    FOREIGN KEY (node_id) REFERENCES nodes(node_id)
);

-- Historial de Versiones
CREATE TABLE IF NOT EXISTS versions (
    version_id TEXT PRIMARY KEY,
    document_id TEXT NOT NULL,
    parent_version_id TEXT,
    content_hash TEXT NOT NULL,
    origin_node TEXT NOT NULL,
    authority_node TEXT NOT NULL,
    signature TEXT,
    status TEXT NOT NULL CHECK(status IN ('official', 'pending', 'conflict', 'rejected')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (document_id) REFERENCES documents(document_id) ON DELETE CASCADE,
    FOREIGN KEY (parent_version_id) REFERENCES versions(version_id),
    FOREIGN KEY (origin_node) REFERENCES nodes(node_id),
    FOREIGN KEY (authority_node) REFERENCES nodes(node_id)
);

-- Control de Permisos
CREATE TABLE IF NOT EXISTS permissions (
    id TEXT PRIMARY KEY,
    principal_id TEXT NOT NULL,
    resource_type TEXT NOT NULL CHECK(resource_type IN ('node', 'wiki', 'folder', 'document')),
    resource_id TEXT NOT NULL,
    permission TEXT NOT NULL CHECK(permission IN ('DISCOVERY', 'READ', 'WRITE', 'CREATE', 'DELETE', 'PUBLISH', 'CURATE', 'ADMIN')),
    source TEXT,
    expires_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Grafos de Enlaces (Wikilinks)
CREATE TABLE IF NOT EXISTS links (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_document_id TEXT NOT NULL,
    target_document_path TEXT NOT NULL,
    target_document_id TEXT,
    link_type TEXT NOT NULL DEFAULT 'wikilink',
    alias TEXT,
    FOREIGN KEY (source_document_id) REFERENCES documents(document_id) ON DELETE CASCADE
);

-- Cola de Sincronización entre nodos
CREATE TABLE IF NOT EXISTS sync_queue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    document_id TEXT NOT NULL,
    version_id TEXT,
    operation TEXT NOT NULL CHECK(operation IN ('CREATE', 'UPDATE', 'DELETE', 'MOVE')),
    content_hash TEXT,
    status TEXT NOT NULL CHECK(status IN ('pending', 'syncing', 'conflict', 'denied', 'failed', 'proposal')),
    retry_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (document_id) REFERENCES documents(document_id) ON DELETE CASCADE
);

-- =============================================================================
-- ÍNDICES (Optimización de Consultas, Enlaces e Historial)
-- =============================================================================

-- Documentos
CREATE UNIQUE INDEX IF NOT EXISTS idx_documents_wiki_path ON documents(wiki_id, path);
CREATE INDEX IF NOT EXISTS idx_documents_hash ON documents(content_hash);

-- Versiones
CREATE INDEX IF NOT EXISTS idx_versions_document ON versions(document_id);

-- Enlaces (Soporte completo para Wikilinks y Backlinks)
CREATE INDEX IF NOT EXISTS idx_links_source ON links(source_document_id);
CREATE INDEX IF NOT EXISTS idx_links_target_id ON links(target_document_id);
CREATE INDEX IF NOT EXISTS idx_links_target_path ON links(target_document_path);

-- Permisos y Cola
CREATE INDEX IF NOT EXISTS idx_permissions_lookup ON permissions(principal_id, resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON sync_queue(status);

-- =============================================================================
-- TRIGGERS (Auto-actualización de fechas updated_at)
-- =============================================================================
CREATE TRIGGER IF NOT EXISTS update_wikis_updated_at
AFTER UPDATE ON wikis
BEGIN
    UPDATE wikis SET updated_at = CURRENT_TIMESTAMP WHERE wiki_id = NEW.wiki_id;
END;

CREATE TRIGGER IF NOT EXISTS update_documents_updated_at
AFTER UPDATE ON documents
BEGIN
    UPDATE documents SET updated_at = CURRENT_TIMESTAMP WHERE document_id = NEW.document_id;
END;

CREATE TRIGGER IF NOT EXISTS update_sync_queue_updated_at
AFTER UPDATE ON sync_queue
BEGIN
    UPDATE sync_queue SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;