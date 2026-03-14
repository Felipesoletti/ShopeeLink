# 🛍 Shopee Link Afiliado

Gerador de links de afiliado da Shopee direto no navegador.

## Como usar

1. Acesse o site pelo GitHub Pages
2. Informe seu **App ID** e **Secret Key** da API de Afiliados
3. Cole os links (um por linha)
4. Clique em **Gerar Links de Afiliado**
5. Baixe a planilha `.xlsx` com os links convertidos

## Como publicar no GitHub Pages

1. Crie um repositório no GitHub (ex: `shopee-links`)
2. Faça upload do arquivo `index.html`
3. Vá em **Settings → Pages**
4. Em **Source**, selecione `main` e `/root`
5. Clique em **Save**
6. Seu site estará em: `https://seuusuario.github.io/shopee-links`

## Formato dos links aceitos

```
Nome do Produto,https://shopee.com.br/...
Nome do Produto,https://shopee.com.br/...
```

Ou apenas os links, um por linha:
```
https://shopee.com.br/...
https://shopee.com.br/...
```

## Segurança

🔒 Suas credenciais ficam **apenas no seu navegador** (localStorage).  
Nenhum dado é enviado para servidores de terceiros.
