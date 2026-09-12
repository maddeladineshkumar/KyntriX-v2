/**
 * Universal Crypto Utilities for KyntriX
 * Works identically across Node.js, Web Browsers, and Web Workers without native dependencies.
 * Includes cryptographic SHA-256, HMAC-SHA256, CSPRNG random generation, and timing-safe JWT verification.
 */

function rotr(n: number, x: number): number {
  return (x >>> n) | (x << (32 - n));
}

function choose(x: number, y: number, z: number): number {
  return (x & y) ^ (~x & z);
}

function majority(x: number, y: number, z: number): number {
  return (x & y) ^ (x & z) ^ (y & z);
}

function sigma0(x: number): number {
  return rotr(2, x) ^ rotr(13, x) ^ rotr(22, x);
}

function sigma1(x: number): number {
  return rotr(6, x) ^ rotr(11, x) ^ rotr(25, x);
}

function gamma0(x: number): number {
  return rotr(7, x) ^ rotr(18, x) ^ (x >>> 3);
}

function gamma1(x: number): number {
  return rotr(17, x) ^ rotr(19, x) ^ (x >>> 10);
}

const K = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
];

export function sha256Bytes(input: string | Uint8Array): Uint8Array {
  const msg = typeof input === 'string' ? new TextEncoder().encode(input) : input;
  const msgLen = msg.length;

  const bitLen = msgLen * 8;
  const padLen = msgLen % 64 < 56 ? 56 - (msgLen % 64) : 120 - (msgLen % 64);
  const totalLen = msgLen + padLen + 8;
  const padded = new Uint8Array(totalLen);
  padded.set(msg);
  padded[msgLen] = 0x80;

  const view = new DataView(padded.buffer);
  view.setUint32(totalLen - 4, bitLen >>> 0);
  view.setUint32(totalLen - 8, Math.floor(bitLen / 0x100000000));

  let h0 = 0x6a09e667;
  let h1 = 0xbb67ae85;
  let h2 = 0x3c6ef372;
  let h3 = 0xa54ff53a;
  let h4 = 0x510e527f;
  let h5 = 0x9b05688c;
  let h6 = 0x1f83d9ab;
  let h7 = 0x5be0cd19;

  const w = new Uint32Array(64);

  for (let i = 0; i < totalLen; i += 64) {
    for (let t = 0; t < 16; t++) {
      w[t] = view.getUint32(i + t * 4);
    }
    for (let t = 16; t < 64; t++) {
      w[t] = (gamma1(w[t - 2]) + w[t - 7] + gamma0(w[t - 15]) + w[t - 16]) >>> 0;
    }

    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;
    let e = h4;
    let f = h5;
    let g = h6;
    let h = h7;

    for (let t = 0; t < 64; t++) {
      const t1 = (h + sigma1(e) + choose(e, f, g) + K[t] + w[t]) >>> 0;
      const t2 = (sigma0(a) + majority(a, b, c)) >>> 0;
      h = g;
      g = f;
      f = e;
      e = (d + t1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (t1 + t2) >>> 0;
    }

    h0 = (h0 + a) >>> 0;
    h1 = (h1 + b) >>> 0;
    h2 = (h2 + c) >>> 0;
    h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0;
    h5 = (h5 + f) >>> 0;
    h6 = (h6 + g) >>> 0;
    h7 = (h7 + h) >>> 0;
  }

  const out = new Uint8Array(32);
  const outView = new DataView(out.buffer);
  outView.setUint32(0, h0);
  outView.setUint32(4, h1);
  outView.setUint32(8, h2);
  outView.setUint32(12, h3);
  outView.setUint32(16, h4);
  outView.setUint32(20, h5);
  outView.setUint32(24, h6);
  outView.setUint32(28, h7);
  return out;
}

export function sha256(input: string | Uint8Array): string {
  const bytes = sha256Bytes(input);
  let hex = '';
  for (let i = 0; i < 32; i++) {
    hex += bytes[i].toString(16).padStart(2, '0');
  }
  return hex;
}

export function hmacSha256(message: string | Uint8Array, secret: string | Uint8Array): Uint8Array {
  const msgBytes = typeof message === 'string' ? new TextEncoder().encode(message) : message;
  let keyBytes = typeof secret === 'string' ? new TextEncoder().encode(secret) : secret;

  const blockSize = 64;
  if (keyBytes.length > blockSize) {
    keyBytes = sha256Bytes(keyBytes);
  }

  const paddedKey = new Uint8Array(blockSize);
  paddedKey.set(keyBytes);

  const oKeyPad = new Uint8Array(blockSize);
  const iKeyPad = new Uint8Array(blockSize);
  for (let i = 0; i < blockSize; i++) {
    oKeyPad[i] = paddedKey[i] ^ 0x5c;
    iKeyPad[i] = paddedKey[i] ^ 0x36;
  }

  const innerMsg = new Uint8Array(blockSize + msgBytes.length);
  innerMsg.set(iKeyPad, 0);
  innerMsg.set(msgBytes, blockSize);
  const innerHash = sha256Bytes(innerMsg);

  const outerMsg = new Uint8Array(blockSize + 32);
  outerMsg.set(oKeyPad, 0);
  outerMsg.set(innerHash, blockSize);
  return sha256Bytes(outerMsg);
}

export function base64UrlEncode(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) {
    bin += String.fromCharCode(bytes[i]);
  }
  const base64 = typeof btoa !== 'undefined'
    ? btoa(bin)
    : typeof Buffer !== 'undefined'
    ? Buffer.from(bin, 'binary').toString('base64')
    : '';
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4 !== 0) {
    base64 += '=';
  }
  if (typeof atob !== 'undefined') {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new TextDecoder().decode(bytes);
  }
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(base64, 'base64').toString('utf8');
  }
  return '';
}

