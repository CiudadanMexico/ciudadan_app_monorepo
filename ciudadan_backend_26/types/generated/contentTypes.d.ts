import type { Schema, Attribute } from '@strapi/strapi';

export interface AdminPermission extends Schema.CollectionType {
  collectionName: 'admin_permissions';
  info: {
    name: 'Permission';
    description: '';
    singularName: 'permission';
    pluralName: 'permissions';
    displayName: 'Permission';
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    action: Attribute.String &
      Attribute.Required &
      Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    actionParameters: Attribute.JSON & Attribute.DefaultTo<{}>;
    subject: Attribute.String &
      Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    properties: Attribute.JSON & Attribute.DefaultTo<{}>;
    conditions: Attribute.JSON & Attribute.DefaultTo<[]>;
    role: Attribute.Relation<'admin::permission', 'manyToOne', 'admin::role'>;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'admin::permission',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    updatedBy: Attribute.Relation<
      'admin::permission',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface AdminUser extends Schema.CollectionType {
  collectionName: 'admin_users';
  info: {
    name: 'User';
    description: '';
    singularName: 'user';
    pluralName: 'users';
    displayName: 'User';
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    firstname: Attribute.String &
      Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    lastname: Attribute.String &
      Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    username: Attribute.String;
    email: Attribute.Email &
      Attribute.Required &
      Attribute.Private &
      Attribute.Unique &
      Attribute.SetMinMaxLength<{
        minLength: 6;
      }>;
    password: Attribute.Password &
      Attribute.Private &
      Attribute.SetMinMaxLength<{
        minLength: 6;
      }>;
    resetPasswordToken: Attribute.String & Attribute.Private;
    registrationToken: Attribute.String & Attribute.Private;
    isActive: Attribute.Boolean &
      Attribute.Private &
      Attribute.DefaultTo<false>;
    roles: Attribute.Relation<'admin::user', 'manyToMany', 'admin::role'> &
      Attribute.Private;
    blocked: Attribute.Boolean & Attribute.Private & Attribute.DefaultTo<false>;
    preferedLanguage: Attribute.String;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<'admin::user', 'oneToOne', 'admin::user'> &
      Attribute.Private;
    updatedBy: Attribute.Relation<'admin::user', 'oneToOne', 'admin::user'> &
      Attribute.Private;
  };
}

export interface AdminRole extends Schema.CollectionType {
  collectionName: 'admin_roles';
  info: {
    name: 'Role';
    description: '';
    singularName: 'role';
    pluralName: 'roles';
    displayName: 'Role';
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    name: Attribute.String &
      Attribute.Required &
      Attribute.Unique &
      Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    code: Attribute.String &
      Attribute.Required &
      Attribute.Unique &
      Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    description: Attribute.String;
    users: Attribute.Relation<'admin::role', 'manyToMany', 'admin::user'>;
    permissions: Attribute.Relation<
      'admin::role',
      'oneToMany',
      'admin::permission'
    >;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<'admin::role', 'oneToOne', 'admin::user'> &
      Attribute.Private;
    updatedBy: Attribute.Relation<'admin::role', 'oneToOne', 'admin::user'> &
      Attribute.Private;
  };
}

export interface AdminApiToken extends Schema.CollectionType {
  collectionName: 'strapi_api_tokens';
  info: {
    name: 'Api Token';
    singularName: 'api-token';
    pluralName: 'api-tokens';
    displayName: 'Api Token';
    description: '';
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    name: Attribute.String &
      Attribute.Required &
      Attribute.Unique &
      Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    description: Attribute.String &
      Attribute.SetMinMaxLength<{
        minLength: 1;
      }> &
      Attribute.DefaultTo<''>;
    type: Attribute.Enumeration<['read-only', 'full-access', 'custom']> &
      Attribute.Required &
      Attribute.DefaultTo<'read-only'>;
    accessKey: Attribute.String &
      Attribute.Required &
      Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    lastUsedAt: Attribute.DateTime;
    permissions: Attribute.Relation<
      'admin::api-token',
      'oneToMany',
      'admin::api-token-permission'
    >;
    expiresAt: Attribute.DateTime;
    lifespan: Attribute.BigInteger;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'admin::api-token',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    updatedBy: Attribute.Relation<
      'admin::api-token',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface AdminApiTokenPermission extends Schema.CollectionType {
  collectionName: 'strapi_api_token_permissions';
  info: {
    name: 'API Token Permission';
    description: '';
    singularName: 'api-token-permission';
    pluralName: 'api-token-permissions';
    displayName: 'API Token Permission';
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    action: Attribute.String &
      Attribute.Required &
      Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    token: Attribute.Relation<
      'admin::api-token-permission',
      'manyToOne',
      'admin::api-token'
    >;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'admin::api-token-permission',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    updatedBy: Attribute.Relation<
      'admin::api-token-permission',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface AdminTransferToken extends Schema.CollectionType {
  collectionName: 'strapi_transfer_tokens';
  info: {
    name: 'Transfer Token';
    singularName: 'transfer-token';
    pluralName: 'transfer-tokens';
    displayName: 'Transfer Token';
    description: '';
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    name: Attribute.String &
      Attribute.Required &
      Attribute.Unique &
      Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    description: Attribute.String &
      Attribute.SetMinMaxLength<{
        minLength: 1;
      }> &
      Attribute.DefaultTo<''>;
    accessKey: Attribute.String &
      Attribute.Required &
      Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    lastUsedAt: Attribute.DateTime;
    permissions: Attribute.Relation<
      'admin::transfer-token',
      'oneToMany',
      'admin::transfer-token-permission'
    >;
    expiresAt: Attribute.DateTime;
    lifespan: Attribute.BigInteger;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'admin::transfer-token',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    updatedBy: Attribute.Relation<
      'admin::transfer-token',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface AdminTransferTokenPermission extends Schema.CollectionType {
  collectionName: 'strapi_transfer_token_permissions';
  info: {
    name: 'Transfer Token Permission';
    description: '';
    singularName: 'transfer-token-permission';
    pluralName: 'transfer-token-permissions';
    displayName: 'Transfer Token Permission';
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    action: Attribute.String &
      Attribute.Required &
      Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    token: Attribute.Relation<
      'admin::transfer-token-permission',
      'manyToOne',
      'admin::transfer-token'
    >;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'admin::transfer-token-permission',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    updatedBy: Attribute.Relation<
      'admin::transfer-token-permission',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface PluginUploadFile extends Schema.CollectionType {
  collectionName: 'files';
  info: {
    singularName: 'file';
    pluralName: 'files';
    displayName: 'File';
    description: '';
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    name: Attribute.String & Attribute.Required;
    alternativeText: Attribute.String;
    caption: Attribute.String;
    width: Attribute.Integer;
    height: Attribute.Integer;
    formats: Attribute.JSON;
    hash: Attribute.String & Attribute.Required;
    ext: Attribute.String;
    mime: Attribute.String & Attribute.Required;
    size: Attribute.Decimal & Attribute.Required;
    url: Attribute.String & Attribute.Required;
    previewUrl: Attribute.String;
    provider: Attribute.String & Attribute.Required;
    provider_metadata: Attribute.JSON;
    related: Attribute.Relation<'plugin::upload.file', 'morphToMany'>;
    folder: Attribute.Relation<
      'plugin::upload.file',
      'manyToOne',
      'plugin::upload.folder'
    > &
      Attribute.Private;
    folderPath: Attribute.String &
      Attribute.Required &
      Attribute.Private &
      Attribute.SetMinMax<
        {
          min: 1;
        },
        number
      >;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'plugin::upload.file',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    updatedBy: Attribute.Relation<
      'plugin::upload.file',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface PluginUploadFolder extends Schema.CollectionType {
  collectionName: 'upload_folders';
  info: {
    singularName: 'folder';
    pluralName: 'folders';
    displayName: 'Folder';
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    name: Attribute.String &
      Attribute.Required &
      Attribute.SetMinMax<
        {
          min: 1;
        },
        number
      >;
    pathId: Attribute.Integer & Attribute.Required & Attribute.Unique;
    parent: Attribute.Relation<
      'plugin::upload.folder',
      'manyToOne',
      'plugin::upload.folder'
    >;
    children: Attribute.Relation<
      'plugin::upload.folder',
      'oneToMany',
      'plugin::upload.folder'
    >;
    files: Attribute.Relation<
      'plugin::upload.folder',
      'oneToMany',
      'plugin::upload.file'
    >;
    path: Attribute.String &
      Attribute.Required &
      Attribute.SetMinMax<
        {
          min: 1;
        },
        number
      >;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'plugin::upload.folder',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    updatedBy: Attribute.Relation<
      'plugin::upload.folder',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface PluginContentReleasesRelease extends Schema.CollectionType {
  collectionName: 'strapi_releases';
  info: {
    singularName: 'release';
    pluralName: 'releases';
    displayName: 'Release';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    name: Attribute.String & Attribute.Required;
    releasedAt: Attribute.DateTime;
    scheduledAt: Attribute.DateTime;
    timezone: Attribute.String;
    status: Attribute.Enumeration<
      ['ready', 'blocked', 'failed', 'done', 'empty']
    > &
      Attribute.Required;
    actions: Attribute.Relation<
      'plugin::content-releases.release',
      'oneToMany',
      'plugin::content-releases.release-action'
    >;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'plugin::content-releases.release',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    updatedBy: Attribute.Relation<
      'plugin::content-releases.release',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface PluginContentReleasesReleaseAction
  extends Schema.CollectionType {
  collectionName: 'strapi_release_actions';
  info: {
    singularName: 'release-action';
    pluralName: 'release-actions';
    displayName: 'Release Action';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    type: Attribute.Enumeration<['publish', 'unpublish']> & Attribute.Required;
    entry: Attribute.Relation<
      'plugin::content-releases.release-action',
      'morphToOne'
    >;
    contentType: Attribute.String & Attribute.Required;
    locale: Attribute.String;
    release: Attribute.Relation<
      'plugin::content-releases.release-action',
      'manyToOne',
      'plugin::content-releases.release'
    >;
    isEntryValid: Attribute.Boolean;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'plugin::content-releases.release-action',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    updatedBy: Attribute.Relation<
      'plugin::content-releases.release-action',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface PluginUsersPermissionsPermission
  extends Schema.CollectionType {
  collectionName: 'up_permissions';
  info: {
    name: 'permission';
    description: '';
    singularName: 'permission';
    pluralName: 'permissions';
    displayName: 'Permission';
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    action: Attribute.String & Attribute.Required;
    role: Attribute.Relation<
      'plugin::users-permissions.permission',
      'manyToOne',
      'plugin::users-permissions.role'
    >;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'plugin::users-permissions.permission',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    updatedBy: Attribute.Relation<
      'plugin::users-permissions.permission',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface PluginUsersPermissionsRole extends Schema.CollectionType {
  collectionName: 'up_roles';
  info: {
    name: 'role';
    description: '';
    singularName: 'role';
    pluralName: 'roles';
    displayName: 'Role';
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    name: Attribute.String &
      Attribute.Required &
      Attribute.SetMinMaxLength<{
        minLength: 3;
      }>;
    description: Attribute.String;
    type: Attribute.String & Attribute.Unique;
    permissions: Attribute.Relation<
      'plugin::users-permissions.role',
      'oneToMany',
      'plugin::users-permissions.permission'
    >;
    users: Attribute.Relation<
      'plugin::users-permissions.role',
      'oneToMany',
      'plugin::users-permissions.user'
    >;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'plugin::users-permissions.role',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    updatedBy: Attribute.Relation<
      'plugin::users-permissions.role',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface PluginUsersPermissionsUser extends Schema.CollectionType {
  collectionName: 'up_users';
  info: {
    name: 'user';
    description: '';
    singularName: 'user';
    pluralName: 'users';
    displayName: 'User';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    username: Attribute.String &
      Attribute.Required &
      Attribute.Unique &
      Attribute.SetMinMaxLength<{
        minLength: 3;
      }>;
    email: Attribute.Email &
      Attribute.Required &
      Attribute.SetMinMaxLength<{
        minLength: 6;
      }>;
    provider: Attribute.String;
    password: Attribute.Password &
      Attribute.Private &
      Attribute.SetMinMaxLength<{
        minLength: 6;
      }>;
    resetPasswordToken: Attribute.String & Attribute.Private;
    confirmationToken: Attribute.String & Attribute.Private;
    confirmed: Attribute.Boolean & Attribute.DefaultTo<false>;
    blocked: Attribute.Boolean & Attribute.DefaultTo<false>;
    role: Attribute.Relation<
      'plugin::users-permissions.user',
      'manyToOne',
      'plugin::users-permissions.role'
    >;
    roles: Attribute.JSON;
    prueba: Attribute.Text;
    id_stripe: Attribute.String;
    fecha_registro: Attribute.DateTime;
    membresia_vigente: Attribute.Boolean;
    tipo_membresia: Attribute.Enumeration<
      ['mensual', 'semestral', 'anual', 'preferente']
    >;
    fecha_nacimiento: Attribute.DateTime;
    fecha_membresia: Attribute.DateTime;
    telefono: Attribute.String;
    cp: Attribute.String;
    ine_frente: Attribute.Media<'images' | 'files' | 'videos' | 'audios', true>;
    ine_tras: Attribute.Media<'images' | 'files' | 'videos' | 'audios'>;
    foto_credencial: Attribute.Media<'images' | 'files' | 'videos' | 'audios'>;
    nombre_completo: Attribute.String;
    fecha_fin_membresia_actual: Attribute.Date;
    stripeCustomerId: Attribute.String;
    stripeSubscriptionId: Attribute.String;
    stripePriceId: Attribute.String;
    subscriptionStatus: Attribute.Enumeration<
      ['active', 'canceled', 'incomplete']
    >;
    direcciones: Attribute.Relation<
      'plugin::users-permissions.user',
      'oneToMany',
      'api::direccion.direccion'
    >;
    demandaamparo: Attribute.Media<'images' | 'files' | 'videos' | 'audios'>;
    escritolibrecofepris: Attribute.Media<
      'images' | 'files' | 'videos' | 'audios'
    >;
    files: Attribute.Media<'images' | 'files' | 'videos' | 'audios', true>;
    esperandocofepris: Attribute.Boolean;
    observaciones: Attribute.Text;
    settings: Attribute.JSON;
    profile: Attribute.JSON;
    profilepic: Attribute.Media<'images' | 'files' | 'videos' | 'audios'>;
    esperandoamparo: Attribute.Boolean;
    tipoamparo: Attribute.Enumeration<
      [
        'autoamparo',
        'membresiaconsumo',
        'membresiaclubcultivo',
        'jardinero',
        'cliente',
        'otro'
      ]
    >;
    amparostatus: Attribute.String;
    isclub: Attribute.Boolean;
    haveclub: Attribute.Boolean;
    ciudad: Attribute.String;
    openpayid: Attribute.String;
    openpaykey: Attribute.String;
    rfc: Attribute.String;
    curp: Attribute.String;
    foliocofepris: Attribute.String;
    club: Attribute.Relation<
      'plugin::users-permissions.user',
      'oneToOne',
      'api::club.club'
    >;
    clubid: Attribute.String;
    isJardinero: Attribute.Boolean;
    membresiatipo: Attribute.Enumeration<
      ['consumo', 'cultivo', 'jardinero', 'socio']
    >;
    proximacosecha: Attribute.Date;
    curado: Attribute.Decimal;
    secado: Attribute.Integer;
    registrolegal: Attribute.Text;
    promocode: Attribute.String;
    cursos: Attribute.Relation<
      'plugin::users-permissions.user',
      'oneToMany',
      'api::curso.curso'
    >;
    registrado: Attribute.Boolean;
    verificado: Attribute.Boolean;
    status_legal: Attribute.String;
    bitacora: Attribute.Relation<
      'plugin::users-permissions.user',
      'manyToOne',
      'api::bitacora.bitacora'
    >;
    fechaingresoplantas: Attribute.DateTime;
    plantas: Attribute.Integer;
    areas: Attribute.Relation<
      'plugin::users-permissions.user',
      'manyToMany',
      'api::area.area'
    >;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'plugin::users-permissions.user',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    updatedBy: Attribute.Relation<
      'plugin::users-permissions.user',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface PluginI18NLocale extends Schema.CollectionType {
  collectionName: 'i18n_locale';
  info: {
    singularName: 'locale';
    pluralName: 'locales';
    collectionName: 'locales';
    displayName: 'Locale';
    description: '';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    name: Attribute.String &
      Attribute.SetMinMax<
        {
          min: 1;
          max: 50;
        },
        number
      >;
    code: Attribute.String & Attribute.Unique;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'plugin::i18n.locale',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    updatedBy: Attribute.Relation<
      'plugin::i18n.locale',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface ApiAdAd extends Schema.CollectionType {
  collectionName: 'ads';
  info: {
    singularName: 'ad';
    pluralName: 'ads';
    displayName: 'ad';
    description: '';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    tipo: Attribute.Enumeration<
      ['texto', 'imagen', 'texto con imagen', 'audio', 'video']
    >;
    titulo: Attribute.String;
    texto: Attribute.Text;
    archivo: Attribute.Media<'images' | 'files' | 'videos' | 'audios'>;
    usuario: Attribute.Relation<
      'api::ad.ad',
      'oneToOne',
      'plugin::users-permissions.user'
    >;
    fecha_subido: Attribute.DateTime;
    fecha_publicar: Attribute.DateTime;
    fecha_publicado: Attribute.DateTime;
    activo: Attribute.Boolean;
    periodos: Attribute.Blocks;
    status: Attribute.String;
    fecha_unica: Attribute.Boolean;
    link: Attribute.String;
    metadata: Attribute.JSON;
    observaciones: Attribute.Text;
    default: Attribute.Boolean;
    hora: Attribute.Time;
    cuerpo: Attribute.RichText;
    porcentaje: Attribute.Decimal;
    area: Attribute.Relation<'api::ad.ad', 'manyToOne', 'api::area.area'>;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    publishedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<'api::ad.ad', 'oneToOne', 'admin::user'> &
      Attribute.Private;
    updatedBy: Attribute.Relation<'api::ad.ad', 'oneToOne', 'admin::user'> &
      Attribute.Private;
  };
}

export interface ApiAdViewAdView extends Schema.CollectionType {
  collectionName: 'ad_views';
  info: {
    singularName: 'ad-view';
    pluralName: 'ad-views';
    displayName: 'ad-view';
    description: '';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    ad: Attribute.Relation<'api::ad-view.ad-view', 'oneToOne', 'api::ad.ad'>;
    tipo: Attribute.String;
    timestamp: Attribute.DateTime;
    contenido: Attribute.Relation<
      'api::ad-view.ad-view',
      'oneToOne',
      'api::contenido.contenido'
    >;
    usuario: Attribute.Relation<
      'api::ad-view.ad-view',
      'oneToOne',
      'plugin::users-permissions.user'
    >;
    link: Attribute.String;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    publishedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'api::ad-view.ad-view',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    updatedBy: Attribute.Relation<
      'api::ad-view.ad-view',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface ApiAgenciaAgencia extends Schema.CollectionType {
  collectionName: 'agencias';
  info: {
    singularName: 'agencia';
    pluralName: 'agencias';
    displayName: 'agencia';
    description: '';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    idx: Attribute.UID;
    localidad: Attribute.JSON;
    nombre: Attribute.String;
    miembros: Attribute.String;
    miembros_json: Attribute.JSON;
    members: Attribute.Relation<
      'api::agencia.agencia',
      'oneToMany',
      'admin::user'
    >;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    publishedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'api::agencia.agencia',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    updatedBy: Attribute.Relation<
      'api::agencia.agencia',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface ApiAgendaAgenda extends Schema.CollectionType {
  collectionName: 'agendas';
  info: {
    singularName: 'agenda';
    pluralName: 'agendas';
    displayName: 'Agenda';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    titulo: Attribute.String;
    slug: Attribute.String;
    usuario: Attribute.Relation<
      'api::agenda.agenda',
      'oneToOne',
      'plugin::users-permissions.user'
    >;
    colaboradores: Attribute.JSON;
    portada: Attribute.Media<'images' | 'files' | 'videos' | 'audios'>;
    ciudad: Attribute.String;
    estado: Attribute.Enumeration<
      [
        'pendiente',
        'en_revision',
        'resubir_archivos',
        'completada',
        'cancelada',
        'expirada'
      ]
    > &
      Attribute.DefaultTo<'pendiente'>;
    fecha_inicio: Attribute.DateTime;
    status: Attribute.String;
    descripcion: Attribute.Text;
    url: Attribute.String;
    metadata: Attribute.JSON;
    observaciones: Attribute.Text;
    checked: Attribute.Boolean;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    publishedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'api::agenda.agenda',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    updatedBy: Attribute.Relation<
      'api::agenda.agenda',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface ApiAreaArea extends Schema.CollectionType {
  collectionName: 'areas';
  info: {
    singularName: 'area';
    pluralName: 'areas';
    displayName: 'Area';
    description: '';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    nombre: Attribute.String;
    nivel: Attribute.Integer & Attribute.Required & Attribute.DefaultTo<0>;
    creador: Attribute.Relation<'api::area.area', 'oneToOne', 'admin::user'>;
    timestamp: Attribute.DateTime;
    todos: Attribute.Relation<'api::area.area', 'manyToMany', 'api::todo.todo'>;
    is_active: Attribute.Boolean & Attribute.DefaultTo<true>;
    ads: Attribute.Relation<'api::area.area', 'oneToMany', 'api::ad.ad'>;
    parent_area: Attribute.Relation<
      'api::area.area',
      'manyToOne',
      'api::area.area'
    >;
    subareas: Attribute.Relation<
      'api::area.area',
      'oneToMany',
      'api::area.area'
    >;
    usuarios: Attribute.Relation<
      'api::area.area',
      'manyToMany',
      'plugin::users-permissions.user'
    >;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    publishedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<'api::area.area', 'oneToOne', 'admin::user'> &
      Attribute.Private;
    updatedBy: Attribute.Relation<'api::area.area', 'oneToOne', 'admin::user'> &
      Attribute.Private;
  };
}

export interface ApiBitacoraBitacora extends Schema.CollectionType {
  collectionName: 'bitacoras';
  info: {
    singularName: 'bitacora';
    pluralName: 'bitacoras';
    displayName: 'bitacora';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    titulo: Attribute.String;
    slug: Attribute.String;
    usuario: Attribute.Relation<
      'api::bitacora.bitacora',
      'oneToOne',
      'plugin::users-permissions.user'
    >;
    colaboradores: Attribute.Relation<
      'api::bitacora.bitacora',
      'oneToMany',
      'plugin::users-permissions.user'
    >;
    portada: Attribute.Media<'images' | 'files' | 'videos' | 'audios'>;
    imagenes: Attribute.Media<'images' | 'files' | 'videos' | 'audios', true>;
    videos: Attribute.Media<'images' | 'files' | 'videos' | 'audios', true>;
    archivos: Attribute.Media<'images' | 'files' | 'videos' | 'audios', true>;
    fecha_inicio: Attribute.DateTime;
    status: Attribute.String;
    rol: Attribute.String;
    club: Attribute.Relation<
      'api::bitacora.bitacora',
      'oneToOne',
      'api::club.club'
    >;
    descripcion: Attribute.Text;
    url: Attribute.String;
    plantas: Attribute.Relation<
      'api::bitacora.bitacora',
      'oneToMany',
      'api::planta.planta'
    >;
    observaciones: Attribute.Text;
    metadata: Attribute.JSON;
    codigo: Attribute.String;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    publishedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'api::bitacora.bitacora',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    updatedBy: Attribute.Relation<
      'api::bitacora.bitacora',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface ApiCarritoCarrito extends Schema.CollectionType {
  collectionName: 'carritos';
  info: {
    singularName: 'carrito';
    pluralName: 'carritos';
    displayName: 'carritos';
    description: '';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    usuario: Attribute.Relation<
      'api::carrito.carrito',
      'oneToOne',
      'plugin::users-permissions.user'
    >;
    productos: Attribute.Component<'carritos.producto-en-carrito', true>;
    total: Attribute.Decimal;
    estado: Attribute.Enumeration<['activo', 'pendiente_pago', 'pagado']>;
    ultima_actualizacion: Attribute.DateTime;
    log: Attribute.JSON;
    direccion: Attribute.Relation<
      'api::carrito.carrito',
      'oneToOne',
      'api::direccion.direccion'
    >;
    total_envios: Attribute.Decimal;
    agrupacion_de_envios: Attribute.JSON;
    usuario_email: Attribute.String;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    publishedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'api::carrito.carrito',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    updatedBy: Attribute.Relation<
      'api::carrito.carrito',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface ApiCarroCarro extends Schema.CollectionType {
  collectionName: 'carros';
  info: {
    singularName: 'carro';
    pluralName: 'carros';
    displayName: 'carros';
    description: '';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    conductoremail: Attribute.Email;
    imagen: Attribute.Media<'images' | 'files' | 'videos' | 'audios'>;
    conductor: Attribute.Relation<
      'api::carro.carro',
      'oneToOne',
      'plugin::users-permissions.user'
    >;
    fecharegistro: Attribute.DateTime;
    marca: Attribute.String &
      Attribute.SetMinMaxLength<{
        minLength: 2;
        maxLength: 40;
      }>;
    nombre: Attribute.String &
      Attribute.SetMinMaxLength<{
        minLength: 2;
        maxLength: 40;
      }>;
    modelo: Attribute.Integer &
      Attribute.SetMinMax<
        {
          min: 1980;
          max: 2035;
        },
        number
      >;
    puertas: Attribute.Integer &
      Attribute.SetMinMax<
        {
          min: 2;
          max: 8;
        },
        number
      >;
    caracteristicas: Attribute.JSON;
    observaciones: Attribute.Text &
      Attribute.SetMinMaxLength<{
        maxLength: 500;
      }>;
    charla: Attribute.Enumeration<
      ['silencio', 'ligera', 'social', 'indiferente']
    > &
      Attribute.DefaultTo<'indiferente'>;
    musica: Attribute.Enumeration<
      ['sin_musica', 'musica_suave', 'pasajero_elige', 'indiferente']
    > &
      Attribute.DefaultTo<'indiferente'>;
    tipo_musica: Attribute.JSON;
    wifi: Attribute.Boolean & Attribute.DefaultTo<false>;
    agua: Attribute.Boolean & Attribute.DefaultTo<false>;
    cargador: Attribute.Boolean & Attribute.DefaultTo<false>;
    snacks: Attribute.Boolean & Attribute.DefaultTo<false>;
    portabici: Attribute.Boolean & Attribute.DefaultTo<false>;
    accesibilidad: Attribute.Boolean & Attribute.DefaultTo<false>;
    mascotas: Attribute.Boolean & Attribute.DefaultTo<false>;
    fumadores: Attribute.Boolean & Attribute.DefaultTo<false>;
    aire_acondicionado: Attribute.Boolean & Attribute.DefaultTo<false>;
    rockola: Attribute.Boolean & Attribute.DefaultTo<false>;
    ambiente_inclusivo: Attribute.Boolean & Attribute.DefaultTo<false>;
    otro_genero: Attribute.Boolean & Attribute.DefaultTo<false>;
    ultimaverificacion: Attribute.DateTime;
    verificaciones: Attribute.JSON;
    status: Attribute.Enumeration<
      ['pendiente', 'activo', 'revision', 'suspendido']
    > &
      Attribute.DefaultTo<'pendiente'>;
    agencia: Attribute.Relation<
      'api::carro.carro',
      'oneToOne',
      'api::agencia.agencia'
    >;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    publishedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'api::carro.carro',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    updatedBy: Attribute.Relation<
      'api::carro.carro',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface ApiCarsEvidenceCarsEvidence extends Schema.CollectionType {
  collectionName: 'cars_evidences';
  info: {
    singularName: 'cars-evidence';
    pluralName: 'cars-evidences';
    displayName: 'Cars Evidence';
    description: 'Evidencias multimedia de la validaci\u00F3n';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    validation: Attribute.Relation<
      'api::cars-evidence.cars-evidence',
      'manyToOne',
      'api::cars-validation.cars-validation'
    >;
    type: Attribute.Enumeration<
      [
        'selfie_live',
        'id_front',
        'id_back',
        'license_front',
        'license_back',
        'proof_of_address',
        'profile_photo',
        'vehicle_front',
        'vehicle_back',
        'vehicle_left',
        'vehicle_right',
        'registration_card',
        'insurance_document',
        'plates',
        'vin',
        'interior',
        'trunk',
        'video_360'
      ]
    >;
    file: Attribute.Media<'images' | 'videos' | 'files'> & Attribute.Required;
    review_status: Attribute.Enumeration<
      [
        'pending',
        'needs_review',
        'approved',
        'rejected',
        'resub_requested',
        'superseded'
      ]
    > &
      Attribute.DefaultTo<'pending'>;
    reviewer_note: Attribute.Text;
    reviewed_at: Attribute.DateTime;
    reviewer: Attribute.Relation<
      'api::cars-evidence.cars-evidence',
      'manyToOne',
      'plugin::users-permissions.user'
    >;
    source_driver_field: Attribute.String;
    source_file_id: Attribute.Integer;
    version: Attribute.Integer & Attribute.DefaultTo<1>;
    is_current: Attribute.Boolean & Attribute.DefaultTo<true>;
    supersedes: Attribute.Relation<
      'api::cars-evidence.cars-evidence',
      'manyToOne',
      'api::cars-evidence.cars-evidence'
    >;
    origin: Attribute.Enumeration<['preregister', 'reupload', 'live_capture']> &
      Attribute.DefaultTo<'preregister'>;
    sha256: Attribute.String;
    perceptual_hash: Attribute.String;
    nonce: Attribute.String;
    timestamp_client: Attribute.DateTime;
    timestamp_server: Attribute.DateTime;
    gps_lat: Attribute.Decimal;
    gps_lng: Attribute.Decimal;
    gps_accuracy: Attribute.Decimal;
    device_id: Attribute.String;
    app_version: Attribute.String;
    uploaded_from_gallery: Attribute.Boolean & Attribute.DefaultTo<false>;
    is_valid: Attribute.Boolean & Attribute.DefaultTo<false>;
    validation_flags: Attribute.JSON;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'api::cars-evidence.cars-evidence',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    updatedBy: Attribute.Relation<
      'api::cars-evidence.cars-evidence',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface ApiCarsValidationCarsValidation extends Schema.CollectionType {
  collectionName: 'cars_validations';
  info: {
    singularName: 'cars-validation';
    pluralName: 'cars-validations';
    displayName: 'Cars Validation';
    description: 'Historial de validaciones presenciales de conductor y veh\u00EDculo';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    driver: Attribute.Relation<
      'api::cars-validation.cars-validation',
      'manyToOne',
      'api::driver.driver'
    >;
    agency: Attribute.Relation<
      'api::cars-validation.cars-validation',
      'manyToOne',
      'api::agencia.agencia'
    >;
    agenda: Attribute.Relation<
      'api::cars-validation.cars-validation',
      'manyToOne',
      'api::agenda.agenda'
    >;
    reviewer: Attribute.Relation<
      'api::cars-validation.cars-validation',
      'manyToOne',
      'plugin::users-permissions.user'
    >;
    appointment_date: Attribute.DateTime;
    opened_at: Attribute.DateTime;
    validation_started_at: Attribute.DateTime;
    validation_finished_at: Attribute.DateTime;
    closed_at: Attribute.DateTime;
    status: Attribute.Enumeration<
      [
        'pending',
        'active',
        'completed',
        'expired',
        'cancelled',
        'under_review',
        'awaiting_resubmission'
      ]
    > &
      Attribute.DefaultTo<'pending'>;
    result: Attribute.Enumeration<
      [
        'approved',
        'approved_with_observations',
        'manual_review',
        'rejected',
        'resubmission_required'
      ]
    > &
      Attribute.DefaultTo<'manual_review'>;
    nonce: Attribute.String;
    session_token: Attribute.String;
    risk_score: Attribute.Integer & Attribute.DefaultTo<0>;
    gps_lat: Attribute.Decimal;
    gps_lng: Attribute.Decimal;
    gps_accuracy: Attribute.Decimal;
    device_id: Attribute.String;
    app_version: Attribute.String;
    checklist: Attribute.JSON;
    observations: Attribute.Text;
    metadata: Attribute.JSON;
    evidences: Attribute.Relation<
      'api::cars-validation.cars-validation',
      'oneToMany',
      'api::cars-evidence.cars-evidence'
    >;
    events: Attribute.Relation<
      'api::cars-validation.cars-validation',
      'oneToMany',
      'api::cars-validation-event.cars-validation-event'
    >;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'api::cars-validation.cars-validation',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    updatedBy: Attribute.Relation<
      'api::cars-validation.cars-validation',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface ApiCarsValidationEventCarsValidationEvent
  extends Schema.CollectionType {
  collectionName: 'cars_validation_events';
  info: {
    singularName: 'cars-validation-event';
    pluralName: 'cars-validation-events';
    displayName: 'Cars Validation Event';
    description: 'Auditor\u00EDa y trazabilidad del proceso de validaci\u00F3n';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    validation: Attribute.Relation<
      'api::cars-validation-event.cars-validation-event',
      'manyToOne',
      'api::cars-validation.cars-validation'
    >;
    evidence: Attribute.Relation<
      'api::cars-validation-event.cars-validation-event',
      'manyToOne',
      'api::cars-evidence.cars-evidence'
    >;
    actor: Attribute.Relation<
      'api::cars-validation-event.cars-validation-event',
      'manyToOne',
      'plugin::users-permissions.user'
    >;
    action: Attribute.Enumeration<
      [
        'validation_created',
        'evidence_synced',
        'evidence_approved',
        'evidence_rejected',
        'evidence_resub_requested',
        'evidence_superseded',
        'validation_started',
        'validation_completed',
        'validation_cancelled',
        'driver_status_synced',
        'observations_updated',
        'checklist_updated',
        'agenda_synced',
        'validation_status_changed',
        'resubmission_requested'
      ]
    >;
    payload: Attribute.JSON;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'api::cars-validation-event.cars-validation-event',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    updatedBy: Attribute.Relation<
      'api::cars-validation-event.cars-validation-event',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface ApiCarteraCartera extends Schema.CollectionType {
  collectionName: 'carteras';
  info: {
    singularName: 'cartera';
    pluralName: 'carteras';
    displayName: 'Cartera';
    description: '';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    laborysGanados: Attribute.Decimal;
    laborysSaldo: Attribute.Decimal;
    ciudadanTokens: Attribute.Decimal;
    ciudadanRendimientos: Attribute.Decimal;
    user_id: Attribute.Relation<
      'api::cartera.cartera',
      'oneToOne',
      'admin::user'
    >;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    publishedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'api::cartera.cartera',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    updatedBy: Attribute.Relation<
      'api::cartera.cartera',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface ApiCategoriaContenidoCategoriaContenido
  extends Schema.CollectionType {
  collectionName: 'categorias_contenidos';
  info: {
    singularName: 'categoria-contenido';
    pluralName: 'categorias-contenidos';
    displayName: 'Categorias_Contenidos';
    description: '';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    nombre: Attribute.String;
    activa: Attribute.Boolean;
    imagen: Attribute.Media<'images' | 'files' | 'videos' | 'audios'>;
    slug: Attribute.String;
    descripcion: Attribute.String;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    publishedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'api::categoria-contenido.categoria-contenido',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    updatedBy: Attribute.Relation<
      'api::categoria-contenido.categoria-contenido',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface ApiCategoriaCursoCategoriaCurso extends Schema.CollectionType {
  collectionName: 'categorias_cursos';
  info: {
    singularName: 'categoria-curso';
    pluralName: 'categorias-cursos';
    displayName: 'categorias_cursos';
    description: '';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    nombre: Attribute.String;
    nivel: Attribute.Integer;
    sup: Attribute.Integer;
    descripcion: Attribute.Text;
    imagen: Attribute.Media<'images' | 'files' | 'videos' | 'audios'>;
    slug: Attribute.String;
    activa: Attribute.Boolean;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    publishedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'api::categoria-curso.categoria-curso',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    updatedBy: Attribute.Relation<
      'api::categoria-curso.categoria-curso',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface ApiCategoriaEnlaceCategoriaEnlace
  extends Schema.CollectionType {
  collectionName: 'categorias_enlaces';
  info: {
    singularName: 'categoria-enlace';
    pluralName: 'categorias-enlaces';
    displayName: 'Categorias_Enlaces';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    titulo: Attribute.String;
    descripcion: Attribute.Text;
    nivel: Attribute.Integer;
    sup: Attribute.Integer;
    activa: Attribute.Boolean;
    imagen: Attribute.Media<'images' | 'files' | 'videos' | 'audios'>;
    slug: Attribute.UID;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    publishedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'api::categoria-enlace.categoria-enlace',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    updatedBy: Attribute.Relation<
      'api::categoria-enlace.categoria-enlace',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface ApiCategoriaEventoCategoriaEvento
  extends Schema.CollectionType {
  collectionName: 'categorias_eventos';
  info: {
    singularName: 'categoria-evento';
    pluralName: 'categorias-eventos';
    displayName: 'Categorias_Eventos';
    description: '';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    titulo: Attribute.String;
    descripcion: Attribute.Text;
    imagen: Attribute.Media<'images' | 'files' | 'videos' | 'audios'>;
    nivel: Attribute.Integer;
    sup: Attribute.Integer;
    slug: Attribute.UID;
    activa: Attribute.Boolean;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    publishedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'api::categoria-evento.categoria-evento',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    updatedBy: Attribute.Relation<
      'api::categoria-evento.categoria-evento',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface ApiCategoriaHerramientaCategoriaHerramienta
  extends Schema.CollectionType {
  collectionName: 'categorias_herramientas';
  info: {
    singularName: 'categoria-herramienta';
    pluralName: 'categorias-herramientas';
    displayName: 'Categorias_Herramientas';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    titulo: Attribute.String;
    descripcion: Attribute.Text;
    slug: Attribute.UID;
    imagen: Attribute.Media<'images' | 'files' | 'videos' | 'audios'>;
    nivel: Attribute.Integer;
    sup: Attribute.Integer;
    activa: Attribute.Boolean;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    publishedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'api::categoria-herramienta.categoria-herramienta',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    updatedBy: Attribute.Relation<
      'api::categoria-herramienta.categoria-herramienta',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface ApiCategoriaWikimapaCategoriaWikimapa
  extends Schema.CollectionType {
  collectionName: 'categorias_wikimapa';
  info: {
    singularName: 'categoria-wikimapa';
    pluralName: 'categorias-wikimapa';
    displayName: 'categoria-wikimapa';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    idx: Attribute.UID;
    nivel: Attribute.Integer;
    sup: Attribute.Integer;
    nombre: Attribute.String;
    enlace: Attribute.String;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    publishedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'api::categoria-wikimapa.categoria-wikimapa',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    updatedBy: Attribute.Relation<
      'api::categoria-wikimapa.categoria-wikimapa',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface ApiClubClub extends Schema.CollectionType {
  collectionName: 'clubs';
  info: {
    singularName: 'club';
    pluralName: 'clubs';
    displayName: 'Clubs';
    description: '';
  };
  options: {
    draftAndPublish: true;
  };
  pluginOptions: {
    i18n: {
      localized: true;
    };
  };
  attributes: {
    nombre_club: Attribute.String &
      Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
    direccion: Attribute.JSON &
      Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
    lat: Attribute.Float &
      Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
    lng: Attribute.Float &
      Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
    nombre_titular: Attribute.String &
      Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
    status_legal: Attribute.String &
      Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
    archivos_legal: Attribute.JSON &
      Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
    foto_de_perfil: Attribute.Media<'images' | 'files' | 'videos' | 'audios'> &
      Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
    fotos: Attribute.Media<'images' | 'files' | 'videos' | 'audios', true> &
      Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
    descripcion: Attribute.Text &
      Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
    servicios: Attribute.Text &
      Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
    users_permissions_user: Attribute.Relation<
      'api::club.club',
      'oneToOne',
      'plugin::users-permissions.user'
    >;
    auth_name: Attribute.String &
      Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
    horarios: Attribute.JSON &
      Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
    whatsapp: Attribute.String &
      Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
    activo: Attribute.Boolean &
      Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
    tipo: Attribute.Enumeration<['cultivo', 'consumo', 'ambos']> &
      Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
    estatutos: Attribute.Media<'images' | 'files' | 'videos' | 'audios'> &
      Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
    acta: Attribute.Media<'images' | 'files' | 'videos' | 'audios'> &
      Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
    num_integrantes: Attribute.Integer &
      Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
    documentos: Attribute.Media<
      'images' | 'files' | 'videos' | 'audios',
      true
    > &
      Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
    productos: Attribute.Text &
      Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
    observaciones: Attribute.Text &
      Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
    fecha_alta: Attribute.DateTime &
      Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
    fecha_activado: Attribute.DateTime &
      Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
    en_revision: Attribute.Boolean &
      Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
    reservacion: Attribute.Boolean &
      Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
    lugares: Attribute.Integer &
      Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
    miembrosactivos: Attribute.Integer &
      Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
    documentales: Attribute.Media<
      'images' | 'files' | 'videos' | 'audios',
      true
    > &
      Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
    direccion_legal: Attribute.String &
      Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
    telefono_legal: Attribute.String &
      Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
    skills: Attribute.Text &
      Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
    certificados: Attribute.Media<
      'images' | 'files' | 'videos' | 'audios',
      true
    > &
      Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
    datos_legales: Attribute.JSON &
      Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
    slug: Attribute.String &
      Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    publishedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<'api::club.club', 'oneToOne', 'admin::user'> &
      Attribute.Private;
    updatedBy: Attribute.Relation<'api::club.club', 'oneToOne', 'admin::user'> &
      Attribute.Private;
    localizations: Attribute.Relation<
      'api::club.club',
      'oneToMany',
      'api::club.club'
    >;
    locale: Attribute.String;
  };
}

export interface ApiCodigosreferidoCodigosreferido
  extends Schema.CollectionType {
  collectionName: 'codigosreferidos';
  info: {
    singularName: 'codigosreferido';
    pluralName: 'codigosreferidos';
    displayName: 'codigosreferido';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    usuario: Attribute.Relation<
      'api::codigosreferido.codigosreferido',
      'oneToOne',
      'plugin::users-permissions.user'
    >;
    prefijo: Attribute.String;
    sufijo: Attribute.String;
    descuento: Attribute.Decimal;
    fecha_creado: Attribute.DateTime;
    metadata: Attribute.JSON;
    activo: Attribute.Boolean;
    comision: Attribute.Decimal;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    publishedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'api::codigosreferido.codigosreferido',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    updatedBy: Attribute.Relation<
      'api::codigosreferido.codigosreferido',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface ApiCofepristramiteCofepristramite
  extends Schema.CollectionType {
  collectionName: 'cofepristramites';
  info: {
    singularName: 'cofepristramite';
    pluralName: 'cofepristramites';
    displayName: 'cofepristramite';
    description: '';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    usuario: Attribute.Relation<
      'api::cofepristramite.cofepristramite',
      'oneToOne',
      'plugin::users-permissions.user'
    >;
    usuario_email: Attribute.String;
    tipo: Attribute.Enumeration<
      ['membresia', 'jardinero', 'club', 'usuario', 'gestion']
    >;
    club: Attribute.Relation<
      'api::cofepristramite.cofepristramite',
      'oneToOne',
      'api::club.club'
    >;
    observaciones: Attribute.Text;
    status: Attribute.String;
    rfc: Attribute.String;
    curp: Attribute.String;
    nombre_completo: Attribute.String;
    email: Attribute.Email;
    telefono: Attribute.String;
    whatsapp: Attribute.String;
    ine_frente: Attribute.Media<'images' | 'files' | 'videos' | 'audios'>;
    ine_tras: Attribute.Media<'images' | 'files' | 'videos' | 'audios'>;
    acuse: Attribute.Media<'images' | 'files' | 'videos' | 'audios'>;
    acuse_sellado: Attribute.Media<'images' | 'files' | 'videos' | 'audios'>;
    resolucion: Attribute.Media<'images' | 'files' | 'videos' | 'audios'>;
    fecha_solicitud_cita: Attribute.DateTime;
    fecha_cita: Attribute.DateTime;
    fecha_resolucion: Attribute.DateTime;
    concedido: Attribute.Boolean;
    negado: Attribute.Boolean;
    concluido: Attribute.Boolean;
    registro_acciones: Attribute.JSON;
    otros_documentos: Attribute.Media<
      'images' | 'files' | 'videos' | 'audios',
      true
    >;
    escrito_libre_generado: Attribute.Media<
      'images' | 'files' | 'videos' | 'audios'
    >;
    escrito_libre_firmado: Attribute.Media<
      'images' | 'files' | 'videos' | 'audios'
    >;
    club_slug: Attribute.String;
    fecha_inicial: Attribute.DateTime;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    publishedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'api::cofepristramite.cofepristramite',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    updatedBy: Attribute.Relation<
      'api::cofepristramite.cofepristramite',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface ApiComentarioPublicacionComentarioPublicacion
  extends Schema.CollectionType {
  collectionName: 'comentarios_publicaciones';
  info: {
    singularName: 'comentario-publicacion';
    pluralName: 'comentarios-publicaciones';
    displayName: 'Comentarios_Publicaciones';
    description: '';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    comentario: Attribute.Text;
    autor: Attribute.Relation<
      'api::comentario-publicacion.comentario-publicacion',
      'oneToOne',
      'plugin::users-permissions.user'
    >;
    publicacion_id: Attribute.Relation<
      'api::comentario-publicacion.comentario-publicacion',
      'oneToOne',
      'api::publicacion.publicacion'
    >;
    timestamp: Attribute.DateTime;
    status: Attribute.Enumeration<['publicado', 'eliminado', 'bloqueado']>;
    imagen: Attribute.Media<'images' | 'files' | 'videos' | 'audios'>;
    respuesta: Attribute.Boolean;
    comentario_id: Attribute.Relation<
      'api::comentario-publicacion.comentario-publicacion',
      'oneToOne',
      'api::comentario-publicacion.comentario-publicacion'
    >;
    tipo: Attribute.Enumeration<
      ['publicacion', 'articulo', 'enlace', 'herramienta', 'evento']
    >;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    publishedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'api::comentario-publicacion.comentario-publicacion',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    updatedBy: Attribute.Relation<
      'api::comentario-publicacion.comentario-publicacion',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface ApiConfiguracionSistemaConfiguracionSistema
  extends Schema.CollectionType {
  collectionName: 'configuraciones_sistemas';
  info: {
    singularName: 'configuracion-sistema';
    pluralName: 'configuraciones-sistemas';
    displayName: 'Configuraciones_Sistema';
    description: '';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    basic_set: Attribute.JSON;
    datos_generales: Attribute.JSON;
    parametro: Attribute.String;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    publishedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'api::configuracion-sistema.configuracion-sistema',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    updatedBy: Attribute.Relation<
      'api::configuracion-sistema.configuracion-sistema',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface ApiConfiguracionUsuarioConfiguracionUsuario
  extends Schema.CollectionType {
  collectionName: 'configuraciones_usuarios';
  info: {
    singularName: 'configuracion-usuario';
    pluralName: 'configuraciones-usuarios';
    displayName: 'configuraciones_usuarios';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    usuario: Attribute.Relation<
      'api::configuracion-usuario.configuracion-usuario',
      'oneToOne',
      'plugin::users-permissions.user'
    >;
    email: Attribute.Email;
    configuraciones: Attribute.JSON;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    publishedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'api::configuracion-usuario.configuracion-usuario',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    updatedBy: Attribute.Relation<
      'api::configuracion-usuario.configuracion-usuario',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface ApiContenidoContenido extends Schema.CollectionType {
  collectionName: 'contenidos';
  info: {
    singularName: 'contenido';
    pluralName: 'contenidos';
    displayName: 'Contenidos';
    description: '';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    titulo: Attribute.String;
    slug: Attribute.UID;
    autor: Attribute.Relation<
      'api::contenido.contenido',
      'oneToOne',
      'plugin::users-permissions.user'
    >;
    contenido_libre: Attribute.JSON;
    contenido_restringido: Attribute.JSON;
    restringido: Attribute.Boolean;
    status: Attribute.Enumeration<['borrador', 'publicado', 'archivado']>;
    portada: Attribute.Media<'images' | 'files' | 'videos' | 'audios'>;
    galeria_libre: Attribute.Media<
      'images' | 'files' | 'videos' | 'audios',
      true
    >;
    galeria_restringida: Attribute.Media<
      'images' | 'files' | 'videos' | 'audios',
      true
    >;
    tags: Attribute.Text;
    fecha_publicacion: Attribute.DateTime;
    resumen: Attribute.String;
    categoria: Attribute.Relation<
      'api::contenido.contenido',
      'oneToOne',
      'api::categoria-contenido.categoria-contenido'
    >;
    autor_email: Attribute.String;
    autor_nombre: Attribute.String;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    publishedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'api::contenido.contenido',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    updatedBy: Attribute.Relation<
      'api::contenido.contenido',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface ApiCredencialCredencial extends Schema.CollectionType {
  collectionName: 'credenciales';
  info: {
    singularName: 'credencial';
    pluralName: 'credenciales';
    displayName: 'credencial';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    usuario: Attribute.Relation<
      'api::credencial.credencial',
      'oneToOne',
      'plugin::users-permissions.user'
    >;
    usuario_email: Attribute.String;
    frente: Attribute.Media<'images' | 'files' | 'videos' | 'audios'>;
    tras: Attribute.Media<'images' | 'files' | 'videos' | 'audios'>;
    status: Attribute.String;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    publishedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'api::credencial.credencial',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    updatedBy: Attribute.Relation<
      'api::credencial.credencial',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface ApiCursoCurso extends Schema.CollectionType {
  collectionName: 'cursos';
  info: {
    singularName: 'curso';
    pluralName: 'cursos';
    displayName: 'Cursos';
    description: '';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    titulo: Attribute.String;
    modalidad: Attribute.Enumeration<
      [
        'presencial',
        'en l\u00EDnea tiempo real',
        'en l\u00EDnea grabaciones',
        'h\u00EDbrido'
      ]
    >;
    certificacion: Attribute.String;
    precio: Attribute.Decimal;
    descripcion: Attribute.Text;
    calendario_actividades: Attribute.JSON;
    maestro: Attribute.Relation<
      'api::curso.curso',
      'oneToOne',
      'plugin::users-permissions.user'
    >;
    portada: Attribute.Media<'images' | 'files' | 'videos' | 'audios'>;
    calificacion: Attribute.Integer;
    calificaciones: Attribute.Integer;
    fecha_publicacion: Attribute.DateTime;
    temario: Attribute.JSON;
    archivos: Attribute.Media<'images' | 'files' | 'videos' | 'audios', true>;
    fecha_inicio: Attribute.DateTime;
    slug: Attribute.String;
    categoria: Attribute.Relation<
      'api::curso.curso',
      'oneToOne',
      'api::categoria-curso.categoria-curso'
    >;
    de_pago: Attribute.Boolean;
    enlace_reunion: Attribute.String;
    enlaces_publicos: Attribute.JSON;
    enlaces_privados: Attribute.JSON;
    ubicacion: Attribute.Relation<
      'api::curso.curso',
      'oneToOne',
      'api::direccion.direccion'
    >;
    status: Attribute.Enumeration<
      [
        'borrador',
        'publicado',
        'archivado',
        'activo',
        'ya_encurso',
        'eliminado',
        'bloqueado'
      ]
    >;
    maestro_email: Attribute.String;
    maestro_nombre: Attribute.String;
    galeria: Attribute.Media<'images' | 'files' | 'videos' | 'audios', true>;
    resumen: Attribute.String;
    tags: Attribute.String;
    restringido: Attribute.Boolean;
    user: Attribute.Relation<
      'api::curso.curso',
      'manyToOne',
      'plugin::users-permissions.user'
    >;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    publishedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'api::curso.curso',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    updatedBy: Attribute.Relation<
      'api::curso.curso',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface ApiDireccionDireccion extends Schema.CollectionType {
  collectionName: 'direcciones';
  info: {
    singularName: 'direccion';
    pluralName: 'direcciones';
    displayName: 'Direcciones';
    description: '';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    direccion: Attribute.JSON;
    coords: Attribute.JSON;
    cp: Attribute.String;
    ciudad: Attribute.String;
    estado: Attribute.String;
    store_id: Attribute.Relation<
      'api::direccion.direccion',
      'oneToOne',
      'api::store.store'
    >;
    observaciones: Attribute.String;
    event_id: Attribute.Relation<
      'api::direccion.direccion',
      'oneToOne',
      'api::evento.evento'
    >;
    activa: Attribute.Boolean;
    club: Attribute.Relation<
      'api::direccion.direccion',
      'oneToOne',
      'api::club.club'
    >;
    predeterminada: Attribute.Boolean;
    user_email: Attribute.String;
    usuario_email: Attribute.String;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'api::direccion.direccion',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    updatedBy: Attribute.Relation<
      'api::direccion.direccion',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface ApiDriverDriver extends Schema.CollectionType {
  collectionName: 'drivers';
  info: {
    singularName: 'driver';
    pluralName: 'drivers';
    displayName: 'Driver';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    user: Attribute.Relation<
      'api::driver.driver',
      'oneToOne',
      'plugin::users-permissions.user'
    >;
    email: Attribute.Email;
    phone: Attribute.String;
    firstname: Attribute.String;
    middlename: Attribute.String;
    lastname: Attribute.String;
    birthdate: Attribute.Date;
    curp: Attribute.String;
    rfc: Attribute.String;
    emergency_phone: Attribute.String;
    address: Attribute.String;
    zip_code: Attribute.String;
    state: Attribute.String;
    municipality: Attribute.String;
    profile_pic: Attribute.Media<'images' | 'files' | 'videos' | 'audios'>;
    verification_selfie: Attribute.Media<
      'images' | 'files' | 'videos' | 'audios'
    >;
    id_front: Attribute.Media<'images' | 'files' | 'videos' | 'audios'>;
    id_back: Attribute.Media<'images' | 'files' | 'videos' | 'audios'>;
    driver_license_front: Attribute.Media<
      'images' | 'files' | 'videos' | 'audios'
    >;
    driver_license_back: Attribute.Media<
      'images' | 'files' | 'videos' | 'audios'
    >;
    proof_of_address: Attribute.Media<
      'images' | 'files' | 'videos' | 'audios',
      true
    >;
    license_number: Attribute.String;
    license_type: Attribute.String;
    license_expiration_date: Attribute.Date;
    vehicle_brand: Attribute.String;
    vehicle_model: Attribute.String;
    vehicle_year: Attribute.String;
    vehicle_color: Attribute.String;
    license_plate: Attribute.String;
    vin_number: Attribute.String;
    vehicle_type: Attribute.String;
    passenger_capacity: Attribute.String;
    vehicle_front_photo: Attribute.Media<
      'images' | 'files' | 'videos' | 'audios',
      true
    >;
    vehicle_side_photo: Attribute.Media<
      'images' | 'files' | 'videos' | 'audios',
      true
    >;
    vehicle_back_photo: Attribute.Media<
      'images' | 'files' | 'videos' | 'audios',
      true
    >;
    vehicle_interior_photo: Attribute.Media<
      'images' | 'files' | 'videos' | 'audios',
      true
    >;
    vehicle_registration_card: Attribute.Media<
      'images' | 'files' | 'videos' | 'audios',
      true
    >;
    vehicle_insurance_document: Attribute.Media<
      'images' | 'files' | 'videos' | 'audios',
      true
    >;
    appointment_date: Attribute.DateTime;
    agency: Attribute.Relation<
      'api::driver.driver',
      'oneToOne',
      'api::agencia.agencia'
    >;
    reviewer: Attribute.Relation<
      'api::driver.driver',
      'oneToOne',
      'plugin::users-permissions.user'
    >;
    current_step: Attribute.String;
    profile_completed: Attribute.Boolean;
    documents_completed: Attribute.Boolean;
    appointment_scheduled: Attribute.Boolean;
    in_person_verification_completed: Attribute.Boolean;
    final_approval: Attribute.Boolean;
    status: Attribute.Enumeration<
      [
        'draft',
        'pending_documents',
        'pending_appointment',
        'pending_review',
        'documents_rejected',
        'approved',
        'rejected',
        'suspended',
        'blocked'
      ]
    >;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    publishedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'api::driver.driver',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    updatedBy: Attribute.Relation<
      'api::driver.driver',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface ApiDriverLocationDriverLocation extends Schema.CollectionType {
  collectionName: 'driver_locations';
  info: {
    singularName: 'driver-location';
    pluralName: 'driver-locations';
    displayName: 'DriverLocations';
    description: '';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    coords: Attribute.JSON;
    driver_id: Attribute.Relation<
      'api::driver-location.driver-location',
      'oneToOne',
      'plugin::users-permissions.user'
    >;
    time: Attribute.DateTime;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    publishedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'api::driver-location.driver-location',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    updatedBy: Attribute.Relation<
      'api::driver-location.driver-location',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface ApiEnlaceEnlace extends Schema.CollectionType {
  collectionName: 'enlaces';
  info: {
    singularName: 'enlace';
    pluralName: 'enlaces';
    displayName: 'Enlaces';
    description: '';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    titulo: Attribute.String;
    url: Attribute.String;
    timestamp: Attribute.DateTime;
    descripcion: Attribute.Text;
    calificacion: Attribute.Integer;
    calificaciones: Attribute.Integer;
    autor: Attribute.Relation<
      'api::enlace.enlace',
      'oneToOne',
      'plugin::users-permissions.user'
    >;
    imagen: Attribute.Media<'images' | 'files' | 'videos' | 'audios'>;
    status: Attribute.Enumeration<
      ['borrador', 'publicado', 'eliminado', 'bloqueado']
    >;
    enlace_id: Attribute.Relation<
      'api::enlace.enlace',
      'oneToOne',
      'api::enlace.enlace'
    >;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    publishedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'api::enlace.enlace',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    updatedBy: Attribute.Relation<
      'api::enlace.enlace',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface ApiEventoEvento extends Schema.CollectionType {
  collectionName: 'eventos';
  info: {
    singularName: 'evento';
    pluralName: 'eventos';
    displayName: 'Eventos';
    description: '';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    titulo: Attribute.String;
    slug: Attribute.UID;
    creador: Attribute.Relation<
      'api::evento.evento',
      'oneToOne',
      'plugin::users-permissions.user'
    >;
    colaboradores: Attribute.JSON;
    portada: Attribute.Media<'images' | 'files' | 'videos' | 'audios'>;
    imagenes: Attribute.Media<'images' | 'files' | 'videos' | 'audios', true>;
    de_pago: Attribute.Boolean;
    precio: Attribute.Decimal;
    ciudad: Attribute.String;
    estado: Attribute.String;
    multifecha: Attribute.Boolean;
    fecha_inicio: Attribute.Date;
    hora_inicio: Attribute.Time;
    fechas_horarios_adicionales: Attribute.JSON;
    fecha_fin: Attribute.Date;
    hora_fin: Attribute.Time;
    modalidad: Attribute.Enumeration<
      ['presencial', 'en l\u00EDnea', 'h\u00EDbrido']
    >;
    status: Attribute.String;
    direccion: Attribute.Relation<
      'api::evento.evento',
      'oneToOne',
      'api::direccion.direccion'
    >;
    evento_id: Attribute.Relation<
      'api::evento.evento',
      'oneToOne',
      'api::evento.evento'
    >;
    url: Attribute.String;
    descripcion: Attribute.Text;
    description: Attribute.RichText;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    publishedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'api::evento.evento',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    updatedBy: Attribute.Relation<
      'api::evento.evento',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface ApiFavoritoFavorito extends Schema.CollectionType {
  collectionName: 'favoritos';
  info: {
    singularName: 'favorito';
    pluralName: 'favoritos';
    displayName: 'favorito';
    description: '';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    usuario: Attribute.Relation<
      'api::favorito.favorito',
      'oneToOne',
      'plugin::users-permissions.user'
    >;
    usuario_email: Attribute.Email;
    tipo: Attribute.Enumeration<['producto', 'curso', 'contenido', 'club']>;
    producto: Attribute.Relation<
      'api::favorito.favorito',
      'oneToOne',
      'api::producto.producto'
    >;
    club: Attribute.Relation<
      'api::favorito.favorito',
      'oneToOne',
      'api::club.club'
    >;
    curso: Attribute.Relation<
      'api::favorito.favorito',
      'oneToOne',
      'api::curso.curso'
    >;
    contenido: Attribute.Relation<
      'api::favorito.favorito',
      'oneToOne',
      'api::contenido.contenido'
    >;
    url: Attribute.String;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    publishedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'api::favorito.favorito',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    updatedBy: Attribute.Relation<
      'api::favorito.favorito',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface ApiGenWalletGenWallet extends Schema.CollectionType {
  collectionName: 'gen_wallets';
  info: {
    singularName: 'gen-wallet';
    pluralName: 'gen-wallets';
    displayName: 'GenWallet';
    description: '';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    WalletIdx: Attribute.String;
    Coin: Attribute.String;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    publishedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'api::gen-wallet.gen-wallet',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    updatedBy: Attribute.Relation<
      'api::gen-wallet.gen-wallet',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface ApiKitjardineroKitjardinero extends Schema.CollectionType {
  collectionName: 'kitjardineros';
  info: {
    singularName: 'kitjardinero';
    pluralName: 'kitjardineros';
    displayName: 'kitjardinero';
    description: '';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    nombre: Attribute.String;
    texto: Attribute.Text;
    precio: Attribute.Decimal;
    imagen: Attribute.Media<'images' | 'files' | 'videos' | 'audios'>;
    orden: Attribute.Integer;
    activo: Attribute.Boolean;
    link: Attribute.String;
    cantidad: Attribute.Integer;
    pack: Attribute.String;
    cantidadbasico: Attribute.Integer;
    cantidadfull: Attribute.Integer;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    publishedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'api::kitjardinero.kitjardinero',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    updatedBy: Attribute.Relation<
      'api::kitjardinero.kitjardinero',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface ApiListaSuscripcionListaSuscripcion
  extends Schema.CollectionType {
  collectionName: 'listas_suscripciones';
  info: {
    singularName: 'lista-suscripcion';
    pluralName: 'listas-suscripciones';
    displayName: 'listas_suscripciones';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    suscritos: Attribute.Relation<
      'api::lista-suscripcion.lista-suscripcion',
      'oneToMany',
      'plugin::users-permissions.user'
    >;
    tipo: Attribute.Enumeration<['curso', 'evento']>;
    curso: Attribute.Relation<
      'api::lista-suscripcion.lista-suscripcion',
      'oneToOne',
      'api::curso.curso'
    >;
    evento: Attribute.Relation<
      'api::lista-suscripcion.lista-suscripcion',
      'oneToOne',
      'api::evento.evento'
    >;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    publishedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'api::lista-suscripcion.lista-suscripcion',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    updatedBy: Attribute.Relation<
      'api::lista-suscripcion.lista-suscripcion',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface ApiMembresiaMembresia extends Schema.CollectionType {
  collectionName: 'membresias';
  info: {
    singularName: 'membresia';
    pluralName: 'membresias';
    displayName: 'Membres\u00EDas';
    description: '';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    usuario: Attribute.Relation<
      'api::membresia.membresia',
      'oneToOne',
      'plugin::users-permissions.user'
    >;
    fechaInicio: Attribute.Date;
    fechaFin: Attribute.Date;
    plan: Attribute.Enumeration<['mensual', 'semestral', 'anual']>;
    monto_pagado: Attribute.Decimal;
    activa: Attribute.Boolean;
    miembroDesde: Attribute.DateTime;
    observaciones: Attribute.String;
    status: Attribute.String;
    usuarioemail: Attribute.Email;
    tipo: Attribute.Enumeration<
      ['jardinero', 'consumo', 'exterior', 'sencilla', 'doble']
    >;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    publishedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'api::membresia.membresia',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    updatedBy: Attribute.Relation<
      'api::membresia.membresia',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface ApiMembresiasTipoMembresiasTipo extends Schema.CollectionType {
  collectionName: 'membresias_tipos';
  info: {
    singularName: 'membresias-tipo';
    pluralName: 'membresias-tipos';
    displayName: 'MembresiasTipo';
    description: '';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    order: Attribute.Integer;
    json: Attribute.JSON;
    openpayid: Attribute.String;
    level: Attribute.Integer;
    subtypes: Attribute.Boolean;
    pic: Attribute.Media<'images' | 'files' | 'videos' | 'audios'>;
    tipo: Attribute.Enumeration<
      ['jardinero', 'consumo', 'exterior', 'sencilla', 'doble']
    >;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    publishedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'api::membresias-tipo.membresias-tipo',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    updatedBy: Attribute.Relation<
      'api::membresias-tipo.membresias-tipo',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface ApiMessageMessage extends Schema.CollectionType {
  collectionName: 'messages';
  info: {
    singularName: 'message';
    pluralName: 'messages';
    displayName: 'messages';
    description: '';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    text: Attribute.Text;
    sender_id: Attribute.Relation<
      'api::message.message',
      'oneToOne',
      'plugin::users-permissions.user'
    >;
    receiver_id: Attribute.Relation<
      'api::message.message',
      'oneToOne',
      'plugin::users-permissions.user'
    >;
    timestamp: Attribute.DateTime;
    status: Attribute.Enumeration<
      ['enviado', 'recibido', 'leido', 'bloqueado', 'eliminado']
    >;
    archivos: Attribute.Media<'images' | 'files' | 'videos' | 'audios'>;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    publishedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'api::message.message',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    updatedBy: Attribute.Relation<
      'api::message.message',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface ApiNotificacionNotificacion extends Schema.CollectionType {
  collectionName: 'notificaciones';
  info: {
    singularName: 'notificacion';
    pluralName: 'notificaciones';
    displayName: 'Notificaciones';
    description: '';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    cuerpo: Attribute.Blocks;
    user_email: Attribute.String;
    usuario: Attribute.Relation<
      'api::notificacion.notificacion',
      'oneToOne',
      'plugin::users-permissions.user'
    >;
    timestamp: Attribute.DateTime;
    leida: Attribute.Boolean;
    status: Attribute.Enumeration<['entregada', 'leida', 'borrada']>;
    tipo: Attribute.String;
    link: Attribute.String;
    imagen: Attribute.Media<'images' | 'files' | 'videos' | 'audios', true>;
    icono: Attribute.String;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    publishedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'api::notificacion.notificacion',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    updatedBy: Attribute.Relation<
      'api::notificacion.notificacion',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface ApiPagoPago extends Schema.CollectionType {
  collectionName: 'pagos';
  info: {
    singularName: 'pago';
    pluralName: 'pagos';
    displayName: 'Pagos';
    description: '';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    Idx: Attribute.UID;
    tipo: Attribute.Enumeration<
      [
        'market',
        'curso',
        'evento',
        'asesoria',
        'servicio',
        'membresia',
        'carrito'
      ]
    >;
    carrito_id: Attribute.Relation<
      'api::pago.pago',
      'oneToOne',
      'api::carrito.carrito'
    >;
    curso_id: Attribute.Relation<
      'api::pago.pago',
      'oneToOne',
      'api::curso.curso'
    >;
    evento_id: Attribute.Relation<
      'api::pago.pago',
      'oneToOne',
      'api::evento.evento'
    >;
    fecha_pagado: Attribute.DateTime;
    usuario: Attribute.Relation<
      'api::pago.pago',
      'oneToOne',
      'plugin::users-permissions.user'
    >;
    monto: Attribute.Decimal;
    moneda: Attribute.String;
    stripePaymentIntentId: Attribute.String;
    stripeInvoiceId: Attribute.String;
    stripeCustomerId: Attribute.String;
    stripeSubscriptionId: Attribute.String;
    status: Attribute.String;
    descripcion: Attribute.String;
    metadata: Attribute.JSON;
    disputa: Attribute.Boolean;
    metodo_pago: Attribute.Enumeration<['stripe']>;
    Observaciones: Attribute.Text;
    pago_guia: Attribute.Decimal;
    pago_vendedor: Attribute.Decimal;
    comisionStripe: Attribute.Decimal;
    comisionPlataforma: Attribute.Decimal;
    store: Attribute.Relation<'api::pago.pago', 'oneToOne', 'api::store.store'>;
    pedido: Attribute.Relation<
      'api::pago.pago',
      'oneToOne',
      'api::pedido.pedido'
    >;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    publishedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<'api::pago.pago', 'oneToOne', 'admin::user'> &
      Attribute.Private;
    updatedBy: Attribute.Relation<'api::pago.pago', 'oneToOne', 'admin::user'> &
      Attribute.Private;
  };
}

export interface ApiPedidoPedido extends Schema.CollectionType {
  collectionName: 'pedidos';
  info: {
    singularName: 'pedido';
    pluralName: 'pedidos';
    displayName: 'pedidos';
    description: '';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    item: Attribute.Component<'carritos.producto-en-carrito', true>;
    tipo: Attribute.Enumeration<['tienda', 'curso', 'evento', 'asesoria']>;
    curso_id: Attribute.Relation<
      'api::pedido.pedido',
      'oneToOne',
      'api::curso.curso'
    >;
    evento_id: Attribute.Relation<
      'api::pedido.pedido',
      'oneToOne',
      'api::evento.evento'
    >;
    timestamp_creacion: Attribute.DateTime;
    usuario: Attribute.Relation<
      'api::pedido.pedido',
      'oneToOne',
      'plugin::users-permissions.user'
    >;
    guia: Attribute.String;
    proveedor: Attribute.Enumeration<
      [
        'Estafeta',
        'FedEx',
        'DHL',
        'Redpack',
        'Paquetexpress',
        'Sendex',
        'iVoy',
        'Quiken',
        'Carssa'
      ]
    >;
    direccion_origen: Attribute.Relation<
      'api::pedido.pedido',
      'oneToOne',
      'api::direccion.direccion'
    >;
    direccion_destino: Attribute.Relation<
      'api::pedido.pedido',
      'oneToOne',
      'api::direccion.direccion'
    >;
    fecha_envio: Attribute.DateTime;
    fecha_entrega: Attribute.DateTime;
    total_volumetrico: Attribute.Decimal;
    monto_envio: Attribute.Decimal;
    monto_total: Attribute.Decimal;
    carrito_id: Attribute.Relation<
      'api::pedido.pedido',
      'oneToOne',
      'api::carrito.carrito'
    >;
    fecha_pagado: Attribute.DateTime;
    moneda: Attribute.String;
    pago_id: Attribute.Relation<
      'api::pedido.pedido',
      'oneToOne',
      'api::pago.pago'
    >;
    status: Attribute.Enumeration<
      ['enviar', 'encamino', 'cancelado', 'devuelto', 'recibido', 'impagado']
    >;
    finalizado: Attribute.Boolean;
    fecha_finalizado: Attribute.DateTime;
    metadata: Attribute.JSON;
    calificado: Attribute.Boolean;
    store: Attribute.Relation<
      'api::pedido.pedido',
      'oneToOne',
      'api::store.store'
    >;
    store_email: Attribute.String;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    publishedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'api::pedido.pedido',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    updatedBy: Attribute.Relation<
      'api::pedido.pedido',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface ApiPlantaPlanta extends Schema.CollectionType {
  collectionName: 'plantas';
  info: {
    singularName: 'planta';
    pluralName: 'plantas';
    displayName: 'planta';
    description: '';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    usuario_email: Attribute.String;
    origen: Attribute.Enumeration<['semilla', 'esqueje']>;
    galeria: Attribute.Media<'images' | 'files' | 'videos' | 'audios', true>;
    linkvideos: Attribute.String;
    qr_text: Attribute.String;
    qr: Attribute.Media<'images' | 'files' | 'videos' | 'audios', true>;
    club: Attribute.Relation<
      'api::planta.planta',
      'oneToOne',
      'api::club.club'
    >;
    color: Attribute.Enumeration<
      ['rojo', 'amarillo', 'verde', 'azul', 'rosa', 'plata']
    >;
    fecha_inicia_vida: Attribute.DateTime;
    fecha_cortada: Attribute.DateTime;
    viva: Attribute.Boolean;
    semilla: Attribute.Boolean;
    clasificacion: Attribute.JSON;
    actasemilla: Attribute.Media<'images' | 'files' | 'videos' | 'audios'>;
    codigo: Attribute.String;
    cosecha: Attribute.Relation<
      'api::planta.planta',
      'oneToOne',
      'api::registrobitacora.registrobitacora'
    >;
    bitacora: Attribute.Relation<
      'api::planta.planta',
      'manyToOne',
      'api::bitacora.bitacora'
    >;
    secado: Attribute.Boolean;
    curado: Attribute.Boolean;
    usuario: Attribute.Relation<
      'api::planta.planta',
      'oneToOne',
      'plugin::users-permissions.user'
    >;
    fechasolicitada: Attribute.DateTime;
    status: Attribute.String;
    gramos_cosechados: Attribute.Decimal;
    gramos_curandose: Attribute.Decimal;
    gramos_en_existencia: Attribute.Decimal;
    registrobitacora: Attribute.Relation<
      'api::planta.planta',
      'manyToOne',
      'api::registrobitacora.registrobitacora'
    >;
    solicitudplanta: Attribute.Relation<
      'api::planta.planta',
      'manyToOne',
      'api::solicitudplanta.solicitudplanta'
    >;
    entregada: Attribute.Boolean;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    publishedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'api::planta.planta',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    updatedBy: Attribute.Relation<
      'api::planta.planta',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface ApiPostulacionPostulacion extends Schema.CollectionType {
  collectionName: 'postulaciones';
  info: {
    singularName: 'postulacion';
    pluralName: 'postulaciones';
    displayName: 'postulacion';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    postulante: Attribute.Relation<
      'api::postulacion.postulacion',
      'oneToOne',
      'plugin::users-permissions.user'
    >;
    fecha_solicitud: Attribute.DateTime;
    posicion: Attribute.String;
    whtasapp: Attribute.String;
    email: Attribute.Email;
    descripcion: Attribute.Text;
    archivos: Attribute.Media<'images' | 'files' | 'videos' | 'audios'>;
    revision: Attribute.JSON;
    status: Attribute.String;
    revisada: Attribute.Boolean;
    links: Attribute.JSON;
    metadata: Attribute.JSON;
    citada: Attribute.Boolean;
    rechazada: Attribute.Boolean;
    cita: Attribute.Relation<
      'api::postulacion.postulacion',
      'oneToOne',
      'api::agenda.agenda'
    >;
    observaciones: Attribute.Text;
    observacionesjson: Attribute.JSON;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    publishedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'api::postulacion.postulacion',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    updatedBy: Attribute.Relation<
      'api::postulacion.postulacion',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface ApiPreguntaProductoPreguntaProducto
  extends Schema.CollectionType {
  collectionName: 'preguntas_productos';
  info: {
    singularName: 'pregunta-producto';
    pluralName: 'preguntas-productos';
    displayName: 'Preguntas';
    description: '';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    producto: Attribute.Relation<
      'api::pregunta-producto.pregunta-producto',
      'manyToOne',
      'api::producto.producto'
    >;
    pregunta: Attribute.Text;
    fechapregunta: Attribute.DateTime;
    status: Attribute.Enumeration<['publicada', 'respondida', 'eliminada']>;
    usuario: Attribute.Relation<
      'api::pregunta-producto.pregunta-producto',
      'oneToOne',
      'plugin::users-permissions.user'
    >;
    store: Attribute.Relation<
      'api::pregunta-producto.pregunta-producto',
      'manyToOne',
      'api::store.store'
    >;
    curso: Attribute.Relation<
      'api::pregunta-producto.pregunta-producto',
      'oneToOne',
      'api::curso.curso'
    >;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    publishedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'api::pregunta-producto.pregunta-producto',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    updatedBy: Attribute.Relation<
      'api::pregunta-producto.pregunta-producto',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface ApiProductoProducto extends Schema.CollectionType {
  collectionName: 'productos';
  info: {
    singularName: 'producto';
    pluralName: 'productos';
    displayName: 'productos';
    description: '';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    nombre: Attribute.String;
    descripcion: Attribute.String;
    precio: Attribute.Decimal;
    marca: Attribute.String;
    store_category: Attribute.Relation<
      'api::producto.producto',
      'oneToOne',
      'api::store-categorie.store-categorie'
    >;
    imagenes: Attribute.Media<'images' | 'files' | 'videos' | 'audios', true>;
    imagen_predeterminada: Attribute.Media<
      'images' | 'files' | 'videos' | 'audios',
      true
    >;
    activo: Attribute.Boolean;
    destacado: Attribute.Boolean;
    store_id: Attribute.String;
    store_email: Attribute.String;
    store: Attribute.Relation<
      'api::producto.producto',
      'oneToOne',
      'api::store.store'
    >;
    stripe_product_id: Attribute.String;
    tags: Attribute.Text;
    fecha_creacion: Attribute.DateTime;
    stock: Attribute.Float;
    calificacion: Attribute.Integer;
    calificaciones: Attribute.Integer;
    vendidos: Attribute.Integer;
    cp: Attribute.String;
    slug: Attribute.String;
    largo: Attribute.Decimal;
    ancho: Attribute.Decimal;
    alto: Attribute.Decimal;
    peso: Attribute.Decimal;
    volumetrico: Attribute.Decimal;
    especificaciones: Attribute.JSON;
    variaciones: Attribute.JSON;
    localidad: Attribute.String;
    estado: Attribute.String;
    preguntas_productos: Attribute.Relation<
      'api::producto.producto',
      'oneToMany',
      'api::pregunta-producto.pregunta-producto'
    >;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    publishedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'api::producto.producto',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    updatedBy: Attribute.Relation<
      'api::producto.producto',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface ApiPublicacionPublicacion extends Schema.CollectionType {
  collectionName: 'publicaciones';
  info: {
    singularName: 'publicacion';
    pluralName: 'publicaciones';
    displayName: 'Publicaciones';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    contenido: Attribute.Blocks;
    autor: Attribute.Relation<
      'api::publicacion.publicacion',
      'oneToOne',
      'plugin::users-permissions.user'
    >;
    archivos: Attribute.Media<'images' | 'files' | 'videos' | 'audios'>;
    timestamp: Attribute.DateTime;
    publicado: Attribute.Enumeration<
      ['publicado', 'borrador', 'eliminado', 'bloqueado']
    >;
    uid: Attribute.UID;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    publishedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'api::publicacion.publicacion',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    updatedBy: Attribute.Relation<
      'api::publicacion.publicacion',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface ApiRatingRating extends Schema.CollectionType {
  collectionName: 'ratings';
  info: {
    singularName: 'rating';
    pluralName: 'ratings';
    displayName: 'rating';
    description: '';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    calificacion: Attribute.Integer;
    usuario: Attribute.Relation<
      'api::rating.rating',
      'oneToOne',
      'plugin::users-permissions.user'
    >;
    club: Attribute.Relation<
      'api::rating.rating',
      'oneToOne',
      'api::club.club'
    >;
    producto: Attribute.Relation<
      'api::rating.rating',
      'oneToOne',
      'api::producto.producto'
    >;
    curso: Attribute.Relation<
      'api::rating.rating',
      'oneToOne',
      'api::curso.curso'
    >;
    timestamp: Attribute.DateTime;
    tipo: Attribute.String;
    resena: Attribute.Text;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    publishedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'api::rating.rating',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    updatedBy: Attribute.Relation<
      'api::rating.rating',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface ApiReaccionReaccion extends Schema.CollectionType {
  collectionName: 'reacciones';
  info: {
    singularName: 'reaccion';
    pluralName: 'reacciones';
    displayName: 'Reacciones';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    listado: Attribute.JSON;
    tipo: Attribute.Enumeration<
      ['publicacion', 'articulo', 'enlace', 'herramienta', 'evento']
    >;
    comentario: Attribute.Boolean;
    respuesta: Attribute.Boolean;
    evento_id: Attribute.Relation<
      'api::reaccion.reaccion',
      'oneToOne',
      'api::evento.evento'
    >;
    enlace_id: Attribute.Relation<
      'api::reaccion.reaccion',
      'oneToOne',
      'api::enlace.enlace'
    >;
    comentario_id: Attribute.Relation<
      'api::reaccion.reaccion',
      'oneToOne',
      'api::comentario-publicacion.comentario-publicacion'
    >;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    publishedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'api::reaccion.reaccion',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    updatedBy: Attribute.Relation<
      'api::reaccion.reaccion',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface ApiRegistrobitacoraRegistrobitacora
  extends Schema.CollectionType {
  collectionName: 'registrosbitacoras';
  info: {
    singularName: 'registrobitacora';
    pluralName: 'registrosbitacoras';
    displayName: 'registrobitacora';
    description: '';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    usuario_email: Attribute.String;
    club: Attribute.Relation<
      'api::registrobitacora.registrobitacora',
      'oneToOne',
      'api::club.club'
    >;
    timestamp: Attribute.DateTime;
    texto: Attribute.Text;
    media: Attribute.Media<'images' | 'files' | 'videos' | 'audios', true>;
    documentos: Attribute.Media<'images' | 'files' | 'videos' | 'audios', true>;
    observaciones: Attribute.Text;
    status: Attribute.String;
    tipo: Attribute.String;
    codigoplanta: Attribute.String;
    registrojardinero: Attribute.Boolean;
    usuario: Attribute.Relation<
      'api::registrobitacora.registrobitacora',
      'oneToOne',
      'plugin::users-permissions.user'
    >;
    plantas: Attribute.Relation<
      'api::registrobitacora.registrobitacora',
      'oneToMany',
      'api::planta.planta'
    >;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    publishedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'api::registrobitacora.registrobitacora',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    updatedBy: Attribute.Relation<
      'api::registrobitacora.registrobitacora',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface ApiResenaResena extends Schema.CollectionType {
  collectionName: 'resenas';
  info: {
    singularName: 'resena';
    pluralName: 'resenas';
    displayName: 'resenas';
    description: '';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    usuario: Attribute.Relation<
      'api::resena.resena',
      'oneToOne',
      'plugin::users-permissions.user'
    >;
    producto: Attribute.Relation<
      'api::resena.resena',
      'oneToOne',
      'api::producto.producto'
    >;
    comentario: Attribute.Text;
    timestamp: Attribute.DateTime;
    carrito: Attribute.Relation<
      'api::resena.resena',
      'oneToOne',
      'api::carrito.carrito'
    >;
    curso_id: Attribute.Relation<
      'api::resena.resena',
      'oneToOne',
      'api::curso.curso'
    >;
    club_id: Attribute.Relation<
      'api::resena.resena',
      'oneToOne',
      'api::club.club'
    >;
    status: Attribute.Enumeration<['publicada', 'eliminada', 'bloqueada']>;
    observaciones: Attribute.Text;
    evento_id: Attribute.Relation<
      'api::resena.resena',
      'oneToOne',
      'api::evento.evento'
    >;
    tipo: Attribute.Enumeration<
      ['producto', 'club', 'curso', 'evento', 'enlace', 'recurso']
    >;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    publishedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'api::resena.resena',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    updatedBy: Attribute.Relation<
      'api::resena.resena',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface ApiRespuestaRespuesta extends Schema.CollectionType {
  collectionName: 'respuestas';
  info: {
    singularName: 'respuesta';
    pluralName: 'respuestas';
    displayName: 'respuesta';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    pregunta: Attribute.Relation<
      'api::respuesta.respuesta',
      'oneToOne',
      'api::pregunta-producto.pregunta-producto'
    >;
    respuesta: Attribute.String;
    timestamp: Attribute.DateTime;
    publicada: Attribute.Boolean;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    publishedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'api::respuesta.respuesta',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    updatedBy: Attribute.Relation<
      'api::respuesta.respuesta',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface ApiServicioServicio extends Schema.CollectionType {
  collectionName: 'servicios';
  info: {
    singularName: 'servicio';
    pluralName: 'servicios';
    displayName: 'Servicios';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    titulo: Attribute.String;
    descripcion: Attribute.Text;
    imagen: Attribute.Media<'images' | 'files' | 'videos' | 'audios'>;
    precio_fijo: Attribute.Boolean;
    precio: Attribute.Decimal;
    prestador: Attribute.Relation<
      'api::servicio.servicio',
      'oneToOne',
      'plugin::users-permissions.user'
    >;
    slug: Attribute.UID;
    descripcion_precio: Attribute.Text;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    publishedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'api::servicio.servicio',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    updatedBy: Attribute.Relation<
      'api::servicio.servicio',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface ApiSolicitudafiliacionSolicitudafiliacion
  extends Schema.CollectionType {
  collectionName: 'solicitudafiliaciones';
  info: {
    singularName: 'solicitudafiliacion';
    pluralName: 'solicitudafiliaciones';
    displayName: 'solicitudafiliacion';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    usuario: Attribute.Relation<
      'api::solicitudafiliacion.solicitudafiliacion',
      'oneToOne',
      'plugin::users-permissions.user'
    >;
    club: Attribute.Relation<
      'api::solicitudafiliacion.solicitudafiliacion',
      'oneToOne',
      'api::club.club'
    >;
    solicitada: Attribute.DateTime;
    pago_inicial: Attribute.Relation<
      'api::solicitudafiliacion.solicitudafiliacion',
      'oneToOne',
      'api::pago.pago'
    >;
    status: Attribute.String;
    afiliacionpagada: Attribute.Boolean;
    metadata: Attribute.JSON;
    kit_entregas: Attribute.Integer;
    kit_entregados: Attribute.Integer;
    luz_activada: Attribute.Boolean;
    afiliado: Attribute.DateTime;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    publishedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'api::solicitudafiliacion.solicitudafiliacion',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    updatedBy: Attribute.Relation<
      'api::solicitudafiliacion.solicitudafiliacion',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface ApiSolicitudplantaSolicitudplanta
  extends Schema.CollectionType {
  collectionName: 'solicitudplantas';
  info: {
    singularName: 'solicitudplanta';
    pluralName: 'solicitudplantas';
    displayName: 'solicitudplanta';
    description: '';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    usuario: Attribute.Relation<
      'api::solicitudplanta.solicitudplanta',
      'oneToOne',
      'plugin::users-permissions.user'
    >;
    club: Attribute.Relation<
      'api::solicitudplanta.solicitudplanta',
      'oneToOne',
      'api::club.club'
    >;
    timestamp: Attribute.DateTime;
    fechasolicitada: Attribute.DateTime;
    status: Attribute.String;
    gramos: Attribute.Decimal;
    fechaentregada: Attribute.DateTime;
    plantas: Attribute.Relation<
      'api::solicitudplanta.solicitudplanta',
      'oneToMany',
      'api::planta.planta'
    >;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    publishedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'api::solicitudplanta.solicitudplanta',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    updatedBy: Attribute.Relation<
      'api::solicitudplanta.solicitudplanta',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface ApiStoreStore extends Schema.CollectionType {
  collectionName: 'stores';
  info: {
    singularName: 'store';
    pluralName: 'stores';
    displayName: 'Stores';
    description: '';
  };
  options: {
    draftAndPublish: true;
  };
  pluginOptions: {
    i18n: {
      localized: true;
    };
  };
  attributes: {
    name: Attribute.String &
      Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
    users_permissions_user: Attribute.Relation<
      'api::store.store',
      'oneToOne',
      'plugin::users-permissions.user'
    >;
    email: Attribute.String &
      Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
    stripeAccountId: Attribute.String &
      Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
    stripeOnboarded: Attribute.Boolean &
      Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
    stripeChargesEnabled: Attribute.Boolean &
      Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
    stripePayoutsEnabled: Attribute.Boolean &
      Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
    terminado: Attribute.Boolean &
      Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
    slug: Attribute.String &
      Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
    direccion: Attribute.Relation<
      'api::store.store',
      'oneToOne',
      'api::direccion.direccion'
    >;
    cp: Attribute.String &
      Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
    localidad: Attribute.String &
      Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
    esquema_impuestos: Attribute.Enumeration<
      ['sin_iva', 'con_iva', 'optativo']
    > &
      Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
    imagen: Attribute.Media<'images' | 'files' | 'videos' | 'audios'> &
      Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
    preguntas_productos: Attribute.Relation<
      'api::store.store',
      'oneToMany',
      'api::pregunta-producto.pregunta-producto'
    >;
    paso: Attribute.Integer &
      Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
    nombre_bancario: Attribute.String &
      Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
    clabe_bancaria: Attribute.String &
      Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
    banco: Attribute.String &
      Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    publishedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'api::store.store',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    updatedBy: Attribute.Relation<
      'api::store.store',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    localizations: Attribute.Relation<
      'api::store.store',
      'oneToMany',
      'api::store.store'
    >;
    locale: Attribute.String;
  };
}

export interface ApiStoreCategorieStoreCategorie extends Schema.CollectionType {
  collectionName: 'store_categories';
  info: {
    singularName: 'store-categorie';
    pluralName: 'store-categories';
    displayName: 'store-categories';
    description: '';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    nombre: Attribute.String;
    descripcion: Attribute.Text;
    imagen: Attribute.Media<'images' | 'files' | 'videos' | 'audios'>;
    slug: Attribute.String;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    publishedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'api::store-categorie.store-categorie',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    updatedBy: Attribute.Relation<
      'api::store-categorie.store-categorie',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface ApiTareaTarea extends Schema.CollectionType {
  collectionName: 'tareas';
  info: {
    singularName: 'tarea';
    pluralName: 'tareas';
    displayName: 'tasks-completed';
    description: '';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    idx: Attribute.UID;
    agencia: Attribute.Relation<
      'api::tarea.tarea',
      'oneToOne',
      'api::agencia.agencia'
    >;
    tipo: Attribute.Enumeration<['tarea', 'subtarea']>;
    todo: Attribute.Relation<'api::tarea.tarea', 'manyToOne', 'api::todo.todo'>;
    avances: Attribute.JSON;
    usuario: Attribute.Relation<
      'api::tarea.tarea',
      'manyToOne',
      'plugin::users-permissions.user'
    >;
    enlaces: Attribute.JSON;
    calificaciones: Attribute.JSON;
    apelaciones: Attribute.JSON;
    pagos_laborys: Attribute.JSON;
    pagos_efectivo: Attribute.JSON;
    validaciones: Attribute.JSON;
    titulo: Attribute.String;
    descripcion: Attribute.Text;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    publishedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'api::tarea.tarea',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    updatedBy: Attribute.Relation<
      'api::tarea.tarea',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface ApiTodoTodo extends Schema.CollectionType {
  collectionName: 'todos';
  info: {
    singularName: 'todo';
    pluralName: 'todos';
    displayName: 'Tasks';
    description: '';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    idx: Attribute.UID;
    creador: Attribute.Relation<
      'api::todo.todo',
      'oneToOne',
      'plugin::users-permissions.user'
    >;
    areas: Attribute.Relation<'api::todo.todo', 'manyToMany', 'api::area.area'>;
    subareas: Attribute.Relation<
      'api::todo.todo',
      'manyToMany',
      'api::area.area'
    >;
    tipo: Attribute.Enumeration<['tarea', 'subtarea']>;
    ambito: Attribute.Enumeration<['privada', 'plataforma']>;
    nivel: Attribute.Enumeration<
      ['general', 'becarios', 'especialidad', 'experto', 'personalizada']
    >;
    grupo: Attribute.String;
    habilidades: Attribute.JSON;
    recurrencia: Attribute.Enumeration<['unica', 'abierta', 'periodica']>;
    descripcion: Attribute.Text;
    enlaces: Attribute.JSON;
    subtareas: Attribute.String;
    status: Attribute.Enumeration<
      [
        'borrador',
        'publicada',
        'asignada',
        'en_proceso',
        'pendiente_revision',
        'corregir',
        'corregida',
        'calificada',
        'pagada',
        'cancelada'
      ]
    >;
    pagos_laborys: Attribute.Decimal;
    pagos_efectivo: Attribute.Decimal;
    recompensa: Attribute.Decimal;
    minutos_desarrollo: Attribute.Integer;
    fecha_publicacion: Attribute.DateTime;
    fecha_entrega: Attribute.DateTime;
    vence: Attribute.Boolean;
    algoritmo: Attribute.Text;
    oraculos_validadores: Attribute.JSON;
    anotaciones: Attribute.Text;
    titulo: Attribute.String;
    usuario_email: Attribute.String;
    agencia: Attribute.Relation<
      'api::todo.todo',
      'oneToOne',
      'api::agencia.agencia'
    >;
    agencianombre: Attribute.String;
    tareas: Attribute.Relation<
      'api::todo.todo',
      'oneToMany',
      'api::tarea.tarea'
    >;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    publishedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<'api::todo.todo', 'oneToOne', 'admin::user'> &
      Attribute.Private;
    updatedBy: Attribute.Relation<'api::todo.todo', 'oneToOne', 'admin::user'> &
      Attribute.Private;
  };
}

export interface ApiTriprequestTriprequest extends Schema.CollectionType {
  collectionName: 'triprequests';
  info: {
    singularName: 'triprequest';
    pluralName: 'triprequests';
    displayName: 'triprequest';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    origencoords: Attribute.JSON;
    destinocoords: Attribute.JSON;
    origendireccion: Attribute.JSON;
    destinodireccion: Attribute.JSON;
    pasajeromail: Attribute.Email;
    pasajero: Attribute.Relation<
      'api::triprequest.triprequest',
      'oneToOne',
      'plugin::users-permissions.user'
    >;
    travelid: Attribute.String;
    timestamp: Attribute.DateTime;
    status: Attribute.Enumeration<['solicitado', 'cancelado', 'tomado']>;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    publishedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'api::triprequest.triprequest',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    updatedBy: Attribute.Relation<
      'api::triprequest.triprequest',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface ApiViajeViaje extends Schema.CollectionType {
  collectionName: 'viajes';
  info: {
    singularName: 'viaje';
    pluralName: 'viajes';
    displayName: 'viaje';
    description: '';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    origencoords: Attribute.JSON;
    destinocoords: Attribute.JSON;
    conductorcoords: Attribute.JSON;
    origendireccion: Attribute.JSON;
    destinodireccion: Attribute.JSON;
    pasajeromail: Attribute.Email;
    conductormail: Attribute.Email;
    solicitado: Attribute.DateTime;
    iniciado: Attribute.DateTime;
    concluido: Attribute.DateTime;
    travelid: Attribute.String;
    observaciones: Attribute.Text;
    costo: Attribute.Decimal;
    pagadoefectivo: Attribute.Decimal;
    pagadolabory: Attribute.Decimal;
    calificacionconductor: Attribute.Integer;
    calificacionpasajero: Attribute.Integer;
    track: Attribute.JSON;
    status: Attribute.String;
    pasajero: Attribute.Relation<
      'api::viaje.viaje',
      'oneToOne',
      'plugin::users-permissions.user'
    >;
    conductor: Attribute.Relation<
      'api::viaje.viaje',
      'oneToOne',
      'plugin::users-permissions.user'
    >;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    publishedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'api::viaje.viaje',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    updatedBy: Attribute.Relation<
      'api::viaje.viaje',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface ApiWorldCoinWalletWorldCoinWallet
  extends Schema.CollectionType {
  collectionName: 'world_coin_wallets';
  info: {
    singularName: 'world-coin-wallet';
    pluralName: 'world-coin-wallets';
    displayName: 'WorldCoinWallet';
    description: '';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    CarteraIdx: Attribute.String;
    ammount: Attribute.Decimal;
    user_idd: Attribute.Relation<
      'api::world-coin-wallet.world-coin-wallet',
      'oneToOne',
      'admin::user'
    >;
    genesis: Attribute.Boolean;
    user_id: Attribute.Email;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    publishedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'api::world-coin-wallet.world-coin-wallet',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    updatedBy: Attribute.Relation<
      'api::world-coin-wallet.world-coin-wallet',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

declare module '@strapi/types' {
  export module Shared {
    export interface ContentTypes {
      'admin::permission': AdminPermission;
      'admin::user': AdminUser;
      'admin::role': AdminRole;
      'admin::api-token': AdminApiToken;
      'admin::api-token-permission': AdminApiTokenPermission;
      'admin::transfer-token': AdminTransferToken;
      'admin::transfer-token-permission': AdminTransferTokenPermission;
      'plugin::upload.file': PluginUploadFile;
      'plugin::upload.folder': PluginUploadFolder;
      'plugin::content-releases.release': PluginContentReleasesRelease;
      'plugin::content-releases.release-action': PluginContentReleasesReleaseAction;
      'plugin::users-permissions.permission': PluginUsersPermissionsPermission;
      'plugin::users-permissions.role': PluginUsersPermissionsRole;
      'plugin::users-permissions.user': PluginUsersPermissionsUser;
      'plugin::i18n.locale': PluginI18NLocale;
      'api::ad.ad': ApiAdAd;
      'api::ad-view.ad-view': ApiAdViewAdView;
      'api::agencia.agencia': ApiAgenciaAgencia;
      'api::agenda.agenda': ApiAgendaAgenda;
      'api::area.area': ApiAreaArea;
      'api::bitacora.bitacora': ApiBitacoraBitacora;
      'api::carrito.carrito': ApiCarritoCarrito;
      'api::carro.carro': ApiCarroCarro;
      'api::cars-evidence.cars-evidence': ApiCarsEvidenceCarsEvidence;
      'api::cars-validation.cars-validation': ApiCarsValidationCarsValidation;
      'api::cars-validation-event.cars-validation-event': ApiCarsValidationEventCarsValidationEvent;
      'api::cartera.cartera': ApiCarteraCartera;
      'api::categoria-contenido.categoria-contenido': ApiCategoriaContenidoCategoriaContenido;
      'api::categoria-curso.categoria-curso': ApiCategoriaCursoCategoriaCurso;
      'api::categoria-enlace.categoria-enlace': ApiCategoriaEnlaceCategoriaEnlace;
      'api::categoria-evento.categoria-evento': ApiCategoriaEventoCategoriaEvento;
      'api::categoria-herramienta.categoria-herramienta': ApiCategoriaHerramientaCategoriaHerramienta;
      'api::categoria-wikimapa.categoria-wikimapa': ApiCategoriaWikimapaCategoriaWikimapa;
      'api::club.club': ApiClubClub;
      'api::codigosreferido.codigosreferido': ApiCodigosreferidoCodigosreferido;
      'api::cofepristramite.cofepristramite': ApiCofepristramiteCofepristramite;
      'api::comentario-publicacion.comentario-publicacion': ApiComentarioPublicacionComentarioPublicacion;
      'api::configuracion-sistema.configuracion-sistema': ApiConfiguracionSistemaConfiguracionSistema;
      'api::configuracion-usuario.configuracion-usuario': ApiConfiguracionUsuarioConfiguracionUsuario;
      'api::contenido.contenido': ApiContenidoContenido;
      'api::credencial.credencial': ApiCredencialCredencial;
      'api::curso.curso': ApiCursoCurso;
      'api::direccion.direccion': ApiDireccionDireccion;
      'api::driver.driver': ApiDriverDriver;
      'api::driver-location.driver-location': ApiDriverLocationDriverLocation;
      'api::enlace.enlace': ApiEnlaceEnlace;
      'api::evento.evento': ApiEventoEvento;
      'api::favorito.favorito': ApiFavoritoFavorito;
      'api::gen-wallet.gen-wallet': ApiGenWalletGenWallet;
      'api::kitjardinero.kitjardinero': ApiKitjardineroKitjardinero;
      'api::lista-suscripcion.lista-suscripcion': ApiListaSuscripcionListaSuscripcion;
      'api::membresia.membresia': ApiMembresiaMembresia;
      'api::membresias-tipo.membresias-tipo': ApiMembresiasTipoMembresiasTipo;
      'api::message.message': ApiMessageMessage;
      'api::notificacion.notificacion': ApiNotificacionNotificacion;
      'api::pago.pago': ApiPagoPago;
      'api::pedido.pedido': ApiPedidoPedido;
      'api::planta.planta': ApiPlantaPlanta;
      'api::postulacion.postulacion': ApiPostulacionPostulacion;
      'api::pregunta-producto.pregunta-producto': ApiPreguntaProductoPreguntaProducto;
      'api::producto.producto': ApiProductoProducto;
      'api::publicacion.publicacion': ApiPublicacionPublicacion;
      'api::rating.rating': ApiRatingRating;
      'api::reaccion.reaccion': ApiReaccionReaccion;
      'api::registrobitacora.registrobitacora': ApiRegistrobitacoraRegistrobitacora;
      'api::resena.resena': ApiResenaResena;
      'api::respuesta.respuesta': ApiRespuestaRespuesta;
      'api::servicio.servicio': ApiServicioServicio;
      'api::solicitudafiliacion.solicitudafiliacion': ApiSolicitudafiliacionSolicitudafiliacion;
      'api::solicitudplanta.solicitudplanta': ApiSolicitudplantaSolicitudplanta;
      'api::store.store': ApiStoreStore;
      'api::store-categorie.store-categorie': ApiStoreCategorieStoreCategorie;
      'api::tarea.tarea': ApiTareaTarea;
      'api::todo.todo': ApiTodoTodo;
      'api::triprequest.triprequest': ApiTriprequestTriprequest;
      'api::viaje.viaje': ApiViajeViaje;
      'api::world-coin-wallet.world-coin-wallet': ApiWorldCoinWalletWorldCoinWallet;
    }
  }
}
