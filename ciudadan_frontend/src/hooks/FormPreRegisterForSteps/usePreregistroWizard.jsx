import { useEffect, useMemo, useState } from "react";
import {
  STEP_ORDER_WITH_ACCOUNT,
  STEP_ORDER_WITHOUT_ACCOUNT,
  WIZARD_STEPS,
} from "../../utils/preRegisterForSteps/stepsConfig";

export const usePreregistroWizard = ({ needsAccount = false, stepOrderOverride = null }) => {
  const stepOrder = useMemo(() => {
    if (Array.isArray(stepOrderOverride) && stepOrderOverride.length) return stepOrderOverride;
    return needsAccount ? STEP_ORDER_WITH_ACCOUNT : STEP_ORDER_WITHOUT_ACCOUNT;
  }, [needsAccount, stepOrderOverride]);

  const [currentStepId, setCurrentStepId] = useState("bienvenida");

  const currentIndex = stepOrder.indexOf(currentStepId);
  const safeCurrentIndex = Math.max(currentIndex, 0);
  const currentStep = WIZARD_STEPS.find((step) => step.id === currentStepId) || WIZARD_STEPS[0];

  useEffect(() => {
    if (stepOrder.length && !stepOrder.includes(currentStepId)) {
      setCurrentStepId(stepOrder[0]);
    }
  }, [currentStepId, stepOrder]);

  const canGoBack = safeCurrentIndex > 0;
  const isLastStep = safeCurrentIndex >= stepOrder.length - 1;

  const goNext = () => {
    if (isLastStep) return;
    setCurrentStepId(stepOrder[safeCurrentIndex + 1]);
  };

  const goBack = () => {
    if (!canGoBack) return;
    setCurrentStepId(stepOrder[safeCurrentIndex - 1]);
  };

  const goTo = (stepId) => {
    if (!stepOrder.includes(stepId)) return;
    setCurrentStepId(stepId);
  };

  const progress = Math.max(0, Math.round(((safeCurrentIndex + 1) / stepOrder.length) * 100));

  return {
    stepOrder,
    currentStep,
    currentStepId,
    currentIndex: safeCurrentIndex,
    progress,
    canGoBack,
    isLastStep,
    goNext,
    goBack,
    goTo,
    setCurrentStepId,
  };
};
