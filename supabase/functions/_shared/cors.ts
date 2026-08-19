// Shared CORS headers for every edge function in this project. Kept in one place so a change
// (e.g. locking Access-Control-Allow-Origin down to a real domain before shipping publicly)
// only has to happen once.

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
