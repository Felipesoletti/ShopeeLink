/**
 * ShopeeLink - Módulo de API
 */

const PROXY_URL = 'https://shopee-api-proxy.felipeoliveira2.workers.dev';

async function sha256(msg) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(msg));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function callShopeeAPI(appId, secret, query) {
    const timestamp = Math.floor(Date.now() / 1000);
    const payload = { query };
    const body = JSON.stringify(payload);
    
    // IMPORTANTE: A ordem dos parâmetros no hash deve ser exatamente como a API espera
    const sig = await sha256(`${appId}${timestamp}${body}${secret}`);
    
    const resp = await fetch(PROXY_URL, {
        method: 'POST',
        mode: 'cors',
        headers: { 
            'Content-Type': 'application/json', 
            'Authorization': `SHA256 Credential=${appId}, Timestamp=${timestamp}, Signature=${sig}` 
        },
        body
    });

    if (!resp.ok) {
        const errorText = await resp.text();
        throw new Error(`Erro HTTP ${resp.status}: ${errorText}`);
    }

    const data = await resp.json();
    if (data.errors) {
        throw new Error(data.errors[0]?.message || 'Erro na API da Shopee');
    }
    return data;
}

export { callShopeeAPI };
