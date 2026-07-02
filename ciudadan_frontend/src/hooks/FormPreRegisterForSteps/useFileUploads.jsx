import { useCallback, useState } from "react";
import { getStrapiFileId, uploadFilesToStrapi } from "@/utils/strapiHelpers.js";

const isMediaReference = (value) => Boolean(value?.id || value?.data?.id || value?.attributes?.url || value?.url);

const normalizeToArray = (value) => {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
};

export const useFileUploads = () => {
  const [uploading, setUploading] = useState(false);
  const [uploadErrors, setUploadErrors] = useState({});

  const uploadStepFiles = useCallback(async (fields, values) => {
    setUploading(true);
    setUploadErrors({});
    const mediaIds = {};

    try {
      for (const fieldName of fields) {
        const raw = values[fieldName];
        if (!raw) continue;

        const entries = normalizeToArray(raw);
        const existingIds = entries
          .filter((entry) => isMediaReference(entry))
          .map((entry) => getStrapiFileId(entry) || entry?.id)
          .filter(Boolean);

        const newFiles = entries.filter((entry) => entry instanceof File);
        if (!newFiles.length) {
          mediaIds[fieldName] = Array.isArray(raw) ? existingIds : existingIds[0] || null;
          continue;
        }

        const uploaded = await uploadFilesToStrapi(newFiles);
        const uploadedIds = uploaded.map((file) => file.id).filter(Boolean);
        const merged = [...new Set([...existingIds, ...uploadedIds])];
        mediaIds[fieldName] = Array.isArray(raw) ? merged : merged[0] || null;
      }

      return mediaIds;
    } catch (error) {
      setUploadErrors((prev) => ({ ...prev, global: error?.message || "No se pudieron subir algunos archivos." }));
      throw error;
    } finally {
      setUploading(false);
    }
  }, []);

  return {
    uploading,
    uploadErrors,
    uploadStepFiles,
  };
};
