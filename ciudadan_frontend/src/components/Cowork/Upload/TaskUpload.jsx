// src/components/CoWork/Upload/TaskUpload.jsx
//
// Subida de evidencias a una `tarea` (resolución).
// Usa el endpoint formal Fix H: POST /tareas/subir-evidencia
// (policy is-admin-or-socio-or-verificador en backend).
// Antes usaba PUT /api/todos/:id (updateTodo) que pisaba el `media`
// del todo ORIGINAL del creador, no de la resolución. Bug.

import React, { useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { Button, Upload, message, Space } from 'antd';
import { UploadOutlined } from '@ant-design/icons';

const STRAPI_URL = process.env.REACT_APP_STRAPI_URL || 'http://localhost:33032';

// Igual que el backend (subir-evidencia.js:43-57). Si divergen,
// el backend rechaza con 400 "tipo no permitido".
const ALLOWED_MIMES = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'video/mp4',
  'audio/mpeg',
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB, igual que backend

// Convierte un File en base64 sin el prefijo data:.
// El endpoint Fix H espera dataBase64 "pelado".
const fileToBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      // Quitar prefijo "data:<mime>;base64," si existe.
      const base64 = typeof result === 'string' ? result.split(',')[1] : '';
      resolve(base64);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

const TaskUpload = ({ taskId, onUploadComplete }) => {
  const { getAccessTokenSilently, isAuthenticated } = useAuth0();
  const [uploading, setUploading] = useState(false);

  const fetchToken = async () => {
    try {
      if (!isAuthenticated) return null;
      return await getAccessTokenSilently({
        authorizationParams: {
          audience: 'https://api.ciudadan.org',
          scope: 'openid profile email offline_access',
        },
      });
    } catch {
      return null;
    }
  };

  const handleUpload = async (file) => {
    if (!taskId) {
      message.error('TaskUpload: taskId es requerido');
      return;
    }

    setUploading(true);
    try {
      const token = await fetchToken();

      // Convertir el File a base64.
      const dataBase64 = await fileToBase64(file);
      if (!dataBase64) {
        throw new Error('No se pudo leer el archivo');
      }

      const body = {
        tareaId: Number(taskId),
        archivos: [
          {
            nombre: file.name,
            tipo: file.type,
            dataBase64,
          },
        ],
      };

      // Llamada al endpoint formal Fix H. El backend:
      //   1. valida policy is-admin-or-socio-or-verificador
      //   2. valida visibilidad: verificador solo a tareas de áreas que verifica
      //   3. decodifica base64, guarda en public/uploads/, genera URL
      //   4. appendea a tarea.media (no pisa)
      //   5. registra entry en tarea.validaciones
      const res = await fetch(`${STRAPI_URL}/api/tareas/subir-evidencia`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errText = await res.text();
        let msg = errText;
        try {
          const errJson = JSON.parse(errText);
          msg = errJson?.error?.message || errJson?.message || errText;
        } catch { /* keep raw */ }
        throw new Error(`(${res.status}) ${msg}`);
      }

      const json = await res.json();
      const archivos = json?.data?.archivos || [];
      message.success(`Archivo subido correctamente (${archivos.length})`);
      onUploadComplete?.(archivos[0]);
    } catch (error) {
      message.error('Error al subir el archivo: ' + (error.message || 'desconocido'));
      console.error('Error uploading file:', error);
    } finally {
      setUploading(false);
    }
  };

  const props = {
    beforeUpload: (file) => {
      // Validar tipo
      if (!ALLOWED_MIMES.includes(file.type)) {
        message.error(
          'Tipo de archivo no permitido. Solo se aceptan: JPG, PNG, PDF, DOC, DOCX (máx 10MB)'
        );
        return Upload.LIST_IGNORE;
      }

      // Validar tamaño (10MB, igual que el backend)
      if (file.size > MAX_FILE_SIZE) {
        message.error('El archivo no puede exceder 10MB');
        return Upload.LIST_IGNORE;
      }

      // Subir automáticamente
      handleUpload(file);
      return false; // Evitar que Ant Design suba automáticamente
    },
    showUploadList: false,
    multiple: true,
  };

  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      <Upload {...props}>
        <Button icon={<UploadOutlined />} loading={uploading} disabled={uploading}>
          Subir archivos de avance
        </Button>
      </Upload>

      <small style={{ color: '#666' }}>
        Permite subir: JPG, PNG, PDF, DOC, DOCX (máx. 10MB cada uno)
      </small>
    </Space>
  );
};

export default TaskUpload;
