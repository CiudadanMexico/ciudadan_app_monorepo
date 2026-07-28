import type { Schema, Attribute } from '@strapi/strapi';

export interface CarritosProductoEnCarrito extends Schema.Component {
  collectionName: 'components_carritos_producto_en_carritos';
  info: {
    displayName: 'producto_en_carrito';
    icon: 'shoppingCart';
    description: '';
  };
  attributes: {
    producto: Attribute.Relation<
      'carritos.producto-en-carrito',
      'oneToOne',
      'api::producto.producto'
    >;
    nombre: Attribute.String;
    precio_unitario: Attribute.Decimal;
    cantidad: Attribute.Integer;
    subtotal: Attribute.Decimal;
    envio: Attribute.Decimal;
    subtotal_volumetrico: Attribute.Decimal;
    esquema_impuestos: Attribute.Enumeration<
      ['sin_iva', 'con_iva', 'optativo']
    >;
    cp: Attribute.String;
    total: Attribute.Decimal;
    comisionStripe: Attribute.Decimal;
    comisionPlataforma: Attribute.Decimal;
    imagen_predeterminada: Attribute.Media<
      'images' | 'files' | 'videos' | 'audios'
    >;
    store: Attribute.Relation<
      'carritos.producto-en-carrito',
      'oneToOne',
      'api::store.store'
    >;
    calificado: Attribute.Boolean;
    fechacalificado: Attribute.DateTime;
    status: Attribute.String;
  };
}

declare module '@strapi/types' {
  export module Shared {
    export interface Components {
      'carritos.producto-en-carrito': CarritosProductoEnCarrito;
    }
  }
}
