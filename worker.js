// ============================================================
// SHOPEE AFILIADOS — PROXY (Cloudflare Worker)
// Deploy gratuito em: https://workers.cloudflare.com
// ============================================================

const SHOPEE_API = "https://open-api.affiliate.shopee.com.br/graphql";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export default {
  async fetch(request) {

    // Preflight CORS
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS });
    }

    if (request.method !== "POST") {
      return new Response("Método não permitido", { status: 405, headers: CORS });
    }

    try {
      const body = await request.text();
      const authHeader = request.headers.get("Authorization") || "";

      // Repassa para a API real da Shopee
      const resp = await fetch(SHOPEE_API, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": authHeader,
        },
        body,
      });

      const data = await resp.text();

      return new Response(data, {
        status: resp.status,
        headers: {
          "Content-Type": "application/json",
          ...CORS,
        },
      });

    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...CORS },
      });
    }
  },
};
