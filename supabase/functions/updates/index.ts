// Expo Updates protocol v1 manifest endpoint (cloud). Phones ask here for the newest update for their runtime.
// Manifests are written by scripts/ship-cloud.mjs into public.ota_updates; bundles/assets live in the public
// 'updates' storage bucket, so this function only returns the stored manifest. Deployed with --no-verify-jwt
// (expo-updates doesn't send auth). GET .../updates            → manifest (multipart) or 204
//                                     GET .../updates/native-latest → { runtimeVersion, version, notes, apkUrl } or 404
import { createClient } from 'jsr:@supabase/supabase-js@2';

const PROTOCOL = { 'expo-protocol-version': '1', 'expo-sfv-version': '0', 'cache-control': 'private, max-age=0' };
const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });

const text = (status: number, body: string) => new Response(body, { status, headers: { ...PROTOCOL, 'content-type': 'text/plain' } });

Deno.serve(async (req) => {
  const url = new URL(req.url);
  if (req.method !== 'GET') return text(405, 'Use GET');

  if (url.pathname.endsWith('/native-latest')) {
    const { data } = await admin.from('app_config').select('value').eq('key', 'native_latest').maybeSingle();
    if (!data) return text(404, 'none');
    return new Response(data.value, { headers: { 'content-type': 'application/json', 'cache-control': 'no-cache' } });
  }

  if ((req.headers.get('expo-protocol-version') ?? url.searchParams.get('expo-protocol-version')) !== '1') return text(406, 'expo-protocol-version: 1 required');
  const platform = req.headers.get('expo-platform') ?? url.searchParams.get('platform');
  if (platform !== 'android' && platform !== 'ios') return text(400, 'expo-platform must be android or ios');
  const runtime = req.headers.get('expo-runtime-version') ?? url.searchParams.get('runtime-version');
  if (!runtime || !/^[A-Za-z0-9._-]{1,64}$/.test(runtime)) return text(400, 'expo-runtime-version required');

  const { data, error } = await admin
    .from('ota_updates')
    .select('manifest')
    .eq('runtime_version', runtime)
    .eq('platform', platform)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) return text(500, 'lookup failed');
  if (!data) return new Response(null, { status: 204, headers: PROTOCOL });

  const accept = (req.headers.get('accept') ?? '').toLowerCase();
  if (accept && !accept.includes('multipart/mixed') && !accept.includes('*/*')) {
    return new Response(JSON.stringify(data.manifest), { headers: { ...PROTOCOL, 'content-type': 'application/json' } });
  }
  const boundary = `prata-raja-${crypto.randomUUID()}`;
  const part = (name: string, body: unknown) =>
    `--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\nContent-Type: application/json\r\n\r\n${JSON.stringify(body)}\r\n`;
  const body = part('manifest', data.manifest) + part('extensions', { assetRequestHeaders: {} }) + `--${boundary}--\r\n`;
  return new Response(body, { headers: { ...PROTOCOL, 'content-type': `multipart/mixed; boundary=${boundary}` } });
});
