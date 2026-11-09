import axios from 'axios';
import { resolveWikiApiOrigin, wikiService } from './wikiService';

jest.mock('axios');

const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('wikiService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('usa REACT_APP_WIKI_URL como host explícito de la wiki', () => {
    expect(
      resolveWikiApiOrigin({
        REACT_APP_WIKI_URL: 'https://socks.ciudadan.org/',
        REACT_APP_SOCKET_URL: 'https://back.ciudadan.org',
      })
    ).toBe('https://socks.ciudadan.org');
  });

  it('mantiene REACT_APP_SOCKET_URL como fallback compatible', () => {
    expect(
      resolveWikiApiOrigin({
        REACT_APP_SOCKET_URL: 'https://back.ciudadan.org/',
      })
    ).toBe('https://back.ciudadan.org');
  });

  it('pide el árbol de la sección y devuelve sus nodos', async () => {
    const nodes = [{ name: 'mi primer articulo', type: 'file', path: 'wiki/main/mi-primer-articulo.md' }];
    mockedAxios.get.mockResolvedValueOnce({ data: { ok: true, nodes } } as any);

    await expect(wikiService.getSectionTree('main')).resolves.toEqual(nodes);
    expect(mockedAxios.get).toHaveBeenCalledWith(expect.stringMatching(/\/wiki\/main$/));
  });

  it('pide un documento por su ruta lógica sin duplicar el prefijo wiki', async () => {
    const document = {
      path: 'wiki/help/ayuda.md',
      title: 'Ayuda',
      htmlContent: '<h1>Ayuda</h1>',
      rawContent: '# Ayuda',
      wikiLinks: [],
    };
    mockedAxios.get.mockResolvedValueOnce({ data: document } as any);

    await expect(wikiService.getDocument('wiki/help/ayuda.md')).resolves.toEqual(document);
    expect(mockedAxios.get).toHaveBeenCalledWith(expect.stringMatching(/\/wiki\/help\/ayuda\.md$/));
  });
});
