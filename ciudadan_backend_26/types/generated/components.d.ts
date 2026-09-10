import type { Schema, Attribute } from '@strapi/strapi';

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

export interface OffersOfferItem extends Schema.Component {
  collectionName: 'components_offers_offer_items';
  info: {
    displayName: 'Offer Item';
    icon: 'restaurant';
    description: '';
  };
  attributes: {
    product: Attribute.Relation<
      'offers.offer-item',
      'oneToOne',
      'api::food-product.food-product'
    >;
    cantidad: Attribute.Integer &
      Attribute.Required &
      Attribute.SetMinMax<
        {
          min: 1;
        },
        number
      > &
      Attribute.DefaultTo<1>;
    precio: Attribute.Decimal &
      Attribute.Required &
      Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      >;
    food_modifiers: Attribute.Relation<
      'offers.offer-item',
      'oneToMany',
      'api::food-modifier.food-modifier'
    >;
  };
}

export interface FoodCartFoodCartItem extends Schema.Component {
  collectionName: 'components_food_cart_food_cart_items';
  info: {
    displayName: 'Food Cart Item';
    icon: 'shoppingCart';
  };
  attributes: {
    producto: Attribute.Relation<
      'food-cart.food-cart-item',
      'oneToOne',
      'api::food-product.food-product'
    >;
    variante: Attribute.Relation<
      'food-cart.food-cart-item',
      'oneToOne',
      'api::food-product-variant.food-product-variant'
    >;
    restaurante: Attribute.Relation<
      'food-cart.food-cart-item',
      'oneToOne',
      'api::food-restaurant.food-restaurant'
    >;
    item_key: Attribute.String;
    nombre: Attribute.String;
    nombre_variante: Attribute.String;
    imagen: Attribute.String;
    precio_base: Attribute.Decimal;
    precio_variante: Attribute.Decimal;
    precio_unitario: Attribute.Decimal;
    cantidad: Attribute.Integer & Attribute.DefaultTo<1>;
    subtotal: Attribute.Decimal;
    modificadores: Attribute.JSON;
    metadata: Attribute.JSON;
  };
}

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

declare module '@strapi/types' {
  export module Shared {
    export interface Components {
      'orders.products-order': OrdersProductsOrder;
      'offers.offer-item': OffersOfferItem;
      'food-cart.food-cart-item': FoodCartFoodCartItem;
      'carritos.producto-en-carrito': CarritosProductoEnCarrito;
    }
  }
}
