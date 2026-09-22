// Media/publication integrity: hash -> signature -> verifiable proof record (2.8).
// MVP signing binds hash + signer identity + timestamp using SHA-256 (no keypair yet).
// Swapping this for a real asymmetric signature later only means changing
// createProof()/verifyProof() below; callers (Feed, Media Service) never change.

export const HASH_ALGORITHM = "SHA-256";
export const SIGNATURE_ALGORITHM = "CIUDADAN-PROOF-V1";

const arrayBufferToHex = (buffer) =>
  Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

export const hashBlob = async (blob) => {
  const buffer = await blob.arrayBuffer();
  const digest = await window.crypto.subtle.digest("SHA-256", buffer);
  return arrayBufferToHex(digest);
};

export const hashText = async (value) => {
  const encoded = new TextEncoder().encode(value);
  const digest = await window.crypto.subtle.digest("SHA-256", encoded);
  return arrayBufferToHex(digest);
};

const buildSignaturePayload = ({
  hash,
  signatureAlgorithm,
  signerId,
  signedAt,
}) => `${signatureAlgorithm}:${hash}:${signerId}:${signedAt}`;

// file XOR text: hashes the original media bytes, or a canonical text payload (e.g. a publication).
export const createProof = async ({ file, text, signerId }) => {
  const hash = file ? await hashBlob(file) : await hashText(text || "");
  const signedAt = new Date().toISOString();
  const signature = await hashText(
    buildSignaturePayload({
      hash,
      signatureAlgorithm: SIGNATURE_ALGORITHM,
      signerId,
      signedAt,
    }),
  );

  return {
    hashAlgorithm: HASH_ALGORITHM,
    hash,
    signatureAlgorithm: SIGNATURE_ALGORITHM,
    signerId,
    signedAt,
    signature,
  };
};

// Recomputes the hash from the recovered bytes and checks it against the recorded proof.
export const verifyProof = async ({ file, text, proof }) => {
  if (!proof?.hash || !proof?.signature) {
    return { valid: false, reason: "missing_proof" };
  }

  const recomputedHash = file
    ? await hashBlob(file)
    : await hashText(text || "");
  if (recomputedHash !== proof.hash) {
    return { valid: false, reason: "hash_mismatch", recomputedHash };
  }

  const expectedSignature = await hashText(
    buildSignaturePayload({
      hash: proof.hash,
      signatureAlgorithm: proof.signatureAlgorithm,
      signerId: proof.signerId,
      signedAt: proof.signedAt,
    }),
  );

  if (expectedSignature !== proof.signature) {
    return { valid: false, reason: "signature_mismatch", recomputedHash };
  }

  return { valid: true, recomputedHash };
};
