import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import WikiApp from './WikiApp';
import { wikiService } from '../../services/wikiService';

jest.mock('../../services/wikiService', () => ({
  wikiService: {
    getSectionTree: jest.fn(),
    getDocument: jest.fn(),
  },
}));

const { getSectionTree } = jest.requireMock('../../services/wikiService').wikiService;

const ARBOLES = {
  main: [
    { name: 'mi primer articulo', type: 'file', path: 'wiki/main/mi-primer-articulo.md' },
    { name: 'otro articulo', type: 'file', path: 'wiki/main/otro-articulo.md' },
  ],
  help: [
    { name: 'guia usuario', type: 'file', path: 'wiki/help/guia-usuario.md' },
    { name: 'cowork', type: 'file', path: 'wiki/help/cowork.md' },
  ],
  faq: [
    { name: 'preguntas frecuentes', type: 'file', path: 'wiki/faq/preguntas-frecuentes.md' },
  ],
};

const renderApp = (section) =>
  render(
    <MemoryRouter>
      <WikiApp section={section} />
    </MemoryRouter>
  );

beforeEach(() => {
  jest.clearAllMocks();
  getSectionTree.mockImplementation(async (section) => ARBOLES[section] || []);
});

describe('WikiApp — cada sección pide su propio árbol', () => {
  it.each([['main', 'mi primer articulo'], ['help', 'guia usuario'], ['faq', 'preguntas frecuentes']])(
    'la prop section=%s muestra su árbol (no el de main)',
    async (section, primerDocumento) => {
      renderApp(section);

      await waitFor(() => {
        expect(getSectionTree).toHaveBeenCalledWith(section);
      });
      expect(await screen.findByText(primerDocumento)).toBeInTheDocument();
    }
  );

  it('sin prop cae a main (compatibilidad)', async () => {
    render(
      <MemoryRouter>
        <WikiApp />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(getSectionTree).toHaveBeenCalledWith('main');
    });
  });
});
