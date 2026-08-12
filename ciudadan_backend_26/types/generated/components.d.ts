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
    calificado: Attribute.Boolean & Attribute.DefaultTo<false>;
    fechacalificado: Attribute.DateTime;
    status: Attribute.String;
  };
}

export interface OrdersProductsOrder extends Schema.Component {
  collectionName: 'components_orders_products_orders';
  info: {
    displayName: 'products_order';
    icon: 'shoppingCart';
  };
  attributes: {
    product: Attribute.Relation<
      'orders.products-order',
      'oneToOne',
      'api::food-product.food-product'
    >;
    restaurant: Attribute.Relation<
      'orders.products-order',
      'oneToOne',
      'api::food-restaurant.food-restaurant'
    >;
    nombre: Attribute.String;
    precio_unitario: Attribute.Decimal;
    cantidad: Attribute.Integer;
    subtotal: Attribute.Decimal;
    envio: Attribute.Decimal;
    subtotal_volumetrico: Attribute.Decimal;
    total: Attribute.Decimal;
    comision_plataforma: Attribute.Decimal;
    calificado: Attribute.Boolean;
    calificacion: Attribute.Decimal;
    fecha_calificado: Attribute.DateTime;
    status: Attribute.String;
  };
}

declare module '@strapi/types' {
  export module Shared {
    export interface Components {
      'carritos.producto-en-carrito': CarritosProductoEnCarrito;
      'orders.products-order': OrdersProductsOrder;
    }
  }
}
