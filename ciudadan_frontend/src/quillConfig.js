// src/quillConfig.js
import Quill from 'quill';
import HtmlEditButton from 'quill-html-edit-button';
// importa también el CSS de Quill si no lo haces globalmente:
import 'quill/dist/quill.snow.css';

Quill.register('modules/htmlEditButton', HtmlEditButton, true);

// Opcional: registra aquí también cualquier otro módulo o formato
export default Quill;
