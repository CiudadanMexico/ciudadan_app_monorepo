export interface DocumentEntity {
  document_id: string;
  wiki_id?: string;
  node_id?: string;
  path: string;
  title: string;
  content_hash: string;
  origin_node?: string;
  authority_node?: string;
  created_at?: string;
  updated_at?: string;
}


