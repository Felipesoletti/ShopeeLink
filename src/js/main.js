/**
 * ShopeeLink - Módulo Principal (Refatorado)
 */

import { getCredentials, clearCredentials, isAuthenticated } from './auth.js';
import { callShopeeAPI } from './shopeeApi.js';

// Constantes e Estado
const GEMINI_KEY_DEFAULT = 'AIzaSyAh3X2gJnHRCpzd9mJwbWFMEHAUno4VbOk';
let resultados = [];
let carrinho = [];
let cuponsAtivos = { campanhas: [], lojas: [], hasLoaded: false };

// Inicialização
window.addEventListener('load', () => {
    if (!isAuthenticated()) {
        const path = window.location.pathname.replace(/[^/]*$/, '') + 'login.html';
        window.location.replace(path);
        return;
    }
    
    document.body.style.visibility = 'visible';
    const logoutBtn = document.getElementById('btnLogout');
    if (logoutBtn) logoutBtn.style.display = '';

    const gk = localStorage.getItem('gemini_key') || GEMINI_KEY_DEFAULT;
    const geminiInput = document.getElementById('geminiKey');
    if (geminiInput) {
        geminiInput.value = gk;
        geminiInput.addEventListener('change', e => localStorage.setItem('gemini_key', e.target.value));
    }
});

// Funções de Navegação
function switchPage(page) {
    ['links', 'ofertas', 'cupons', 'exportar'].forEach(p => {
        const nav = document.getElementById('nav-' + p);
        const pg = document.getElementById('page-' + p);
        if (nav) nav.classList.toggle('active', p === page);
        if (pg) pg.classList.toggle('active', p === page);
    });
    
    const navExp = document.getElementById('nav-exportar');
    if (navExp) navExp.style.display = carrinho.length > 0 ? '' : 'none';
    
    if (page === 'cupons' && !cuponsAtivos.hasLoaded) {
        buscarCupons();
    }
}

// Expor funções para o HTML (devido ao uso de onclick direto no index.html)
window.switchPage = switchPage;
window.fazerLogout = () => {
    if (confirm('Deseja sair e voltar para o login?')) {
        clearCredentials();
        window.location.href = 'login.html';
    }
};

// ... Adicionar o restante das funções conforme necessário ...
// Nota: Para manter o funcionamento, as funções originais do app.js 
// devem ser migradas e expostas via window.
