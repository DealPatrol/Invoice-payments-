import { createHash, verify as verifySignature, X509Certificate } from 'crypto';
import { IOS_BUNDLE_ID, isIosProProduct } from './native/iap';

/**
 * App Store (StoreKit 2) signed-data verification, no third-party SDK.
 *
 * StoreKit 2 transactions and App Store Server Notifications V2 are JWS (ES256) whose `x5c`
 * header carries the leaf + Apple WWDR intermediate + Apple Root CA - G3. We check that the chain
 * ends at the pinned Apple root, that each certificate signed the next, that the leaf and
 * intermediate carry Apple's marker OIDs, and that the leaf signed the payload.
 */

/** Apple Root CA - G3 (https://www.apple.com/certificateauthority/AppleRootCA-G3.cer), SHA-256 63:34:3A:BF:...:91:79. */
export const APPLE_ROOT_CA_G3_PEM = `-----BEGIN CERTIFICATE-----
MIICQzCCAcmgAwIBAgIILcX8iNLFS5UwCgYIKoZIzj0EAwMwZzEbMBkGA1UEAwwS
QXBwbGUgUm9vdCBDQSAtIEczMSYwJAYDVQQLDB1BcHBsZSBDZXJ0aWZpY2F0aW9u
IEF1dGhvcml0eTETMBEGA1UECgwKQXBwbGUgSW5jLjELMAkGA1UEBhMCVVMwHhcN
MTQwNDMwMTgxOTA2WhcNMzkwNDMwMTgxOTA2WjBnMRswGQYDVQQDDBJBcHBsZSBS
b290IENBIC0gRzMxJjAkBgNVBAsMHUFwcGxlIENlcnRpZmljYXRpb24gQXV0aG9y
aXR5MRMwEQYDVQQKDApBcHBsZSBJbmMuMQswCQYDVQQGEwJVUzB2MBAGByqGSM49
AgEGBSuBBAAiA2IABJjpLz1AcqTtkyJygRMc3RCV8cWjTnHcFBbZDuWmBSp3ZHtf
TjjTuxxEtX/1H7YyYl3J6YRbTzBPEVoA/VhYDKX1DyxNB0cTddqXl5dvMVztK517
IDvYuVTZXpmkOlEKMaNCMEAwHQYDVR0OBBYEFLuw3qFYM4iapIqZ3r6966/ayySr
MA8GA1UdEwEB/wQFMAMBAf8wDgYDVR0PAQH/BAQDAgEGMAoGCCqGSM49BAMDA2gA
MGUCMQCD6cHEFl4aXTQY2e3v9GwOAEZLuN+yRhHFD/3meoyhpmvOwgPUnPWTxnS4
at+qIxUCMG1mihDK1A3UT82NQz60imOlM27jbdoXt2QfyFMm+YhidDkLF1vLUagM
6BgD56KyKA==
-----END CERTIFICATE-----`;

// DER-encoded marker OIDs: 1.2.840.113635.100.6.11.1 (App Store receipt signing leaf)
// and 1.2.840.113635.100.6.2.1 (Apple WWDR intermediate).
const LEAF_OID = Buffer.from('060a2a864886f76364060b01', 'hex');
const INTERMEDIATE_OID = Buffer.from('060a2a864886f76364060201', 'hex');

export class AppleJwsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AppleJwsError';
  }
}

function b64urlJson<T>(part: string): T {
  try {
    return JSON.parse(Buffer.from(part, 'base64url').toString('utf8')) as T;
  } catch {
    throw new AppleJwsError('Malformed JWS');
  }
}

function withinValidity(cert: X509Certificate, at: Date): boolean {
  return new Date(cert.validFrom) <= at && at <= new Date(cert.validTo);
}

export interface VerifyOptions {
  /** Trusted root (PEM). Defaults to Apple Root CA - G3; tests inject their own. */
  rootPem?: string;
  /** Time used for certificate validity. Defaults to now. */
  now?: Date;
  /** Require Apple's marker OIDs on leaf / intermediate. Default true. */
  requireAppleOids?: boolean;
}

