import { execFileSync } from 'child_process';
import { createPrivateKey, sign } from 'crypto';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  AppleJwsError,
  APPLE_ROOT_CA_G3_PEM,
  appAccountTokenFor,
  decideAppleEntitlement,
  verifyAppleJws,
  type AppleTransaction,
} from '@/lib/apple-iap';
import { IOS_BUNDLE_ID, IOS_PRO_MONTHLY } from '@/lib/native/iap';

/**
 * Builds a throwaway root -> intermediate -> leaf chain with openssl (test-only, never committed),
 * carrying Apple's marker OIDs, so the real verification path is exercised end to end.
 */
let dir = '';
let chain: { root: string; int: string; leaf: string; leafKey: string; plainLeaf: string; plainLeafKey: string } | null = null;

function ossl(args: string[]) {
  execFileSync('openssl', args, { cwd: dir, stdio: 'pipe' });
}

function hasOpenssl() {
  try { execFileSync('openssl', ['version'], { stdio: 'pipe' }); return true; } catch { return false; }
}

beforeAll(() => {
  if (!hasOpenssl()) return;
  dir = mkdtempSync(join(tmpdir(), 'il-apple-'));
  for (const k of ['root', 'int', 'leaf', 'plain']) ossl(['ecparam', '-name', 'prime256v1', '-genkey', '-noout', '-out', `${k}.key`]);
  ossl(['req', '-x509', '-new', '-key', 'root.key', '-sha256', '-days', '3650', '-subj', '/CN=Test Root', '-addext', 'basicConstraints=critical,CA:TRUE', '-addext', 'keyUsage=critical,keyCertSign,cRLSign', '-out', 'root.pem']);
  writeFileSync(join(dir, 'int.ext'), 'basicConstraints=critical,CA:TRUE,pathlen:0\nkeyUsage=critical,keyCertSign,cRLSign\n1.2.840.113635.100.6.2.1=ASN1:NULL\n');
  writeFileSync(join(dir, 'leaf.ext'), 'basicConstraints=critical,CA:FALSE\nkeyUsage=critical,digitalSignature\n1.2.840.113635.100.6.11.1=ASN1:NULL\n');
  writeFileSync(join(dir, 'plain.ext'), 'basicConstraints=critical,CA:FALSE\nkeyUsage=critical,digitalSignature\n');
  ossl(['req', '-new', '-key', 'int.key', '-subj', '/CN=Test Intermediate', '-out', 'int.csr']);
  ossl(['x509', '-req', '-in', 'int.csr', '-CA', 'root.pem', '-CAkey', 'root.key', '-CAcreateserial', '-sha256', '-days', '3650', '-extfile', 'int.ext', '-out', 'int.pem']);
  for (const [name, ext] of [['leaf', 'leaf.ext'], ['plain', 'plain.ext']]) {
    ossl(['req', '-new', '-key', `${name}.key`, '-subj', `/CN=Test ${name}`, '-out', `${name}.csr`]);
    ossl(['x509', '-req', '-in', `${name}.csr`, '-CA', 'int.pem', '-CAkey', 'int.key', '-CAcreateserial', '-sha256', '-days', '3650', '-extfile', ext, '-out', `${name}.pem`]);
  }
  const read = (f: string) => readFileSync(join(dir, f), 'utf8');
  chain = { root: read('root.pem'), int: read('int.pem'), leaf: read('leaf.pem'), leafKey: read('leaf.key'), plainLeaf: read('plain.pem'), plainLeafKey: read('plain.key') };
});

afterAll(() => {
  if (dir) rmSync(dir, { recursive: true, force: true });
});

const der = (pem: string) => pem.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');

function makeJws(payload: object, opts: { leaf?: string; key?: string; root?: string } = {}) {
  const c = chain!;
  const header = { alg: 'ES256', x5c: [der(opts.leaf ?? c.leaf), der(c.int), der(opts.root ?? c.root)] };
  const h = Buffer.from(JSON.stringify(header)).toString('base64url');
  const p = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = sign('sha256', Buffer.from(`${h}.${p}`), { key: createPrivateKey(opts.key ?? c.leafKey), dsaEncoding: 'ieee-p1363' });
  return `${h}.${p}.${sig.toString('base64url')}`;
}

