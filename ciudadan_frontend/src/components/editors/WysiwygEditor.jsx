// file: src/components/editors/WysiwygEditor.js
import React, { forwardRef } from 'react';
import { Box, Button, TextField } from '@mui/material';
import ReactQuill from 'react-quill';
import { Controller } from 'react-hook-form';
import 'react-quill/dist/quill.snow.css';
import {
  botonEditor,
  botonEditorBorde,
  botonEditorFondoHoover,
  botonEditorBordeHoover,
} from '../../styles/ColoresBotones';

/**
 * Componente WysiwygEditor
 * Props:
 * - name: string, nombre del campo en react-hook-form
 * - control: control de useForm
 * - htmlMode: boolean, true muestra editor HTML, false visual
 * - onToggleMode: function, alterna htmlMode
 * - modules: configuración de toolbar para ReactQuill
 * - restricted: boolean, deshabilita edición si true
 */
export const WysiwygEditor = forwardRef(({
  name,
  control,
  htmlMode,
  onToggleMode,
  modules,
  restricted,
}, ref) => (
  <Controller
    name={name}
    control={control}
    defaultValue=""
    render={({ field }) => (
      <Box sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
          <Button
            onClick={onToggleMode}
            variant="outlined"
            size="small"
            sx={{
              color: botonEditor,
              borderColor: botonEditorBorde,
              '&:hover': {
                backgroundColor: botonEditorFondoHoover,
                borderColor: botonEditorBordeHoover,
                color: botonEditorBordeHoover,
              },
            }}
            disabled={restricted && !htmlMode}
          >
            {htmlMode ? 'Editor Visual' : 'Editor HTML'}
          </Button>
        </Box>
        <Box sx={{
          border: '2px solid ' + (restricted ? '#ddd' : '#6e862a'),
          borderRadius: 8,
          p: 1,
        }}>
          {htmlMode ? (
            <TextField
              multiline
              minRows={8}
              fullWidth
              variant="outlined"
              value={field.value}
              onChange={(e) => field.onChange(e.target.value)}
              disabled={restricted}
            />
          ) : (
            <ReactQuill
              ref={ref}
              theme="snow"
              modules={modules}
              value={field.value}
              onChange={(content, delta, source, editor) => field.onChange(editor.getHTML())}
              readOnly={restricted}
              style={{ height: '200px', marginBottom: '1rem' }}
            />
          )}
        </Box>
      </Box>
    )}
  />
));
