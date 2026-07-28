import React from 'react';
import { TextField, Button } from '@mui/material';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

const EditorHTML = ({ value, onChange, htmlMode, setHtmlMode, disabled = false }) => {
  return (
    <>
      <Button
        onClick={() => setHtmlMode((prev) => !prev)}
        variant="outlined"
        size="small"
        sx={{ mb: 1 }}
        disabled={disabled}
      >
        {htmlMode ? 'Editor Visual' : 'Editor HTML'}
      </Button>
      {htmlMode ? (
        <TextField
          multiline
          minRows={8}
          fullWidth
          value={value}
          onChange={(e) => onChange(e.target.value)}
          variant="outlined"
          disabled={disabled}
        />
      ) : (
        <ReactQuill
          theme="snow"
          value={value}
          onChange={onChange}
          style={{ height: '200px', marginBottom: '1rem' }}
          readOnly={disabled}
        />
      )}
    </>
  );
};

export default EditorHTML;
