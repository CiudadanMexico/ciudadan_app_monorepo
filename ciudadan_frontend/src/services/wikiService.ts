import axios from 'axios';
import { TreeNodeDTO, DocumentResponseDTO } from '../types/wiki';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:33035/wiki';

export const wikiService = {
  // Método nuevo adaptado para pedir la sección dinámicamente
  async getSectionTree(section: 'main' | 'help' | 'faq'): Promise<TreeNodeDTO[]> {
    const response = await axios.get(`${API_BASE_URL}/${section}`);
    // Dependiendo de cómo devuelva el JSON tu backend, puede ser response.data o response.data.nodes
    return Array.isArray(response.data) ? response.data : (response.data.nodes || []);
  },

  // Mantén tus métodos existentes para no romper el resto de la app
  async getTree(): Promise<TreeNodeDTO[]> {
    const response = await axios.get(`${API_BASE_URL}/main`); // Por defecto si se llama sin sección
    return Array.isArray(response.data) ? response.data : (response.data.nodes || []);
  },

  async getDocument(docPath: string): Promise<DocumentResponseDTO> {
    const cleanPath = docPath.replace(/^wiki[\/\\]+/i, '');
    
    const response = await axios.get(`${API_BASE_URL}/${cleanPath}`);
    return response.data;
  },

  async search(query: string): Promise<any> {
    const response = await axios.get(`${API_BASE_URL}/search?q=${encodeURIComponent(query)}`);
    return response.data;
  }
};
