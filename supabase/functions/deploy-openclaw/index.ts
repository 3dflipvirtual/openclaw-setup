import "jsr:@supabase/functions-js/edge-runtime.d.ts";

/**
 * This function is deprecated. The SaaS uses an always-on VPS (Oracle Cloud VM)
 * and calls OPENCLAW_VPS_URL for agent create/configure/delete.
 * See docs/VPS-API.md.
 */
Deno.serve(() => {
  return new Response(
    JSON.stringify({
      error: "Deploy via Cloudflare Workers is deprecated. Use OPENCLAW_VPS_URL for the always-on server.",
    }),
    {
      status: 410,
      headers: { "Content-Type": "application/json" },
    }
  );
});
