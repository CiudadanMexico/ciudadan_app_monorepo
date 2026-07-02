import Quill from 'quill';
import htmlEditButton from 'quill-html-edit-button';

// IMPORTA highlight.js y su CSS de tema
import hljs from 'highlight.js';
import 'highlight.js/styles/github.css';  // o el tema que prefieras

// Haz que el módulo lo encuentre
window.hljs = hljs;

Quill.register('modules/htmlEditButton', htmlEditButton);