export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export function randomBytesHex(length: number): string {
  if (typeof globalThis !== 'undefined' && globalThis.crypto?.getRandomValues) {
    const bytes = new Uint8Array(length);
    globalThis.crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  }
  try {
    // Dynamic node crypto require for non-browser runtimes
    const nodeCrypto = typeof require !== 'undefined' ? require('node:crypto') : null;
    if (nodeCrypto?.randomBytes) {
      return nodeCrypto.randomBytes(length).toString('hex');
    }
  } catch {
    // fallthrough
  }
  throw new Error('CSPRNG unavailable: Secure cryptographic random bytes could not be generated.');
}

export function hashPassword(password: string, salt: string): string {
  let hash = sha256(`${password}:${salt}`);
  for (let i = 0; i < 999; i++) {
    hash = sha256(`${hash}:${salt}`);
  }
  return hash;
}

export interface JwtVerificationResult {
  valid: boolean;
  payload?: any;
  error?: string;
}

export function verifyJwt(token: string, secret?: string): JwtVerificationResult {
  if (!token || typeof token !== 'string') {
    return { valid: false, error: 'Empty or non-string token.' };
  }

  const parts = token.split('.');
  if (parts.length !== 3) {
    return { valid: false, error: 'Malformed JWT structure: exactly 3 parts expected.' };
  }

  let header: any;
  let payload: any;
  try {
    header = JSON.parse(base64UrlDecode(parts[0]));
    payload = JSON.parse(base64UrlDecode(parts[1]));
  } catch {
    return { valid: false, error: 'Failed to decode JWT headers or payload.' };
  }

  if (header?.alg !== 'HS256') {
    return { valid: false, error: `Unsupported or missing JWT algorithm: ${header?.alg}. Only HS256 is accepted.` };
  }

  const nowSec = Math.floor(Date.now() / 1000);
  const CLOCK_SKEW_TOLERANCE_SEC = 10;

  if (typeof payload?.exp === 'number' && payload.exp < nowSec - CLOCK_SKEW_TOLERANCE_SEC) {
    return { valid: false, error: 'JWT token has expired.' };
  }

  if (typeof payload?.nbf === 'number' && payload.nbf > nowSec + CLOCK_SKEW_TOLERANCE_SEC) {
    return { valid: false, error: 'JWT token is not active yet (nbf claim in future).' };
  }

  const effectiveSecret = secret || (typeof process !== 'undefined' ? (process.env?.SUPABASE_JWT_SECRET || process.env?.JWT_SECRET) : undefined);
  if (!effectiveSecret) {
    return { valid: false, error: 'Server is missing SUPABASE_JWT_SECRET / JWT_SECRET environment configuration.' };
  }

  const dataToSign = `${parts[0]}.${parts[1]}`;
  const calculatedSigBytes = hmacSha256(dataToSign, effectiveSecret);
  const expectedSig = base64UrlEncode(calculatedSigBytes);
  if (!timingSafeEqual(parts[2], expectedSig)) {
    return { valid: false, error: 'Cryptographic signature verification failed.' };
  }

  return { valid: true, payload };
}
