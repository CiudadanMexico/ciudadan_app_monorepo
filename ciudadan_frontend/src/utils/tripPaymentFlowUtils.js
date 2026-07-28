export const PAYMENT_STATES = {
  pending: 'pending',
  paid: 'paid',
  partial: 'partial',
  unpaid: 'unpaid',
};

export const getTripPaymentFlowState = ({ tripStatus, driverPaymentState, passengerPaymentState }) => {
  const normalizedTripStatus = String(tripStatus || '').toLowerCase();
  const isTripFinished = normalizedTripStatus === 'finished' || normalizedTripStatus === 'unpaid' || normalizedTripStatus === 'partial';

  const driverPayment = driverPaymentState || PAYMENT_STATES.pending;
  const passengerPayment = passengerPaymentState || PAYMENT_STATES.pending;

  console.log('[getTripPaymentFlowState] tripStatus', isTripFinished, 'driverPayment', driverPayment);

  const isPaymentFlowActive = isTripFinished;
  const showDriverPaymentOptions = isPaymentFlowActive && driverPayment === PAYMENT_STATES.pending;
  const showPassengerConfirmationOptions = isPaymentFlowActive && [PAYMENT_STATES.partial, PAYMENT_STATES.unpaid].includes(driverPayment);
  const showPassengerAmount = isPaymentFlowActive && !showPassengerConfirmationOptions;
  const shouldOpenRatingModal = isPaymentFlowActive && driverPayment === PAYMENT_STATES.paid && passengerPayment === PAYMENT_STATES.paid;

  return {
    isPaymentFlowActive,
    showDriverPaymentOptions,
    showPassengerAmount,
    showPassengerConfirmationOptions,
    shouldOpenRatingModal,
  };
};
