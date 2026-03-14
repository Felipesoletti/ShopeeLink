# Estrutura do Projeto ShopeeLink

O projeto foi organizado para facilitar a manutenção e corrigir problemas de carregamento com a API da Shopee.

## Pastas e Arquivos Principais

- `index.html`: Página principal (Gerador de Links, Ofertas, Cupons).
- `login.html`: Página de conexão com a API da Shopee.
- `app.js`: Lógica principal do aplicativo (Corrigida).
- `style.css`: Estilização visual.
- `worker.js`: Proxy para contornar problemas de CORS com a API da Shopee.

## Correções Realizadas

1. **Assinatura da API**: Corrigida a ordem dos parâmetros na geração do hash SHA256 (`appId + timestamp + body + secret`), que é o padrão exigido pela Shopee.
2. **Tratamento de Erros**: Adicionado tratamento de erro mais detalhado na função `callAPI` para capturar e exibir mensagens de erro do proxy e da Shopee.
3. **Organização**: Criada uma estrutura de pastas sugerida em `src/js/` para futura migração para um sistema de módulos (ESM), embora o `app.js` na raiz tenha sido mantido e corrigido para garantir compatibilidade imediata com o GitHub Pages.

## Como usar a nova estrutura

Para manter a compatibilidade com o GitHub Pages sem precisar de um build step (como Webpack ou Vite), continue usando os arquivos na raiz:
- `index.html`
- `app.js`
- `style.css`
- `login.html`

As versões em `src/js/` são preparatórias para uma arquitetura mais robusta.
