import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper to convert to proper ArrayBuffer
function toArrayBuffer(data: Uint8Array): ArrayBuffer {
  return data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer;
}

// Helper functions for Web Push encryption
function base64UrlDecode(str: string): Uint8Array {
  const padding = '='.repeat((4 - (str.length % 4)) % 4);
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/') + padding;
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function base64UrlEncode(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function concatBuffers(...buffers: (Uint8Array | ArrayBuffer)[]): Uint8Array {
  const arrays = buffers.map(b => b instanceof Uint8Array ? b : new Uint8Array(b));
  const totalLength = arrays.reduce((sum, arr) => sum + arr.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }
  return result;
}

async function hkdfExtract(salt: Uint8Array, ikm: Uint8Array): Promise<ArrayBuffer> {
  const key = await crypto.subtle.importKey(
    'raw',
    toArrayBuffer(salt),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  return crypto.subtle.sign('HMAC', key, toArrayBuffer(ikm));
}

async function hkdfExpand(prk: ArrayBuffer, info: Uint8Array, length: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    'raw',
    prk,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const infoWithCounter = concatBuffers(info, new Uint8Array([1]));
  const okm = await crypto.subtle.sign('HMAC', key, toArrayBuffer(infoWithCounter));
  return new Uint8Array(okm).slice(0, length);
}

function derToRaw(signature: Uint8Array): Uint8Array {
  if (signature.length === 64) return signature;
  
  let offset = 2;
  const rLength = signature[offset + 1];
  offset += 2;
  let r = signature.slice(offset, offset + rLength);
  offset += rLength + 1;
  const sLength = signature[offset];
  offset += 1;
  let s = signature.slice(offset, offset + sLength);
  
  if (r.length > 32) r = r.slice(r.length - 32);
  if (s.length > 32) s = s.slice(s.length - 32);
  
  const raw = new Uint8Array(64);
  raw.set(r, 32 - r.length);
  raw.set(s, 64 - s.length);
  return raw;
}

async function createVapidJwt(
  endpoint: string,
  vapidPublicKey: string,
  vapidPrivateKey: string
): Promise<string> {
  const url = new URL(endpoint);
  const audience = `${url.protocol}//${url.host}`;
  
  const header = { typ: 'JWT', alg: 'ES256' };
  const payload = {
    aud: audience,
    exp: Math.floor(Date.now() / 1000) + 86400,
    sub: 'mailto:alerts@bytrader.lovable.app',
  };
  
  const headerB64 = base64UrlEncode(new TextEncoder().encode(JSON.stringify(header)));
  const payloadB64 = base64UrlEncode(new TextEncoder().encode(JSON.stringify(payload)));
  const unsignedToken = `${headerB64}.${payloadB64}`;
  
  // Decode the private key (it's base64url encoded raw 32-byte key)
  const privateKeyBytes = base64UrlDecode(vapidPrivateKey);
  
  // Decode public key
  const publicKeyBytes = base64UrlDecode(vapidPublicKey);
  
  // Convert raw private key to JWK format for import
  const jwk = {
    kty: 'EC',
    crv: 'P-256',
    x: base64UrlEncode(publicKeyBytes.slice(1, 33)),
    y: base64UrlEncode(publicKeyBytes.slice(33, 65)),
    d: base64UrlEncode(privateKeyBytes),
  };
  
  const privateKey = await crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );
  
  const signatureData = new TextEncoder().encode(unsignedToken);
  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    privateKey,
    toArrayBuffer(signatureData)
  );
  
  const signatureB64 = base64UrlEncode(derToRaw(new Uint8Array(signature)));
  return `${unsignedToken}.${signatureB64}`;
}

async function encryptPayload(
  payload: string,
  p256dh: string,
  auth: string
): Promise<Uint8Array> {
  const encoder = new TextEncoder();
  
  // Generate ephemeral ECDH key pair
  const localKeyPair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveBits']
  );
  
  // Import subscriber's public key
  const subscriberKeyBytes = base64UrlDecode(p256dh);
  const subscriberPublicKey = await crypto.subtle.importKey(
    'raw',
    toArrayBuffer(subscriberKeyBytes),
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    []
  );
  
  // Derive shared secret
  const sharedSecret = await crypto.subtle.deriveBits(
    { name: 'ECDH', public: subscriberPublicKey },
    localKeyPair.privateKey,
    256
  );
  
  // Export local public key
  const localPublicKeyRaw = await crypto.subtle.exportKey('raw', localKeyPair.publicKey);
  const localPublicKey = new Uint8Array(localPublicKeyRaw);
  
  // Get auth secret
  const authSecret = base64UrlDecode(auth);
  
  // Generate salt
  const salt = crypto.getRandomValues(new Uint8Array(16));
  
  // HKDF for key derivation
  const prk = await hkdfExtract(authSecret, new Uint8Array(sharedSecret));
  const keyInfo = concatBuffers(
    encoder.encode('WebPush: info\0'),
    subscriberKeyBytes,
    localPublicKey
  );
  const ikm = await hkdfExpand(prk, keyInfo, 32);
  
  const prkKey = await hkdfExtract(salt, ikm);
  const contentEncryptionKeyInfo = encoder.encode('Content-Encoding: aes128gcm\0');
  const contentEncryptionKey = await hkdfExpand(prkKey, contentEncryptionKeyInfo, 16);
  
  const nonceInfo = encoder.encode('Content-Encoding: nonce\0');
  const nonce = await hkdfExpand(prkKey, nonceInfo, 12);
  
  // Encrypt payload with padding
  const payloadBytes = encoder.encode(payload);
  const paddedPayload = new Uint8Array(payloadBytes.length + 2);
  paddedPayload.set(payloadBytes);
  paddedPayload[payloadBytes.length] = 2; // Padding delimiter
  
  const aesKey = await crypto.subtle.importKey(
    'raw',
    toArrayBuffer(contentEncryptionKey),
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  );
  
  const encryptedPayload = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: toArrayBuffer(nonce) },
    aesKey,
    toArrayBuffer(paddedPayload)
  );
  
  // Build aes128gcm body
  const recordSize = new Uint8Array(4);
  new DataView(recordSize.buffer).setUint32(0, 4096, false);
  
  return concatBuffers(
    salt,
    recordSize,
    new Uint8Array([65]), // Key length
    localPublicKey,
    new Uint8Array(encryptedPayload)
  );
}

