// utils/fileHelpers.js

export const createFileHandlers = ({
  allowedExtensions = [],
  setForm,
  fieldName,
  enqueueSnackbar,
  errorMessage = '⚠️ Tipo de archivo no permitido',
}) => {
  const normalizeExt = (ext) => ext.toLowerCase().replace('.', '');

  const normalizedAllowed = allowedExtensions.map(normalizeExt);

  const getExtension = (fileName = '') =>
    fileName.split('.').pop().toLowerCase();

  const isValidFile = (file) =>
    normalizedAllowed.includes(getExtension(file.name));

  const handleFilesAdd = (e) => {
    const files = Array.from(e.target.files);

    const validFiles = files.filter(isValidFile);

    if (validFiles.length !== files.length) {
      enqueueSnackbar(errorMessage, { variant: 'warning' });
    }

    if (validFiles.length > 0) {
      setForm((prev) => ({
        ...prev,
        [fieldName]: [...(prev[fieldName] || []), ...validFiles],
      }));
    }

    e.target.value = null; // reset input
  };

  const handleRemoveFile = (index) => {
    setForm((prev) => ({
      ...prev,
      [fieldName]: prev[fieldName].filter((_, i) => i !== index),
    }));
  };

  return {
    handleFilesAdd,
    handleRemoveFile,
    getExtension,
  };
};


//Helper para subir archivos a Strapi
export const appendFiles = (formData, field, files) => {
  if (!files) return;

  if (Array.isArray(files)) {
    files.forEach((file) => {
      if (file instanceof File) {
        formData.append(`files.${field}`, file);
      }
    });
    return;
  }

  if (files instanceof File) {
    formData.append(`files.${field}`, files);
  }
};