/** Verifies an Apple-signed JWS and returns its decoded payload. Throws AppleJwsError. */
export function verifyAppleJws<T>(jws: string, options: VerifyOptions = {}): T {
  if (typeof jws !== 'string') throw new AppleJwsError('Missing JWS');
  const parts = jws.split('.');
  if (parts.length !== 3) throw new AppleJwsError('Malformed JWS');
  const header = b64urlJson<{ alg?: string; x5c?: string[] }>(parts[0]);
  if (header.alg !== 'ES256') throw new AppleJwsError('Unexpected JWS algorithm');
  if (!Array.isArray(header.x5c) || header.x5c.length < 3) throw new AppleJwsError('Missing certificate chain');

  let leaf: X509Certificate, intermediate: X509Certificate, root: X509Certificate, trusted: X509Certificate;
  try {
    [leaf, intermediate, root] = header.x5c.slice(0, 3).map((der) => new X509Certificate(Buffer.from(der, 'base64')));
    trusted = new X509Certificate(options.rootPem ?? APPLE_ROOT_CA_G3_PEM);
  } catch {
    throw new AppleJwsError('Unreadable certificate chain');
  }
  if (!root.raw.equals(trusted.raw)) throw new AppleJwsError('Chain is not rooted at the trusted Apple root');
  if (!intermediate.checkIssued(root) || !intermediate.verify(root.publicKey)) throw new AppleJwsError('Intermediate not signed by root');
  if (!leaf.checkIssued(intermediate) || !leaf.verify(intermediate.publicKey)) throw new AppleJwsError('Leaf not signed by intermediate');
  const at = options.now ?? new Date();
  if (![leaf, intermediate, root].every((c) => withinValidity(c, at))) throw new AppleJwsError('Certificate expired or not yet valid');
  if (options.requireAppleOids !== false) {
    if (!leaf.raw.includes(LEAF_OID)) throw new AppleJwsError('Leaf is not an App Store signing certificate');
    if (!intermediate.raw.includes(INTERMEDIATE_OID)) throw new AppleJwsError('Intermediate is not Apple WWDR');
  }
  const ok = verifySignature(
    'sha256',
    Buffer.from(`${parts[0]}.${parts[1]}`),
    { key: leaf.publicKey, dsaEncoding: 'ieee-p1363' },
    Buffer.from(parts[2], 'base64url'),
  );
  if (!ok) throw new AppleJwsError('Bad JWS signature');
  return b64urlJson<T>(parts[1]);
}

/** Decoded JWSTransactionDecodedPayload (fields we use). Dates are epoch milliseconds. */
export interface AppleTransaction {
  transactionId: string;
  originalTransactionId: string;
  bundleId: string;
  productId: string;
  purchaseDate?: number;
  expiresDate?: number;
  revocationDate?: number;
  appAccountToken?: string;
  environment?: 'Sandbox' | 'Production' | 'Xcode' | string;
  type?: string;
  offerType?: number;
}

export type AppleEntitlementStatus = 'active' | 'expired' | 'revoked';

export interface AppleEntitlementDecision {
  status: AppleEntitlementStatus;
  expiresAt: Date | null;
}

/** Pure rule: what a verified transaction means for the account right now. */
export function decideAppleEntitlement(tx: AppleTransaction, now: Date = new Date()): AppleEntitlementDecision {
  if (tx.bundleId !== IOS_BUNDLE_ID) throw new AppleJwsError('Transaction is for a different app');
  if (!isIosProProduct(tx.productId)) throw new AppleJwsError('Unknown product');
  const expiresAt = typeof tx.expiresDate === 'number' ? new Date(tx.expiresDate) : null;
  if (tx.revocationDate) return { status: 'revoked', expiresAt };
  if (!expiresAt || expiresAt <= now) return { status: 'expired', expiresAt };
  return { status: 'active', expiresAt };
}

/**
 * Stable UUID passed to StoreKit as `appAccountToken`, so a transaction can be tied back to the
 * Invoice Jot account that bought it (and refused for any other account).
 */
export function appAccountTokenFor(userId: string): string {
  const h = createHash('sha256').update(`invoicelab:${userId}`).digest();
  h[6] = (h[6] & 0x0f) | 0x50; // version 5-style
  h[8] = (h[8] & 0x3f) | 0x80; // RFC 4122 variant
  const hex = h.subarray(0, 16).toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

/** App Store Server Notification V2 payload (fields we use). */
export interface AppleNotificationPayload {
  notificationType: string;
  subtype?: string;
  notificationUUID?: string;
  data?: { bundleId?: string; environment?: string; signedTransactionInfo?: string };
}