async function sendWebPush(
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
  payload: string,
  vapidPublicKey: string,
  vapidPrivateKey: string
): Promise<Response> {
  const encrypted = await encryptPayload(
    payload,
    subscription.keys.p256dh,
    subscription.keys.auth
  );
  
  const vapidJwt = await createVapidJwt(subscription.endpoint, vapidPublicKey, vapidPrivateKey);
  
  return fetch(subscription.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Encoding': 'aes128gcm',
      'TTL': '86400',
      'Authorization': `vapid t=${vapidJwt}, k=${vapidPublicKey}`,
    },
    body: toArrayBuffer(encrypted),
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY')!;
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')!;

    if (!vapidPublicKey || !vapidPrivateKey) {
      console.error('VAPID keys not configured');
      return new Response(
        JSON.stringify({ error: 'VAPID keys not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { userId, title, body, tag, alertId, url } = await req.json();

    if (!userId || !title || !body) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: userId, title, body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all push subscriptions for this user
    const { data: subscriptions, error: subError } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', userId);

    if (subError) {
      console.error('Error fetching subscriptions:', subError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch subscriptions' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log('No push subscriptions found for user:', userId);
      return new Response(
        JSON.stringify({ success: true, message: 'No subscriptions found', sent: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Sending push to ${subscriptions.length} subscription(s) for user ${userId}`);

    const pushPayload = JSON.stringify({
      title,
      body,
      tag: tag || 'price-alert',
      alertId,
      url: url || '/alerts',
    });

    let successCount = 0;
    let failCount = 0;
    const expiredEndpoints: string[] = [];

    for (const sub of subscriptions) {
      try {
        const response = await sendWebPush(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          pushPayload,
          vapidPublicKey,
          vapidPrivateKey
        );

        if (response.ok) {
          successCount++;
          console.log('Push sent successfully to:', sub.endpoint.substring(0, 50));
        } else if (response.status === 404 || response.status === 410) {
          console.log('Subscription expired:', sub.endpoint.substring(0, 50));
          expiredEndpoints.push(sub.endpoint);
          failCount++;
        } else {
          const errorText = await response.text();
          console.error('Push failed:', response.status, errorText);
          failCount++;
        }
      } catch (error) {
        console.error('Error sending push:', error);
        failCount++;
      }
    }

    // Clean up expired subscriptions
    if (expiredEndpoints.length > 0) {
      const { error: deleteError } = await supabase
        .from('push_subscriptions')
        .delete()
        .in('endpoint', expiredEndpoints);
      
      if (deleteError) {
        console.error('Error cleaning up expired subscriptions:', deleteError);
      } else {
        console.log(`Cleaned up ${expiredEndpoints.length} expired subscription(s)`);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        sent: successCount, 
        failed: failCount,
        cleaned: expiredEndpoints.length 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Error in send-push-notification:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
