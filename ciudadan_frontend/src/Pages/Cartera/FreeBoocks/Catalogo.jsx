import React, { useState, useEffect } from 'react';
import '../../../styles/global.css';

// Función para traducir los resúmenes (usando LibreTranslate)
const translateText = async (text) => {
  const response = await fetch('https://libretranslate.de/translate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      q: text,
      source: 'en',
      target: 'es',
      format: 'text',
    }),
  });
  const data = await response.json();
  return data.translatedText;
};

const Catalogo = () => {
  const [books, setBooks] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);

  // Función para consultar la API de Gutendex
  const fetchBooks = async (search = '') => {
    setLoading(true);
    try {
      const response = await fetch(`https://gutendex.com/books?search=${search}&languages=es`);
      const data = await response.json();
      console.log(data);  // Verifica los datos de la API

      if (data && data.results) {
        setBooks(data.results);
      } else {
        console.log("No se encontraron libros.");
        setBooks([]);
      }
    } catch (error) {
      console.error('Error al cargar los libros:', error);
      setBooks([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchBooks();
  }, []);

  useEffect(() => {
    searchTerm ? fetchBooks(searchTerm) : fetchBooks();
  }, [searchTerm]);

  return (
    <div className="catalogo-section">
      <h1>Catálogo de Libros</h1>
      <input
        type="text"
        placeholder="Buscar libros..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />
      {loading && <p>Cargando libros...</p>}
      <div className="book-list">
        {books.length > 0 ? (
          books.map((book) => (
            <div className="book-card" key={book.id}>
              {book.formats?.['image/jpeg'] && (
                <img src={book.formats['image/jpeg']} alt={`${book.title} cover`} width="100" />
              )}
              <div className="book-info">
                <h3>{book.title}</h3>
                <p><strong>Autor(es):</strong> {book.authors.length > 0 ? book.authors.map((a) => a.name).join(', ') : 'Desconocido'}</p>
                <p><strong>Resumen:</strong> {book.summary}</p> {/* Mostramos el resumen traducido */}
                <p><strong>Temas:</strong> {book.subjects ? book.subjects.join(', ') : 'No disponibles'}</p>
                <div className="book-links">
                  {book.formats?.['text/html'] && (
                    <a href={book.formats['text/html']} target="_blank" rel="noopener noreferrer">Leer en HTML</a>
                  )}
                  {book.formats?.['application/epub+zip'] && (
                    <a href={book.formats['application/epub+zip']} target="_blank" rel="noopener noreferrer">Descargar en EPUB</a>
                  )}
                  {book.formats?.['text/plain; charset=us-ascii'] && (
                    <a href={book.formats['text/plain; charset=us-ascii']} target="_blank" rel="noopener noreferrer">Descargar en TXT</a>
                  )}
                </div>
              </div>
            </div>
          ))
        ) : (
          <p>No se encontraron libros.</p>
        )}
      </div>
    </div>
  );
};

export default Catalogo;