const tx: AppleTransaction = {
  transactionId: '2000000123',
  originalTransactionId: '2000000100',
  bundleId: IOS_BUNDLE_ID,
  productId: IOS_PRO_MONTHLY,
  expiresDate: Date.parse('2030-01-01T00:00:00Z'),
  environment: 'Sandbox',
};

describe.skipIf(!hasOpenssl())('verifyAppleJws', () => {
  it('accepts a correctly signed JWS rooted at the trusted root', () => {
    const out = verifyAppleJws<AppleTransaction>(makeJws(tx), { rootPem: chain!.root });
    expect(out.originalTransactionId).toBe('2000000100');
  });

  it('rejects a tampered payload', () => {
    const [h, , s] = makeJws(tx).split('.');
    const forged = Buffer.from(JSON.stringify({ ...tx, expiresDate: Date.parse('2099-01-01') })).toString('base64url');
    expect(() => verifyAppleJws(`${h}.${forged}.${s}`, { rootPem: chain!.root })).toThrow(AppleJwsError);
  });

  it('rejects chains that are not rooted at Apple Root CA - G3 by default', () => {
    expect(() => verifyAppleJws(makeJws(tx))).toThrow(/trusted Apple root/);
  });

  it('rejects a leaf without the App Store marker OID', () => {
    const jws = makeJws(tx, { leaf: chain!.plainLeaf, key: chain!.plainLeafKey });
    expect(() => verifyAppleJws(jws, { rootPem: chain!.root })).toThrow(/App Store signing/);
  });

  it('rejects a signature from a key that does not match the leaf', () => {
    const jws = makeJws(tx, { key: chain!.plainLeafKey });
    expect(() => verifyAppleJws(jws, { rootPem: chain!.root })).toThrow(/signature/);
  });

  it('rejects malformed input and non-ES256 headers', () => {
    expect(() => verifyAppleJws('nope')).toThrow(AppleJwsError);
    const h = Buffer.from(JSON.stringify({ alg: 'none' })).toString('base64url');
    expect(() => verifyAppleJws(`${h}.e30.`)).toThrow(/algorithm/);
  });
});

describe('Apple root pin', () => {
  it('embeds Apple Root CA - G3', async () => {
    const { X509Certificate, createHash } = await import('crypto');
    const cert = new X509Certificate(APPLE_ROOT_CA_G3_PEM);
    expect(cert.subject).toContain('Apple Root CA - G3');
    expect(createHash('sha256').update(cert.raw).digest('hex').toUpperCase()).toBe('63343ABFB89A6A03EBB57E9B3F5FA7BE7C4F5C756F3017B3A8C488C3653E9179');
  });
});

describe('decideAppleEntitlement', () => {
  const now = new Date('2026-11-23T12:00:00Z');
  it('is active before expiry', () => {
    expect(decideAppleEntitlement(tx, now).status).toBe('active');
  });
  it('is expired after expiry and revoked on refund', () => {
    expect(decideAppleEntitlement({ ...tx, expiresDate: Date.parse('2026-11-01') }, now).status).toBe('expired');
    expect(decideAppleEntitlement({ ...tx, revocationDate: Date.parse('2026-11-20') }, now).status).toBe('revoked');
  });
  it('refuses other apps and unknown products', () => {
    expect(() => decideAppleEntitlement({ ...tx, bundleId: 'com.example.other' }, now)).toThrow(AppleJwsError);
    expect(() => decideAppleEntitlement({ ...tx, productId: 'com.colecollins.invoicelab.lifetime' }, now)).toThrow(AppleJwsError);
  });
});

describe('appAccountTokenFor', () => {
  it('is a stable RFC 4122 UUID per account', () => {
    const a = appAccountTokenFor('user_1');
    expect(a).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(appAccountTokenFor('user_1')).toBe(a);
    expect(appAccountTokenFor('user_2')).not.toBe(a);
  });
});
