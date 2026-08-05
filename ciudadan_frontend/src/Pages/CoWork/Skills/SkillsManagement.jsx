// src/pages/CoWork/Skills/SkillsManagement.jsx

import React, { useState, useEffect } from 'react';
import { useRoles } from '../../../Contexts/RolesContext';
import { useSkills } from '../../../hooks/useSkills/useSkills';
import { Button, Table, Modal, Form, Input, Space, Alert, message } from 'antd';
import { PlusCircleOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';

const SkillsManagement = () => {
  const { isAdmin, isEditor, isRoot } = useRoles();
  const { skills, fetchSkills, createSkill, updateSkill, deleteSkill, loading } = useSkills();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSkill, setEditingSkill] = useState(null);
  const [form] = Form.useForm();

  useEffect(() => {
    if (isAdmin() || isEditor() || isRoot()) {
      fetchSkills();
    }
  }, [isAdmin, isEditor, isRoot, fetchSkills]);

  const handleCreate = () => {
    setEditingSkill(null);
    form.resetFields();
    setModalOpen(true);
  };

  const handleEdit = (skill) => {
    setEditingSkill(skill);
    form.setFieldsValue({
      name: skill.attributes.name,
      description: skill.attributes.description || ''
    });
    setModalOpen(true);
  };

  const handleDelete = async (skillId) => {
    if (!window.confirm('¿Estás seguro de eliminar esta habilidad? Esta acción no se puede deshacer.')) return;
    
    try {
      await deleteSkill(skillId);
      message.success('Habilidad eliminada correctamente');
    } catch (error) {
      message.error('Error al eliminar la habilidad');
    }
  };

  const handleFormSubmit = async (values) => {
    try {
      if (editingSkill) {
        await updateSkill(editingSkill.id, values);
        message.success('Habilidad actualizada correctamente');
      } else {
        await createSkill(values);
        message.success('Habilidad creada correctamente');
      }
      
      setModalOpen(false);
      form.resetFields();
    } catch (error) {
      message.error('Error al guardar la habilidad');
    }
  };

  const columns = [
    {
      title: 'Nombre',
      dataIndex: ['attributes', 'name'],
      key: 'name',
    },
    {
      title: 'Descripción',
      dataIndex: ['attributes', 'description'],
      key: 'description',
      render: (text) => text || <em>Sin descripción</em>,
    },
    {
      title: 'Acciones',
      key: 'actions',
      render: (_, skill) => (
        <Space>
          <Button 
            type="link" 
            icon={<EditOutlined />} 
            onClick={() => handleEdit(skill)}
          >
            Editar
          </Button>
          <Button 
            type="link" 
            danger 
            icon={<DeleteOutlined />} 
            onClick={() => handleDelete(skill.id)}
          >
            Eliminar
          </Button>
        </Space>
      ),
    },
  ];

  if (!isAdmin() && !isEditor() && !isRoot()) {
    return (
      <Alert 
        message="Acceso denegado" 
        description="Solo administradores y editores pueden gestionar habilidades." 
        type="error" 
        showIcon 
      />
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      <h2>Gestión de Habilidades</h2>
      
      <div style={{ marginBottom: '16px' }}>
        <Button type="primary" icon={<PlusCircleOutlined />} onClick={handleCreate}>
          Nueva Habilidad
        </Button>
      </div>
      
      <Table 
        dataSource={skills} 
        columns={columns} 
        loading={loading} 
        rowKey="id" 
        pagination={{ pageSize: 10 }}
      />
      
      <Modal
        title={editingSkill ? 'Editar Habilidad' : 'Nueva Habilidad'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        okText="Guardar"
        cancelText="Cancelar"
      >
        <Form form={form} layout="vertical" onFinish={handleFormSubmit}>
          <Form.Item
            name="name"
            label="Nombre"
            rules={[{ required: true, message: 'Por favor ingresa el nombre de la habilidad' }]}
          >
            <Input />
          </Form.Item>
          
          <Form.Item name="description" label="Descripción">
            <Input.TextArea rows={4} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default SkillsManagement;