import { useCallback, useMemo, useState } from "react";
import { sanitizeValuesForLocal } from "../../services/FormPreRegisterForSteps/driverPayloadMappers";

const STORAGE_KEY = "preregistro_conductor_draft_v1";

export const useDraftPersistence = () => {
  const [saveStatus, setSaveStatus] = useState("idle");
  const [saveMessage, setSaveMessage] = useState("");

  const readLocalDraft = useCallback(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }, []);

  const persistLocalDraft = useCallback((snapshot) => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          ...snapshot,
          updatedAt: new Date().toISOString(),
        })
      );
    } catch {
      // no-op: no queremos bloquear flujo de guardado por storage.
    }
  }, []);

  const clearLocalDraft = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // no-op
    }
  }, []);

  const saveSnapshot = useCallback(
    ({ driverId, currentStep, values }) => {
      console.log("saveSnapshot", { driverId, currentStep, values });
      persistLocalDraft({
        driverId,
        currentStep,
        values: sanitizeValuesForLocal(values),
      });
    },
    [persistLocalDraft]
  );

  const statusProps = useMemo(
    () => ({
      saveStatus,
      saveMessage,
      setSaveStatus,
      setSaveMessage,
    }),
    [saveStatus, saveMessage]
  );

  return {
    ...statusProps,
    readLocalDraft,
    saveSnapshot,
    clearLocalDraft,
  };
};
