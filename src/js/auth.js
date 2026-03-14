/**
 * ShopeeLink - Módulo de Autenticação
 */

export function getCredentials() {
    return {
        appId: localStorage.getItem('shopee_appid') || '',
        secret: localStorage.getItem('shopee_secret') || ''
    };
}

export function saveCredentials(appId, secret) {
    localStorage.setItem('shopee_appid', appId);
    localStorage.setItem('shopee_secret', secret);
}

export function clearCredentials() {
    localStorage.removeItem('shopee_appid');
    localStorage.removeItem('shopee_secret');
}

export function isAuthenticated() {
    const { appId, secret } = getCredentials();
    return !!(appId && secret);
}
