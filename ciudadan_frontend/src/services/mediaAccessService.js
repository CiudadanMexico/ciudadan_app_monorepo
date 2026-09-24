// "Visualización de medios" mediation layer (2.10/2.11): the Feed/UI never talks to a
// storage provider directly to fetch bytes for viewing/verification either — it goes
// through here, which is also where hash verification happens before anything is shown.
//
// MVP honesty note: without a Ciudadan backend proxy, only the owner's own browser
// session can fetch bytes from their connected provider. This module intentionally
// does NOT attempt to pull another user's Drive file client-side — doing so would
// require exposing the owner's access token to viewers, which is exactly what this
// mediation layer exists to prevent. A future backend endpoint that fetches on behalf
// of the owner and streams to the viewer can replace verifyProviderMediaCopy's
// transport below without changing this module's contract.

import { MediaStorageService } from "./mediaStorageService";
import { verifyProof } from "./mediaIntegrityService";
import { getLocalMediaCopy } from "./localMediaStore";

export const MEDIA_VERIFICATION_STATUS = {
  CHECKING: "checking",
  VERIFIED: "verified",
  MISMATCH: "mismatch",
  UNAVAILABLE: "unavailable",
  ERROR: "error",
};

// Zero network cost: reads the on-device blob (if any) and recomputes its hash.
// Safe to run automatically/silently, per 2.11.
export const verifyLocalMediaCopy = async ({ media }) => {
  if (!media?.localCopy?.available || !media?.localCopy?.key) {
    return { status: MEDIA_VERIFICATION_STATUS.UNAVAILABLE };
  }

  try {
    const record = await getLocalMediaCopy(media.localCopy.key);
    if (!record?.blob) {
      return { status: MEDIA_VERIFICATION_STATUS.UNAVAILABLE };
    }

    const result = await verifyProof({ file: record.blob, proof: media.proof });
    return {
      status: result.valid
        ? MEDIA_VERIFICATION_STATUS.VERIFIED
        : MEDIA_VERIFICATION_STATUS.MISMATCH,
      recomputedHash: result.recomputedHash,
    };
  } catch (error) {
    return { status: MEDIA_VERIFICATION_STATUS.ERROR };
  }
};

// Requires the owner's own access token for the provider that stores the file.
export const verifyProviderMediaCopy = async ({
  media,
  providerId,
  accessToken,
}) => {
  if (!media?.driveCopy?.available || !media?.driveCopy?.fileId) {
    return { status: MEDIA_VERIFICATION_STATUS.UNAVAILABLE };
  }

  if (!MediaStorageService.isImplemented(providerId)) {
    return { status: MEDIA_VERIFICATION_STATUS.UNAVAILABLE };
  }

  try {
    const blob = await MediaStorageService.downloadFile(providerId, {
      accessToken,
      remoteId: media.driveCopy.fileId,
    });

    const result = await verifyProof({ file: blob, proof: media.proof });
    return {
      status: result.valid
        ? MEDIA_VERIFICATION_STATUS.VERIFIED
        : MEDIA_VERIFICATION_STATUS.MISMATCH,
      recomputedHash: result.recomputedHash,
    };
  } catch (error) {
    return { status: MEDIA_VERIFICATION_STATUS.ERROR };
  }
};
