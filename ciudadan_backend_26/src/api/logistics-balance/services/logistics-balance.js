'use strict';

// logistics-balance service
const { createCoreService } = require("@strapi/strapi").factories;

const BALANCE_UID = "api::logistics-balance.logistics-balance";
const TRANSACTION_UID = "api::logistics-transaction.logistics-transaction";
const BALANCE_TABLE = "logistics_balances";

/**
 * Convierte un valor a número decimal válido.
 */
function parseAmount(value, fieldName = "amount") {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    const error = new Error(`${fieldName} debe ser un número válido`);
    error.status = 400;
    throw error;
  }

  return amount;
}

/**
 * Valida que el importe sea positivo.
 */
function parsePositiveAmount(value, fieldName = "amount") {
  const amount = parseAmount(value, fieldName);

  if (amount <= 0) {
    const error = new Error(`${fieldName} debe ser mayor que cero`);
    
    error.status = 400;
    throw error;
  }

  return amount;
}

/**
 * Genera una referencia interna legible.
 */
function generateTransactionReference(type) {
  const prefixMap = {
    deposit: "DEP",
    shipment_charge: "SHP",
    refund: "REF",
    adjustment: "ADJ",
  };

  const prefix = prefixMap[type] ?? "LOG";

  const timestamp = Date.now();

  const random = Math.floor(
    1000 + Math.random() * 9000
  );

  return `${prefix}-${timestamp}-${random}`;
}

/**
 * Genera una referencia de reserva.
 */
function generateReservationReference(orderId) {
  return `SHIP-RES-${orderId}-${Date.now()}`;
}

