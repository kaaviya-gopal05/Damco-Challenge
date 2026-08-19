// Shared helper for authenticating the caller of an edge function the same way ai-complete does:
// forward the caller's own JWT into a Supabase client scoped to their session, so every query
// made with it is still governed by RLS — no service-role key is ever used here.

import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

export interface AuthedRequest {
  supabase: SupabaseClient;
  userId: string;
}

export async function requireAuthedUser(req: Request): Promise<AuthedRequest | { error: string; status: number }> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return { error: 'Missing Authorization header.', status: 401 };
  }

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
  });

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) {
    return { error: 'Not authenticated.', status: 401 };
  }

  return { supabase, userId: user.id };
}
