// src/components/CoWork/Verification/UserVerification.jsx
//
// Validación documental del área/subárea de un usuario.
// Usa el endpoint formal Fix D: POST /areas/verificar-area
// (policy `is-verificador` en backend) — el rol verificador se valida
// server-side. No se bypassa con PUT /api/users/:id.

import React, { useState, useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { useRoles } from '../../../Contexts/RolesContext';
import { useSkills } from '../../../hooks/useSkills/useSkills';
import { Button, List, Modal, Form, Input, Select, Upload, Alert, message } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined, UploadOutlined } from '@ant-design/icons';
import { getActiveRootAreas } from '../../../utils/cowork.helpers';
import { getAreaVerificationStatus, hasVerifiedArea } from '../../../utils/cowork/areaVerification';

const STRAPI_URL = process.env.REACT_APP_STRAPI_URL || 'http://localhost:33032';

const UserVerification = ({ user }) => {
  const { getAccessTokenSilently, isAuthenticated } = useAuth0();
  const { isAdmin, isRoot, isVerificador } = useRoles();
  const { fetchSkills } = useSkills();
  const [areas, setAreas] = useState([]);
  const [verificationModal, setVerificationModal] = useState(false);
  const [selectedArea, setSelectedArea] = useState(null);
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  // Documentos pendientes a asociar a la verificación que se está emitiendo.
  // Se envían al backend en el body de POST /areas/verificar-area bajo la
  // key `documentos` (español, alineado con el controller Fix D).
  const [documents, setDocuments] = useState([]);

  // Solo verificadores (o admin) pueden verificar áreas. La policy backend
  // `is-verificador` vuelve a autorizar en el servidor, esto es solo gate UI.
  const canVerify = isAdmin() || isVerificador() || isRoot();

  const fetchToken = async () => {
    try {
      if (!isAuthenticated) return null;
      return await getAccessTokenSilently({
        authorizationParams: {
          audience: 'https://api.ciudadan.org',
          scope: 'openid profile email offline_access',
        },
      });
    } catch (err) {
      console.error('Error obteniendo token Auth0:', err);
      return null;
    }
  };

  useEffect(() => {
    if (canVerify) {
      fetchSkills();
    }
  }, [canVerify, fetchSkills]);

  useEffect(() => {
    // Obtener áreas raíz activas
    const activeAreas = getActiveRootAreas(user?.areas);
    setAreas(activeAreas);
  }, [user?.areas]);

  const handleVerifyArea = (areaId) => {
    setSelectedArea(areaId);
    setVerificationModal(true);

    // Cargar documentos actuales del área (si ya tenía) para edición.
    const current = user.area_details?.[areaId];
    if (current) {
      setDocuments(current.documentos || current.documents || []);
      form.setFieldsValue({
        status: current.status,
        observaciones: current.observaciones || current.metadata?.note || '',
      });
    } else {
      form.setFieldsValue({ status: 'pending' });
    }
  };

  const handleVerifySubmit = async (values) => {
    if (!user?.id) {
      message.error('Usuario inválido');
      return;
    }
    setLoading(true);
    try {
      const token = await fetchToken();

      // Construir array de documentos en key `documentos` (alineado Fix D BE).
      const documentos = documents.map((d) => ({
        nombre: d.name || d.nombre || '',
        url: d.url || '',
        size: d.size || 0,
        tipo: d.type || d.tipo || '',
        subido_por: d.subido_por || user.email || null,
        subido_en: d.subido_en || d.uploadedAt || new Date().toISOString(),
      }));

      // Llamada al endpoint formal Fix D (POST /areas/verificar-area).
      // La policy is-verificador valida server-side que el caller sea
      // verificador o admin. Antes esto usaba PUT /api/users/${user.id}
      // que deja escribir area_details a cualquiera autenticado.
      const res = await fetch(`${STRAPI_URL}/api/areas/verificar-area`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          userId: user.id,
          areaId: selectedArea,
          status: values.status,
          observaciones: values.observaciones || '',
          documentos,
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        let msg = errText;
        try { msg = JSON.parse(errText)?.error?.message || errText; } catch { /* keep raw */ }
        throw new Error(`Error al actualizar verificación (${res.status}): ${msg}`);
      }

      message.success('Verificación actualizada correctamente');
      setVerificationModal(false);
      form.resetFields();
      setDocuments([]);

      // Actualizar estado local sin reload.
      if (user && typeof user.onVerified === 'function') {
        user.onVerified(selectedArea, values.status);
      }
    } catch (error) {
      message.error('Error al actualizar verificación: ' + (error.message || 'desconocido'));
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDocumentUpload = async (file) => {
    setUploading(true);
    try {
      const token = await fetchToken();

      // Subir el archivo a Strapi Media Library (multipart). Igual que antes:
      // si el upload falla (acceso, permisos), usamos blob URL local temporal.
      const formData = new FormData();
      formData.append('files', file);
      formData.append('ref', 'api::area.area');
      formData.append('field', 'documentos');

      const uploadRes = await fetch(`${STRAPI_URL}/api/upload`, {
        method: 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: formData,
      });

      let fileData;
      if (uploadRes.ok) {
        const uploaded = await uploadRes.json();
        const uploadedFile = Array.isArray(uploaded) ? uploaded[0] : uploaded;
        fileData = {
          name: uploadedFile?.name || file.name,
          type: file.type,
          size: file.size,
          url: uploadedFile?.url || URL.createObjectURL(file),
          strapiId: uploadedFile?.id,
          subido_por: user?.email || null,
          subido_en: new Date().toISOString(),
        };
      } else {
        console.warn('Upload a Strapi falló, usando blob URL temporal');
        fileData = {
          name: file.name,
          type: file.type,
          size: file.size,
          url: URL.createObjectURL(file),
          subido_por: user?.email || null,
          subido_en: new Date().toISOString(),
        };
      }

      setDocuments((prev) => [...prev, fileData]);
      message.success('Archivo subido correctamente');
    } catch (err) {
      message.error('Error al subir documento');
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ padding: '16px', background: '#f9f9f9', borderRadius: '8px' }}>
      <h3>Verificación de Áreas</h3>

      {!canVerify && (
        <Alert
          message="Solo los verificadores y administradores pueden verificar áreas."
          type="info"
          showIcon
          style={{ marginBottom: '16px' }}
        />
      )}

      {areas.length === 0 && (
        <Alert
          message="No tienes áreas asignadas para verificar."
          type="info"
          showIcon
          style={{ marginBottom: '16px' }}
        />
      )}

      <List
        dataSource={areas}
        renderItem={(area) => (
          <List.Item
            actions={canVerify ? [
              <Button
                type={hasVerifiedArea(user, area.id) ? 'default' : 'primary'}
                onClick={() => handleVerifyArea(area.id)}
                icon={hasVerifiedArea(user, area.id) ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
              >
                {hasVerifiedArea(user, area.id) ? 'Verificada' : 'Verificar'}
              </Button>
            ] : []}
          >
            <List.Item.Meta
              title={area.name || area.nombre}
              description={
                (() => {
                  // Fix 3.4: distinguir pending de rejected (antes ambos
                  // mostraban "Pendiente" genérico). Ahora cada status del
                  // area_details tiene su propio label + color.
                  const st = getAreaVerificationStatus(user, area.id);
                  if (st === 'verified') {
                    return <span style={{ color: 'green' }}>✓ Verificada</span>;
                  }
                  if (st === 'rejected') {
                    const obs = user?.area_details?.[area.id]?.observaciones;
                    return (
                      <span style={{ color: '#c62828' }}>
                        ✕ Rechazada{obs ? ` — ${obs}` : ''}
                      </span>
                    );
                  }
                  // 'pending' o sin estado (área asignada sin verificación)
                  return <span style={{ color: '#ef6c00' }}>⏳ Pendiente de verificación</span>;
                })()
              }
            />
          </List.Item>
        )}
      />

      <Modal
        title="Verificar Área"
        open={verificationModal}
        onCancel={() => setVerificationModal(false)}
        onOk={() => form.submit()}
        okText="Guardar"
        cancelText="Cancelar"
        okButtonProps={{ loading }}
      >
        <Form form={form} layout="vertical" onFinish={handleVerifySubmit}>
          <Form.Item
            name="status"
            label="Estado de Verificación"
            rules={[{ required: true, message: 'Por favor selecciona un estado' }]}
          >
            <Select>
              <Select.Option value="pending">Pendiente</Select.Option>
              <Select.Option value="verified">Verificada</Select.Option>
              <Select.Option value="rejected">Rechazada</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item name="observaciones" label="Observaciones">
            <Input.TextArea rows={4} />
          </Form.Item>

          <Form.Item label="Documentos">
            <Upload
              beforeUpload={(file) => {
                const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
                if (!allowedTypes.includes(file.type)) {
                  message.error('Solo se aceptan JPG, PNG y PDF');
                  return Upload.LIST_IGNORE;
                }
                if (file.size > 5 * 1024 * 1024) {
                  message.error('El archivo no puede exceder 5MB');
                  return Upload.LIST_IGNORE;
                }
                handleDocumentUpload(file);
                return false;
              }}
              showUploadList={false}
              multiple
            >
              <Button icon={<UploadOutlined />} disabled={uploading} loading={uploading}>
                Subir documentos
              </Button>
            </Upload>

            {documents.length > 0 && (
              <div style={{ marginTop: '8px' }}>
                {documents.map((doc, index) => (
                  <div key={index} style={{ display: 'flex', alignItems: 'center', margin: '4px 0' }}>
                    <span style={{ fontSize: '12px', marginRight: '8px' }}>{doc.name}</span>
                    <Button
                      type="text"
                      size="small"
                      onClick={() => setDocuments(documents.filter((_, i) => i !== index))}
                    >
                      Eliminar
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default UserVerification;