module.exports = createCoreService(BALANCE_UID, ({ strapi }) => ({

  // =========================================================
  // GET BALANCE
  // =========================================================

  /**
   * Obtiene el balance de logística de una tienda.
   * Si no existe, puede crearlo automáticamente.
   */
  async getBalance(storeId, options = {}) {
    if (!storeId) {
      const error = new Error("storeId es requerido");
      
      error.status = 400;
      throw error;
    }

    const createIfMissing = options?.createIfMissing !== false;

    let balance = await strapi.db
      .query(BALANCE_UID)
      .findOne({
        where: {
          store: storeId,
        },
        populate: {
          store: true,
        },
      });

    if (!balance && createIfMissing) {
      balance = await strapi.db
        .query(BALANCE_UID)
        .create({
          data: {
            store: storeId,
            availableBalance: 0,
            reservedBalance: 0,
            currency: options?.currency ?? "MXN",
            status: "active",
            lastTransactionAt: null,
          },
          populate: {
            store: true,
          },
        });
    }

    return balance;
  },

  // =========================================================
  // RESERVE SHIPMENT BALANCE
  // =========================================================

  /**
   * Reserva saldo para intentar crear un envío.
   *
   * Ejemplo:
   *
   * available = 1000
   * reserved  = 0
   *
   * reserve 406.20
   *
   * available = 593.80
   * reserved  = 406.20
   *
   * La transacción queda en estado pending.
   */
  async reserveShipmentBalance({
    storeId,
    amount,
    orderId,
    userId = null,
    idempotencyKey = null,
    metadata = {},
    externalReference = null,
  }) {
    if (!storeId) {
      const error = new Error("storeId es requerido");
      
      error.status = 400;
      throw error;
    }

    if (!orderId) {
      const error = new Error("orderId es requerido para reservar saldo");
      
      error.status = 400;
      throw error;
    }

    const reservationAmount = parsePositiveAmount(amount, "amount");

    if (!idempotencyKey) {
      const error = new Error("idempotencyKey es requerido para reservar saldo");
      
      error.status = 400;
      throw error;
    }

    const trx = await strapi.db.connection.transaction();

    try {
      // -----------------------------------------------------
      // 1. Verificar si ya existe una operación con esa
      //    idempotencyKey.
      // -----------------------------------------------------

      const existingTransaction = await strapi.db
        .query(TRANSACTION_UID)
        .findOne({
          where: {
            idempotencyKey,
          },
          transacting: trx,
        });

      if (existingTransaction) {

        // Si ya fue completada, no debemos volver a reservar.
        if (existingTransaction.status === "completed") {
          await trx.commit();

          return {
            alreadyProcessed: true,
            transaction: existingTransaction,
            transactionId: existingTransaction.id,
            status: existingTransaction.status,
          };
        }

        // Si está pendiente, devolvemos la reserva existente.
        if (existingTransaction.status === "pending") {
          await trx.commit();

          return {
            alreadyReserved: true,
            transaction: existingTransaction,
            transactionId: existingTransaction.id,
            status: existingTransaction.status,
          };
        }

        // Si fue cancelada anteriormente, permitimos una nueva operación únicamente si el caller proporciona otra idempotencyKey.
        const error = new Error(`Ya existe una transacción con idempotencyKey ${idempotencyKey} en estado ${existingTransaction.status}`);

        
        error.status = 409;

        throw error;
      }

      // -----------------------------------------------------
      // 2. Obtener balance.
      //
      // IMPORTANTE:
      // Utilizamos la tabla directamente para poder hacer la actualización de forma atómica.
      // -----------------------------------------------------

      let balance = await strapi.db
        .query(BALANCE_UID)
        .findOne({
          where: {
            store: storeId,
          },
          transacting: trx,
        });

      // -----------------------------------------------------
      // 3. Crear balance si todavía no existe.
      // -----------------------------------------------------

      if (!balance) {
        balance = await strapi.db
          .query(BALANCE_UID)
          .create({
            data: {
              store: storeId,
              availableBalance: 0,
              reservedBalance: 0,
              currency: "MXN",
              status: "active",
              lastTransactionAt: null,
            },
            transacting: trx,
          });
      }

      if (balance.status !== "active") {
        const error = new Error("El saldo de logística de la tienda está bloqueado");

        
        error.status = 409;

        throw error;
      }

      const availableBefore = Number(balance.availableBalance ?? 0);
      const reservedBefore = Number(balance.reservedBalance ?? 0);

      // -----------------------------------------------------
      // 4. Actualización ATÓMICA.
      //
      // Solo se actualiza si available_balance >= amount.
      // Esto evita que dos solicitudes simultáneas gasten el mismo saldo.
      // -----------------------------------------------------

      const updatedRows = await trx(BALANCE_TABLE)
        .where({
          id: balance.id,
        })
        .where(
          "available_balance",
          ">=",
          reservationAmount
        )
        .update({
          available_balance: trx.raw("available_balance - ?", [reservationAmount]),
          reserved_balance: trx.raw("reserved_balance + ?", [reservationAmount]),
          last_transaction_at: new Date(),
        });

      if (updatedRows !== 1) {
        const error = new Error("Saldo de logística insuficiente");

        
        error.status = 400;
        throw error;
      }

      const availableAfter = availableBefore - reservationAmount;

      // -----------------------------------------------------
      // 5. Crear referencia de reserva.
      // -----------------------------------------------------

      const reservationReference = generateReservationReference(orderId);
      const transactionReference = generateTransactionReference("shipment_charge");

      // -----------------------------------------------------
      // 6. Crear transacción financiera.
      // -----------------------------------------------------

      const transaction = await strapi.db
        .query(TRANSACTION_UID)
        .create({
          data: {
            store: storeId,
            type: "shipment_charge",
            amount: reservationAmount,
            status: "pending",
            balanceBefore: availableBefore,
            balanceAfter: availableAfter,
            order: orderId,
            shipment: null,
            externalReference: externalReference,
            idempotencyKey,
            description: `Reserva de saldo para envío del pedido ${orderId}`,
            metadata,
            by_user: userId,
            completedAt: null,
            transactionReference,
            reservationReference,
          },
          transacting: trx,
        });

      await trx.commit();

      return {
        success: true,
        alreadyReserved: false,
        transactionId: transaction.id,
        transaction,
        reservationReference,
        transactionReference,
        amount: reservationAmount,
        balanceBefore: availableBefore,
        balanceAfter: availableAfter,
      };

    } catch (error) {
      await trx.rollback();
      throw error;
    }
  },

  // =========================================================
  // COMMIT SHIPMENT CHARGE
  // =========================================================

  /**
   * Confirma una reserva después de que Skydropx devuelve correctamente un shipment ID.
   *
   * IMPORTANTE:
   * NO vuelve a descontar availableBalance.
   * La reserva ya movió:
   * available -> reserved
   * Aquí solamente:
   * reserved -> 0
   * y la transacción pasa de pending -> completed.
   */
  async commitShipmentCharge({ transactionId, shipmentId, externalReference = null, metadata = null, }) {
    if (!transactionId) {
      const error = new Error("transactionId es requerido");
      
      error.status = 400;
      throw error;
    }

    if (!shipmentId) {
      const error = new Error("shipmentId es requerido");
      
      error.status = 400;
      throw error;
    }

    const trx = await strapi.db.connection.transaction();

    try {
      const transaction = await strapi.db
        .query(TRANSACTION_UID)
        .findOne({
          where: {
            id: transactionId,
          },
          transacting: trx,
        });

      if (!transaction) {
        const error = new Error("Transacción de logística no encontrada");
        
        error.status = 404;
        throw error;
      }

      // -----------------------------------------------------
      // Idempotencia
      // -----------------------------------------------------

      if (transaction.status === "completed") {
        await trx.commit();

        return {
          success: true,
          alreadyCompleted: true,
          transaction,
        };
      }

      if (transaction.status !== "pending") {
        const error = new Error(`La transacción no puede confirmarse porque está en estado ${transaction.status}`);
        
        error.status = 409;
        throw error;
      }

      const amount = parsePositiveAmount(transaction.amount, "transaction.amount");

      // -----------------------------------------------------
      // 1. Obtener balance
      // -----------------------------------------------------
      const balance = await strapi.db
        .query(BALANCE_UID)
        .findOne({
          where: {
            store:
              transaction.store?.id ??
              transaction.store,
          },
          transacting: trx,
        });

      if (!balance) {
        const error = new Error("No se encontró el balance de logística");
        
        error.status = 404;
        throw error;
      }

      const reservedBefore = Number(balance.reservedBalance ?? 0);

      if (reservedBefore < amount) {
        const error = new Error("El saldo reservado es menor al importe de la transacción");
        
        error.status = 409;
        throw error;
      }

      // -----------------------------------------------------
      // 2. Liberar la reserva.
      // available NO cambia.
      // reserved disminuye.
      // -----------------------------------------------------

      const updatedRows = await trx(BALANCE_TABLE)
        .where({ id: balance.id, })
        .where("reserved_balance", ">=", amount)
        .update({
          reserved_balance: trx.raw("reserved_balance - ?", [amount]),
          last_transaction_at: new Date(),
        });

      if (updatedRows !== 1) {
        const error = new Error("No fue posible liberar el saldo reservado");
        
        error.status = 409;
        throw error;
      }

      // -----------------------------------------------------
      // 3. Actualizar transacción
      // -----------------------------------------------------

      const transactionMetadata = metadata
        ? {
          ...(transaction.metadata ?? {}),
          ...metadata,
        }
        : transaction.metadata;

      const updatedTransaction = await strapi.db
        .query(TRANSACTION_UID)
        .update({
          where: { id: transaction.id },
          data: {
            status: "completed",
            shipment: String(shipmentId),
            externalReference: externalReference ?? String(shipmentId),
            metadata: transactionMetadata,
            completedAt: new Date(),
          },
          transacting: trx,
        });

      await trx.commit();

      return {
        success: true,
        alreadyCompleted: false,
        transaction: updatedTransaction,
        amount,
        shipmentId: String(shipmentId),
      };

    } catch (error) {
      await trx.rollback();
      throw error;
    }
  },

  // =========================================================
  // RELEASE SHIPMENT RESERVATION
  // =========================================================

  /**
   * Libera una reserva cuando Skydropx no pudo crear
   * correctamente el shipment.
   */
  async releaseShipmentReservation({ transactionId, reason = "No fue posible crear el envío en Skydropx", metadata = null, }) {
    if (!transactionId) {
      const error = new Error("transactionId es requerido");
      
      error.status = 400;
      throw error;
    }

    const trx = await strapi.db.connection.transaction();

    try {
      const transaction = await strapi.db
        .query(TRANSACTION_UID)
        .findOne({
          where: { id: transactionId, },
          transacting: trx,
        });

      if (!transaction) {
        const error = new Error("Transacción de logística no encontrada");
        
        error.status = 404;
        throw error;
      }

      // -----------------------------------------------------
      // Idempotencia
      // -----------------------------------------------------

      if (transaction.status === "cancelled") {
        await trx.commit();

        return {
          success: true,
          alreadyReleased: true,
          transaction,
        };
      }

      // Si ya fue consumida, no podemos liberarla.
      if (transaction.status === "completed") {
        const error = new Error("La reserva ya fue consumida y no puede liberarse");
        
        error.status = 409;
        throw error;
      }

      if (transaction.status !== "pending") {
        const error = new Error(`La transacción no puede liberarse porque está en estado ${transaction.status}`);
        
        error.status = 409;
        throw error;
      }

      const amount = parsePositiveAmount(transaction.amount, "transaction.amount");

      // -----------------------------------------------------
      // 1. Obtener balance
      // -----------------------------------------------------

      const storeId = transaction.store?.id ?? transaction.store;

      const balance = await strapi.db
        .query(BALANCE_UID)
        .findOne({
          where: { store: storeId, },
          transacting: trx,
        });

      if (!balance) {
        const error = new Error("No se encontró el balance de logística");
        
        error.status = 404;
        throw error;
      }

      // -----------------------------------------------------
      // 2. reserved -> available
      //
      // El importe reservado regresa al saldo disponible.
      // -----------------------------------------------------

      const updatedRows = await trx(BALANCE_TABLE)
        .where({ id: balance.id })
        .where("reserved_balance", ">=", amount)
        .update({
          available_balance: trx.raw("available_balance + ?", [amount]),
          reserved_balance: trx.raw("reserved_balance - ?", [amount]),
          last_transaction_at: new Date(),
        });

      if (updatedRows !== 1) {
        const error = new Error("No fue posible liberar el saldo reservado");
        
        error.status = 409;
        throw error;
      }

      // -----------------------------------------------------
      // 3. Actualizar transacción
      // -----------------------------------------------------

      const transactionMetadata = metadata
        ? {
          ...(transaction.metadata ?? {}),
          ...metadata,
        }
        : transaction.metadata;

      const updatedTransaction = await strapi.db
        .query(TRANSACTION_UID)
        .update({
          where: { id: transaction.id },
          data: {
            status: "cancelled",
            description: `${transaction.description ?? ""} | ${reason}`.trim(),
            metadata: transactionMetadata,
          },
          transacting: trx,
        });

      await trx.commit();

      return {
        success: true,
        alreadyReleased: false,
        transaction: updatedTransaction,
        amount,
      };

    } catch (error) {
      await trx.rollback();
      throw error;
    }
  },

  // =========================================================
  // REFUND SHIPMENT CHARGE
  // =========================================================

  /**
   * Reembolsa el cargo de un envío cuando Skydropx reporta el shipment como cancelado o devuelto.
   *
   * - Busca la transacción shipment_charge completada por shipmentId.
   * - Crea una transacción tipo refund.
   * - Regresa el importe al saldo disponible.
   * - Marca la transacción original como reversed.
   *
   * Idempotente: si ya existe un refund para ese shipment, no hace nada.
   */
  async refundShipmentCharge({ shipmentId, reason = "Envío cancelado o devuelto", metadata = null, }) {
    if (!shipmentId) {
      const error = new Error("shipmentId es requerido");
      
      error.status = 400;
      throw error;
    }

    const trx = await strapi.db.connection.transaction();

    try {
      // -----------------------------------------------------
      // Idempotencia: ¿ya existe un refund para este shipment?
      // -----------------------------------------------------
      const existingRefund = await strapi.db
        .query(TRANSACTION_UID)
        .findOne({
          where: {
            type: "refund",
            shipment: String(shipmentId),
          },
          transacting: trx,
        });

      if (existingRefund) {
        await trx.commit();

        return {
          success: true,
          alreadyRefunded: true,
          transaction: existingRefund,
        };
      }

      // -----------------------------------------------------
      // Buscar el cargo original
      // -----------------------------------------------------
      const charge = await strapi.db
        .query(TRANSACTION_UID)
        .findOne({
          where: {
            type: "shipment_charge",
            shipment: String(shipmentId),
            status: "completed",
          },
          transacting: trx,
        });

      if (!charge) {
        // No hay cargo completado (quizá nunca se confirmó).
        // No es un error fatal: simplemente no hay nada que reembolsar.
        await trx.commit();

        return {
          success: true,
          alreadyRefunded: false,
          nothingToRefund: true,
        };
      }

      const amount = parsePositiveAmount(charge.amount, "charge.amount");

      const storeId = charge.store?.id ?? charge.store;

      const balance = await strapi.db
        .query(BALANCE_UID)
        .findOne({
          where: { store: storeId },
          transacting: trx,
        });

      if (!balance) {
        const error = new Error("No se encontró el balance de logística");
        
        error.status = 404;
        throw error;
      }

      // -----------------------------------------------------
      // 1. Regresar el importe al saldo disponible
      // -----------------------------------------------------
      await trx(BALANCE_TABLE)
        .where({ id: balance.id })
        .update({
          available_balance: trx.raw("available_balance + ?", [amount]),
          last_transaction_at: new Date(),
        });

      // -----------------------------------------------------
      // 2. Crear transacción de reembolso
      // -----------------------------------------------------
      const refundTransaction = await strapi.db
        .query(TRANSACTION_UID)
        .create({
          data: {
            store: storeId,
            type: "refund",
            amount,
            status: "completed",
            balanceBefore: Number(balance.availableBalance ?? 0),
            balanceAfter: Number(balance.availableBalance ?? 0) + amount,
            shipment: String(shipmentId),
            externalReference: charge.externalReference ?? String(shipmentId),
            transactionReference: generateTransactionReference("refund"),
            description: `Reembolso de envío ${shipmentId}: ${reason}`,
            metadata: {
              ...(metadata ?? {}),
              original_transaction_id: charge.id,
              reason,
            },
            completedAt: new Date(),
          },
          transacting: trx,
        });

      // -----------------------------------------------------
      // 3. Marcar el cargo original como reversed
      // -----------------------------------------------------
      await strapi.db
        .query(TRANSACTION_UID)
        .update({
          where: { id: charge.id },
          data: {
            status: "reversed",
            metadata: {
              ...(charge.metadata ?? {}),
              refunded_at: new Date().toISOString(),
              refund_transaction_id: refundTransaction.id,
              refund_reason: reason,
            },
          },
          transacting: trx,
        });

      await trx.commit();

      return {
        success: true,
        alreadyRefunded: false,
        transaction: refundTransaction,
        amount,
      };

    } catch (error) {
      await trx.rollback();
      throw error;
    }
  },

  // =========================================================
  // CREATE DEPOSIT
  // =========================================================

  /**
   * Crea una solicitud de depósito.
   *
   * IMPORTANTE:
   *
   * Esta función NO aumenta availableBalance.
   *
   * El saldo únicamente aumenta cuando el administrador
   * aprueba el depósito mediante approveDeposit().
   */
  async createDeposit({
    storeId,
    amount,
    paymentId = null,
    userId = null,
    description = null,
    metadata = {},
    externalReference = null,
    idempotencyKey = null,
  }) {
    if (!storeId) {
      const error = new Error("storeId es requerido");
      
      error.status = 400;
      throw error;
    }

    const depositAmount = parsePositiveAmount(amount, "amount");

    const trx = await strapi.db.connection.transaction();

    try {
      // -----------------------------------------------------
      // Idempotencia
      // -----------------------------------------------------

      if (idempotencyKey) {
        const existing = await strapi.db
          .query(TRANSACTION_UID)
          .findOne({
            where: { idempotencyKey, },
            transacting: trx,
          });

        if (existing) {
          await trx.commit();

          return {
            success: true,
            alreadyExists: true,
            transaction: existing,
            transactionId: existing.id,
          };
        }
      }

      const balance = await strapi.db
        .query(BALANCE_UID)
        .findOne({
          where: { store: storeId },
          transacting: trx,
        });

      const currentBalance = Number(balance?.availableBalance ?? 0);

      const transaction = await strapi.db
        .query(TRANSACTION_UID)
        .create({
          data: {
            store: storeId,
            type: "deposit",
            amount: depositAmount,
            status: "pending",
            balanceBefore: currentBalance,
            balanceAfter: currentBalance,
            payment: paymentId,
            externalReference,
            idempotencyKey,
            description: description ?? "Solicitud de depósito de saldo de logística",
            metadata,
            by_user: userId,
            completedAt: null,
            transactionReference: generateTransactionReference("deposit"),
            reservationReference: null,
          },
          transacting: trx,
        });

      await trx.commit();

      return {
        success: true,
        alreadyExists: false,
        transaction,
        transactionId: transaction.id,
      };

    } catch (error) {
      await trx.rollback();

      throw error;
    }
  },

  // =========================================================
  // APPROVE DEPOSIT
  // =========================================================

  /**
   * Aprueba un depósito y agrega el importe al saldo disponible.
   */
  async approveDeposit({
    transactionId=null,
    userId = null,
    externalReference = null,
    metadata = {},
  }) {
    if (!transactionId) {
      const error = new Error("transactionId es requerido");
      
      error.status = 400;
      throw error;
    }

    const trx = await strapi.db.connection.transaction();

    try {
      const transaction = await strapi.db
        .query(TRANSACTION_UID)
        .findOne({
          where: {
            id: transactionId,
          },
          populate: {
            store: true,
            by_user: true,
          },
          transacting: trx,
        });

      if (!transaction) {
        const error = new Error("Transacción de depósito no encontrada");
        
        error.status = 404;
        throw error;
      }

      if (transaction.type !== "deposit") {
        const error = new Error("La transacción no es un depósito");
        
        error.status = 400;
        throw error;
      }

      if (transaction.status === "completed") {
        await trx.commit();

        return {
          success: true,
          alreadyApproved: true,
          transaction,
        };
      }

      if (transaction.status !== "pending") {
        const error = new Error(`El depósito no puede aprobarse porque está en estado ${transaction.status}`);
        
        error.status = 409;
        throw error;
      }

      const amount = parsePositiveAmount(transaction.amount, "transaction.amount");

      const storeId = transaction.store?.id ?? transaction.store;

      if(!storeId){
        const error = new Error("Tienda no localizada.");
        
        error.status = 404;
        throw error;
      }

      // -----------------------------------------------------
      // Obtener balance
      // -----------------------------------------------------
      let balance = await strapi.db
        .query(BALANCE_UID)
        .findOne({
          where: {
            store: storeId,
          },
          populate:{
            store:true
          },
          transacting: trx,
        });

      if (!balance) {
        balance = await strapi.db
          .query(BALANCE_UID)
          .create({
            data: {
              store: storeId,
              availableBalance: 0,
              reservedBalance: 0,
              currency: "MXN",
              status: "active",
            },
            transacting: trx,
          });
      }

      if (balance.status !== "active") {
        const error = new Error("El saldo de logística está bloqueado");
        
        error.status = 409;
        throw error;
      }

      const availableBefore = Number(balance.availableBalance ?? 0);
      const availableAfter = availableBefore + amount;

      // -----------------------------------------------------
      // Actualización atómica
      // -----------------------------------------------------

      const updatedRows = await trx(BALANCE_TABLE)
        .where({
          id: balance.id,
        })
        .update({
          available_balance: trx.raw("available_balance + ?", [amount]),
          last_transaction_at: new Date(),
        });

      if (updatedRows !== 1) {
        const error = new Error("No fue posible agregar el depósito al saldo");
        
        error.status = 409;
        throw error;
      }

      // -----------------------------------------------------
      // Actualizar transacción
      // -----------------------------------------------------

      const transactionMetadata = metadata ? { ...(transaction.metadata ?? {}), ...metadata, } : transaction.metadata;

      const updatedTransaction = await strapi.db
        .query(TRANSACTION_UID)
        .update({
          where: {
            id: transaction.id,
          },
          data: {
            status: "completed",
            balanceBefore: availableBefore,
            balanceAfter: availableAfter,
            externalReference: externalReference ?? transaction.externalReference,
            metadata: transactionMetadata,
            by_user: userId ?? transaction.by_user,
            completedAt: new Date(),
          },
          transacting: trx,
        });

      await trx.commit();

      return {
        success: true,
        alreadyApproved: false,
        transaction: updatedTransaction,
        amount,
        balanceBefore: availableBefore,
        balanceAfter: availableAfter,
      };

    } catch (error) {
      await trx.rollback();

      throw error;
    }
  },

  // =========================================================
  // REJECT DEPOSIT
  // =========================================================

  /**
   * Rechaza un depósito.
   *
   * No modifica el balance.
   *
   * Como el schema actual no tiene "rejected", usamos "cancelled".
   */
  async rejectDeposit({
    transactionId,
    userId = null,
    reason = "Depósito rechazado",
    metadata = null,
  }) {
    if (!transactionId) {
      const error = new Error("transactionId es requerido");
      
      error.status = 400;
      throw error;
    }

    const trx = await strapi.db.connection.transaction();

    try {
      const transaction = await strapi.db
        .query(TRANSACTION_UID)
        .findOne({
          where: {
            id: transactionId,
          },
          transacting: trx,
        });

      if (!transaction) {
        const error = new Error("Transacción no encontrada");
        
        error.status = 404;
        throw error;
      }

      if (transaction.type !== "deposit") {
        const error = new Error("La transacción no es un depósito");
        
        error.status = 400;
        throw error;
      }

      if (transaction.status === "cancelled") {
        await trx.commit();

        return {
          success: true,
          alreadyRejected: true,
          transaction,
        };
      }

      if (transaction.status !== "pending") {
        const error = new Error(`El depósito no puede rechazarse porque está en estado ${transaction.status}`);
        
        error.status = 409;
        throw error;
      }

      const transactionMetadata = metadata
        ? {
          ...(transaction.metadata ?? {}),
          ...metadata,
        }
        : transaction.metadata;

      const updatedTransaction = await strapi.db
        .query(TRANSACTION_UID)
        .update({
          where: {
            id: transaction.id,
          },
          data: {
            status: "cancelled",
            description: `${transaction.description ?? ""} | ${reason}`.trim(),
            metadata: transactionMetadata,
            by_user: userId ?? transaction.by_user,
          },
          transacting: trx,
        });

      await trx.commit();

      return {
        success: true,
        alreadyRejected: false,
        transaction: updatedTransaction,
      };

    } catch (error) {
      await trx.rollback();
      throw error;
    }
  },

  // =========================================================
  // CREATE ADJUSTMENT
  // =========================================================

  /**
   * Crea un ajuste manual de saldo.
   *
   * amount puede ser:
   *
   * +100  -> aumenta saldo
   * -100  -> disminuye saldo
   *
   * Siempre requiere una descripción.
   */
  async createAdjustment({
    storeId,
    amount,
    userId = null,
    description,
    metadata = {},
    externalReference = null,
    idempotencyKey = null,
  }) {
    if (!storeId) {
      const error = new Error("storeId es requerido");
      
      error.status = 400;
      throw error;
    }

    const adjustmentAmount = parseAmount(amount, "amount");

    if (adjustmentAmount === 0) {
      const error = new Error("El ajuste no puede ser cero");
      
      error.status = 400;
      throw error;
    }

    if (!description || !String(description).trim()) {
      const error = new Error("La descripción es obligatoria para realizar un ajuste");
      
      error.status = 400;
      throw error;
    }

    const trx = await strapi.db.connection.transaction();

    try {
      // -----------------------------------------------------
      // Idempotencia
      // -----------------------------------------------------

      if (idempotencyKey) {
        const existing = await strapi.db
          .query(TRANSACTION_UID)
          .findOne({
            where: {
              idempotencyKey,
            },
            transacting: trx,
          });

        if (existing) {
          await trx.commit();

          return {
            success: true,
            alreadyExists: true,
            transaction: existing,
            transactionId: existing.id,
          };
        }
      }

      // -----------------------------------------------------
      // Obtener balance
      // -----------------------------------------------------

      let balance = await strapi.db
        .query(BALANCE_UID)
        .findOne({
          where: {
            store: storeId,
          },
          transacting: trx,
        });

      if (!balance) {
        balance = await strapi.db
          .query(BALANCE_UID)
          .create({
            data: {
              store: storeId,
              availableBalance: 0,
              reservedBalance: 0,
              currency: "MXN",
              status: "active",
            },
            transacting: trx,
          });
      }

      if (balance.status !== "active") {
        const error = new Error("El saldo de logística está bloqueado");
        
        error.status = 409;
        throw error;
      }

      const availableBefore = Number(balance.availableBalance ?? 0);

      const availableAfter = availableBefore + adjustmentAmount;

      // -----------------------------------------------------
      // No permitir saldo disponible negativo
      // -----------------------------------------------------

      if (availableAfter < 0) {
        const error = new Error("El ajuste produciría un saldo disponible negativo");
        
        error.status = 400;
        throw error;
      }

      // -----------------------------------------------------
      // Actualización atómica
      // -----------------------------------------------------

      const updatedRows = adjustmentAmount > 0
        ? await trx(BALANCE_TABLE)
          .where({
            id: balance.id,
          })
          .update({
            available_balance: trx.raw("available_balance + ?", [adjustmentAmount]),
            last_transaction_at: new Date(),
          })
        : await trx(BALANCE_TABLE)
          .where({
            id: balance.id,
          })
          .where("available_balance", ">=", Math.abs(adjustmentAmount))
          .update({
            available_balance: trx.raw("available_balance - ?", [Math.abs(adjustmentAmount),]),
            last_transaction_at: new Date(),
          });

      if (updatedRows !== 1) {
        const error = new Error("No fue posible aplicar el ajuste al saldo");
        
        error.status = 409;
        throw error;
      }

      // -----------------------------------------------------
      // Crear transacción
      // -----------------------------------------------------

      const transaction = await strapi.db
        .query(TRANSACTION_UID)
        .create({
          data: {
            store: storeId,
            type: "adjustment",
            amount: adjustmentAmount,
            status: "completed",
            balanceBefore: availableBefore,
            balanceAfter: availableAfter,
            externalReference,
            idempotencyKey,
            description: String(description).trim(),
            metadata,
            by_user: userId,
            completedAt: new Date(),
            transactionReference: generateTransactionReference("adjustment"),
            reservationReference: null,
          },
          transacting: trx,
        });

      await trx.commit();

      return {
        success: true,
        alreadyExists: false,
        transaction,
        amount: adjustmentAmount,
        balanceBefore: availableBefore,
        balanceAfter: availableAfter,
      };

    } catch (error) {
      await trx.rollback();

      throw error;
    }
  },

  // =========================================================
  // GET BALANCE SUMMARY
  // =========================================================

  /**
   * Devuelve una vista resumida del saldo.
   */
  async getBalanceSummary(storeId) {
    const balance = await this.getBalance(storeId, { createIfMissing: true });

    const availableBalance = Number(balance.availableBalance ?? 0);

    const reservedBalance = Number(balance.reservedBalance ?? 0);

    return {
      id: balance.id,
      storeId,
      availableBalance,
      reservedBalance,
      totalBalance: availableBalance + reservedBalance,
      currency: balance.currency ?? "MXN",
      status: balance.status,
      lastTransactionAt: balance.lastTransactionAt,
    };
  },

  async reconcileShipmentCharge({
    shipmentId,
    orderId,
    externalReference = null,
    metadata = {},
  }) {
    if (!shipmentId) {
      throw new Error("shipmentId es requerido para reconciliar el cargo del envío");
    }

    if (!orderId) {
      throw new Error("orderId es requerido para reconciliar el cargo del envío");
    }

    // Buscar transacciones de envío asociadas al pedido.
    const transactions = await strapi.entityService.findMany(
      TRANSACTION_UID,
      {
        filters: {
          order: {
            id: orderId,
          },
          type: "shipment_charge",
        },
        sort: {
          createdAt: "desc",
        },
        limit: 10,
      }
    );

    if (!transactions || transactions.length === 0) {
      return {
        reconciled: false,
        reason: "no_transaction_found",
        transaction: null,
      };
    }

    // Primero buscamos una transacción que ya tenga
    // este shipment_id.
    const existingTransaction = transactions.find((transaction) => transaction.shipment === String(shipmentId));

    if (existingTransaction) {
      if (existingTransaction.status === "completed") {
        return {
          reconciled: false,
          alreadyCompleted: true,
          transaction: existingTransaction,
        };
      }

      if (existingTransaction.status === "pending") {
        const committed =
          await this.commitShipmentCharge({
            transactionId: existingTransaction.id,
            shipmentId: String(shipmentId),
            externalReference,
            metadata,
          });

        return {
          reconciled: true,
          transaction: committed?.transaction ??
            committed,
        };
      }
    }

    // Buscar una reserva pendiente sin shipment.
    const pendingTransaction =
      transactions.find(
        (transaction) =>
          transaction.status === "pending" &&
          !transaction.shipment
      );

    if (!pendingTransaction) {
      return {
        reconciled: false,
        reason: "no_pending_reservation",
        transaction: null,
      };
    }

    const mergedMetadata = {
      ...(pendingTransaction.metadata || {}),
      ...metadata,
      reconciliation: {
        reconciledAt: new Date().toISOString(),
        source: "getShipment",
        shipmentId: String(shipmentId),
      },
    };

    const committed =
      await this.commitShipmentCharge({
        transactionId: pendingTransaction.id,
        shipmentId: String(shipmentId),
        externalReference:
          externalReference ??
          String(shipmentId),
        metadata: mergedMetadata,
      });

    return {
      reconciled: true,
      transaction: committed?.transaction ??
        committed,
    };
  },
})
);