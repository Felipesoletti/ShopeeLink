// ═══════════════════════════════════════════
// ShopeeLinks — app.js
// ═══════════════════════════════════════════


  const PROXY_URL = 'https://shopee-api-proxy.felipeoliveira2.workers.dev';
  const GEMINI_KEY_DEFAULT = 'AIzaSyAh3X2gJnHRCpzd9mJwbWFMEHAUno4VbOk';
  let resultados = [];
  let tabAtiva = 'planilha';
  let dadosPlanilha = [];
  let carrinho = [];

  // ══ NAVEGAÇÃO PRINCIPAL ══
  function switchPage(page) {
    ['links','ofertas','cupons','exportar'].forEach(p => {
      const nav = document.getElementById('nav-' + p);
      const pg  = document.getElementById('page-' + p);
      if (nav) nav.classList.toggle('active', p === page);
      if (pg)  pg.classList.toggle('active',  p === page);
    });
    // Mostrar/ocultar nav de exportar
    const navExp = document.getElementById('nav-exportar');
    if (navExp) navExp.style.display = carrinho.length > 0 ? '' : 'none';
  }

  function abrirPaginaExportar() {
    if (!carrinho.length) return;
    // Atualizar CTA de cada item do carrinho a partir do DOM
    carrinho.forEach(function(item) {
      document.querySelectorAll('.product-card').forEach(function(card) {
        if (card.dataset.link === item.link && card.dataset.cta) {
          item.cta = card.dataset.cta;
        }
      });
    });
    renderExportTable();
    switchPage('exportar');
  }

  function renderExportTable() {
    const tbody = document.getElementById('exportTableBody');
    if (!tbody) return;
    const n = carrinho.length;
    document.getElementById('exportCount').textContent = n + ' produto' + (n !== 1 ? 's' : '') + ' selecionado' + (n !== 1 ? 's' : '');
    tbody.innerHTML = '';
    carrinho.forEach(function(p, i) {
      const tr = document.createElement('tr');
      const imgHtml = p.imagem
        ? '<img class="export-preview-img" src="' + p.imagem + '" />'
        : '<div class="export-preview-img" style="display:flex;align-items:center;justify-content:center">&#128717;</div>';
      const ctaHtml = p.cta
        ? '<div class="cta-preview" title="' + p.cta + '">' + p.cta + '</div>'
        : '<span style="color:var(--muted);font-size:11px">Sem CTA</span>';
      tr.innerHTML =
        '<td><button onclick="removerDoCarrinho(' + i + ')" style="background:none;border:none;color:var(--error);cursor:pointer;font-size:16px" title="Remover">&#10005;</button></td>' +
        '<td>' + imgHtml + '</td>' +
        '<td style="max-width:220px;font-size:13px">' + p.nome + '</td>' +
        '<td style="font-size:13px;color:var(--orange);font-weight:700">' + p.preco + '</td>' +
        '<td style="font-size:12px;color:var(--success)">' + p.comissao + '</td>' +
        '<td>' + ctaHtml + '</td>';
      tbody.appendChild(tr);
    });
  }

  function removerDoCarrinho(idx) {
    // Desselecionar card
    const item = carrinho[idx];
    if (item) {
      document.querySelectorAll('.product-card').forEach(card => {
        if (card.dataset.link === item.link) card.classList.remove('selected');
      });
    }
    carrinho.splice(idx, 1);
    atualizarCartBar();
    if (!carrinho.length) { switchPage('ofertas'); return; }
    renderExportTable();
  }

  function confirmarExportar() {
    if (!carrinho.length) return;
    const cols = {
      nome:     document.getElementById('col_nome')?.checked,
      preco:    document.getElementById('col_preco')?.checked,
      comissao: document.getElementById('col_comissao')?.checked,
      link:     document.getElementById('col_link')?.checked,
      cta:      document.getElementById('col_cta')?.checked,
      imagem:   document.getElementById('col_imagem')?.checked,
    };
    const dados = carrinho.map(p => {
      const row = {};
      if (cols.nome)     row['NOME DO PRODUTO']  = p.nome;
      if (cols.preco)    row['PRECO']             = p.preco;
      if (cols.comissao) row['COMISSAO']          = p.comissao;
      if (cols.link)     row['LINK DE AFILIADO']  = p.link;
      if (cols.cta)      row['CTA']               = p.cta || '';
      if (cols.imagem)   row['URL IMAGEM']        = p.imagem;
      return row;
    });
    const ws = XLSX.utils.json_to_sheet(dados);
    ws['!cols'] = [{ wch: 45 }, { wch: 12 }, { wch: 20 }, { wch: 55 }, { wch: 60 }, { wch: 55 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Produtos Selecionados');
    XLSX.writeFile(wb, 'produtos_selecionados.xlsx');
  }

  // ── Cupons: estado ──
  var cuponsAtivos = {campanhas: [], lojas: [], hasLoaded: false};

  function switchCuponTab(tab, btn) {
    document.querySelectorAll('.cupom-nav-btn').forEach(function(b) { b.classList.remove('active'); });
    btn.classList.add('active');
    renderCupons(tab);
  }

  async function buscarCupons() {
    var appId  = document.getElementById('appId').value.trim();
    var secret = document.getElementById('secretKey').value.trim();
    if (!appId || !secret) { alert('Sem credenciais. Fa\u00e7a login novamente.'); return; }

    var container = document.getElementById('cuponsContainer');
    container.innerHTML = '<div class="empty-state"><div style="font-size:32px">&#9203;</div><p>Buscando ofertas oficiais da Shopee...</p></div>';

    try {
      // Busca campanhas E lojas em paralelo
      var qCampanhas = '{ shopeeOfferV2( sortType: 2, page: 1, limit: 50 ) { nodes { commissionRate imageUrl offerLink originalLink offerName offerType periodStartTime periodEndTime } pageInfo { hasNextPage } } }';
      var qLojas     = '{ shopOfferV2( sortType: 2, page: 1, limit: 60 ) { nodes { shopId shopName commissionRate ratingStar shopType imageUrl offerLink periodStartTime periodEndTime } } }';

      var results = await Promise.all([
        callAPI(appId, secret, qCampanhas),
        callAPI(appId, secret, qLojas)
      ]);

      cuponsAtivos.campanhas = (results[0] && results[0].data && results[0].data.shopeeOfferV2) ? results[0].data.shopeeOfferV2.nodes || [] : [];
      cuponsAtivos.lojas     = (results[1] && results[1].data && results[1].data.shopOfferV2)     ? results[1].data.shopOfferV2.nodes    || [] : [];
      cuponsAtivos.hasLoaded = true;

      // Render UI com abas
      container.innerHTML =
        '<div style="display:flex;gap:6px;margin-bottom:16px;flex-wrap:wrap">' +
          '<button class="cupom-nav-btn active" onclick="switchCuponTab(&quot;campanhas&quot;,this)">&#128293; Campanhas Shopee <span class="cupom-badge">' + cuponsAtivos.campanhas.length + '</span></button>' +
          '<button class="cupom-nav-btn" onclick="switchCuponTab(&quot;lojas&quot;,this)">&#127963; Lojas com Comiss\u00e3o <span class="cupom-badge">' + cuponsAtivos.lojas.length + '</span></button>' +
        '</div>' +
        '<div id="cupomListContainer"></div>';

      renderCupons('campanhas');

    } catch(e) {
      container.innerHTML = '<div class="empty-state"><div style="font-size:32px">&#10060;</div><p>Erro: ' + e.message + '</p></div>';
    }
  }

  function renderCupons(tipo) {
    var container = document.getElementById('cupomListContainer');
    if (!container) return;

    var formatDate = function(ts) { return ts ? new Date(ts * 1000).toLocaleDateString('pt-BR') : ''; };
    var toComissaoPct = function(v) {
      if (!v) return null;
      var n = Number(v);
      if (n < 1) return (n * 100).toFixed(0) + '%';
      if (n > 100) return (n / 100).toFixed(0) + '%';
      return n.toFixed(0) + '%';
    };

    if (tipo === 'campanhas') {
      var nodes = cuponsAtivos.campanhas;
      if (!nodes.length) { container.innerHTML = '<div class="empty-state"><p>Nenhuma campanha ativa no momento.</p></div>'; return; }

      var TIPOS = {1: '&#128196; Cole\u00e7\u00e3o', 2: '&#127991; Categoria'};
      var html = '<div class="cupom-grid">';
      nodes.forEach(function(c) {
        var pct      = toComissaoPct(c.commissionRate);
        var inicio   = c.periodStartTime ? formatDate(c.periodStartTime) : '';
        var fim      = c.periodEndTime   ? formatDate(c.periodEndTime)   : '';
        var periodo  = (inicio && fim) ? inicio + ' \u2013 ' + fim : (fim ? 'At\u00e9 ' + fim : '');
        var tipo_tag = TIPOS[c.offerType] || '&#127976; Oferta';
        var link     = (c.offerLink || '#').replace(/"/g, '&quot;');
        html +=
          '<div class="cupom-card">' +
            (c.imageUrl ? '<img src="' + c.imageUrl + '" style="width:100%;height:110px;object-fit:cover;border-radius:8px;margin-bottom:8px" loading="lazy" />' : '') +
            '<div style="display:flex;align-items:center;justify-content:space-between;gap:6px;flex-wrap:wrap">' +
              '<span style="font-size:10px;background:rgba(255,102,51,0.15);color:var(--orange);padding:3px 8px;border-radius:20px;font-weight:700">' + tipo_tag + '</span>' +
              (pct ? '<span class="cupom-code">' + pct + '</span>' : '') +
            '</div>' +
            '<div class="cupom-desc">' + (c.offerName || 'Oferta Especial') + '</div>' +
            (periodo ? '<div class="cupom-validade">&#128197; ' + periodo + '</div>' : '') +
            '<div style="display:flex;gap:6px;margin-top:6px">' +
              '<a href="' + link + '" target="_blank" class="product-btn product-btn-main" style="flex:1;padding:8px;text-align:center;text-decoration:none;font-size:11px;font-weight:700;border-radius:8px">Ver oferta &#8594;</a>' +
              '<button class="copy-btn" onclick="copiarTexto(this)" data-link="' + link + '" style="font-size:11px">Copiar link</button>' +
            '</div>' +
          '</div>';
      });
      html += '</div>';
      container.innerHTML = html;

    } else {
      var nodes = cuponsAtivos.lojas;
      if (!nodes.length) { container.innerHTML = '<div class="empty-state"><p>Nenhuma loja com comiss\u00e3o diferenciada encontrada.</p></div>'; return; }

      var SHOP_TYPES = {1: 'Mall', 2: 'Star', 4: 'Star+'};
      var html = '<div class="cupom-grid">';
      nodes.forEach(function(loja) {
        var pct   = toComissaoPct(loja.commissionRate);
        var stars = loja.ratingStar ? (parseFloat(loja.ratingStar)).toFixed(1) : null;
        var tipo  = loja.shopType ? (SHOP_TYPES[loja.shopType] || '') : '';
        var link  = (loja.offerLink || '#').replace(/"/g, '&quot;');
        var fim   = loja.periodEndTime ? formatDate(loja.periodEndTime) : '';
        html +=
          '<div class="cupom-card">' +
            (loja.imageUrl ? '<img src="' + loja.imageUrl + '" style="width:100%;height:80px;object-fit:contain;background:var(--surface);border-radius:8px;margin-bottom:8px;padding:8px" loading="lazy" />' : '') +
            '<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:4px">' +
              (tipo ? '<span style="font-size:10px;background:rgba(255,102,51,0.15);color:var(--orange);padding:3px 8px;border-radius:20px;font-weight:700">' + tipo + '</span>' : '') +
              (stars ? '<span style="font-size:11px;color:#fbbf24">&#9733; ' + stars + '</span>' : '') +
            '</div>' +
            '<div class="cupom-desc" style="font-weight:600">' + (loja.shopName || 'Loja') + '</div>' +
            (pct ? '<div class="cupom-code">' + pct + ' comiss\u00e3o</div>' : '') +
            (fim ? '<div class="cupom-validade">&#128197; At\u00e9 ' + fim + '</div>' : '') +
            '<div style="display:flex;gap:6px;margin-top:8px">' +
              '<a href="' + link + '" target="_blank" class="product-btn product-btn-main" style="flex:1;padding:8px;text-align:center;text-decoration:none;font-size:11px;font-weight:700;border-radius:8px">Ver loja &#8594;</a>' +
              '<button class="copy-btn" onclick="copiarTexto(this)" data-link="' + link + '" style="font-size:11px">Copiar</button>' +
            '</div>' +
          '</div>';
      });
      html += '</div>';
      container.innerHTML = html;
    }
  }


  function copiarTexto(btnOrTxt, btn) {
    var txt, button;
    if (typeof btnOrTxt === 'string') {
      txt = btnOrTxt; button = btn;
    } else {
      // Called as copiarTexto(this, this) from data-link
      button = btnOrTxt;
      txt = button.dataset.link || button.dataset.txt || '';
    }
    if (!txt) return;
    navigator.clipboard.writeText(txt).then(function() {
      var orig = button.textContent;
      button.textContent = '\u2713 Copiado!'; button.classList.add('copied');
      setTimeout(function() { button.textContent = orig; button.classList.remove('copied'); }, 1500);
    });
  }

  // ══ TABS ══
  function switchTab(tab) {
    tabAtiva = tab;
    document.getElementById('tab-planilha').classList.toggle('active', tab === 'planilha');
    document.getElementById('tab-texto').classList.toggle('active', tab === 'texto');
    document.getElementById('panel-planilha').classList.toggle('active', tab === 'planilha');
    document.getElementById('panel-texto').classList.toggle('active', tab === 'texto');
  }

  // ══ DRAG & DROP ══
  const uploadZone = document.getElementById('uploadZone');
  uploadZone.addEventListener('dragover', e => { e.preventDefault(); uploadZone.classList.add('dragover'); });
  uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('dragover'));
  uploadZone.addEventListener('drop', e => { e.preventDefault(); uploadZone.classList.remove('dragover'); if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]); });

  function handleFile(file) {
    if (!file) return;
    const ext = file.name.split('.').pop().toLowerCase();
    if (!['xlsx','xls','csv'].includes(ext)) return showAlert('error','Formato inválido. Use .xlsx, .xls ou .csv');
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const wb = XLSX.read(e.target.result, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(ws, { header: 1 });
        if (!json.length) return showAlert('error', 'Planilha vazia.');
        const headers = json[0].map(String);
        dadosPlanilha = json.slice(1).filter(r => r.length);
        ['colNome','colLink'].forEach(id => {
          document.getElementById(id).innerHTML = headers.map((h, i) => `<option value="${i}">${h || 'Coluna ' + (i+1)}</option>`).join('');
        });
        const iNome = headers.findIndex(h => /nome|produto|title|name/i.test(h));
        const iLink = headers.findIndex(h => /link|url|href/i.test(h));
        if (iNome >= 0) document.getElementById('colNome').value = iNome;
        if (iLink >= 0) document.getElementById('colLink').value = iLink;
        else document.getElementById('colLink').value = iNome === 0 ? 1 : 0;
        document.getElementById('fileName').textContent = file.name;
        document.getElementById('fileMeta').textContent = `${dadosPlanilha.length} produtos encontrados`;
        document.getElementById('filePreview').classList.add('show');
        document.getElementById('colConfig').classList.add('show');
        uploadZone.style.display = 'none';
      } catch(err) { showAlert('error','Erro ao ler planilha: ' + err.message); }
    };
    reader.readAsBinaryString(file);
  }

  function removeFile() {
    dadosPlanilha = [];
    document.getElementById('filePreview').classList.remove('show');
    document.getElementById('colConfig').classList.remove('show');
    document.getElementById('fileInput').value = '';
    uploadZone.style.display = '';
  }

  function parseLinhas(texto) {
    return texto.split('\n').map(l => l.trim()).filter(Boolean).map(linha => {
      const idx = linha.indexOf(',');
      if (idx > 0 && !linha.startsWith('http')) return { nome: linha.slice(0,idx).trim(), link: linha.slice(idx+1).trim() };
      const match = linha.match(/shopee\.com\.br\/([^?&]+)/);
      const slug = match ? decodeURIComponent(match[1]).replace(/-/g,' ').replace(/\s*i\.\d+\.\d+\s*/,'').trim() : '';
      return { nome: slug || linha.substring(0,50), link: linha };
    });
  }

  function coletarItens() {
    if (tabAtiva === 'planilha') {
      if (!dadosPlanilha.length) { showAlert('error','Nenhuma planilha carregada.'); return null; }
      const iN = parseInt(document.getElementById('colNome').value);
      const iL = parseInt(document.getElementById('colLink').value);
      const itens = dadosPlanilha.map(row => ({ nome: String(row[iN]||'').trim(), link: String(row[iL]||'').trim() })).filter(r => r.link.startsWith('http'));
      if (!itens.length) { showAlert('error','Nenhum link válido na coluna selecionada.'); return null; }
      return itens;
    } else {
      const texto = document.getElementById('linksInput').value.trim();
      if (!texto) { showAlert('error','Cole ao menos um link.'); return null; }
      return parseLinhas(texto);
    }
  }

  async function sha256(msg) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(msg));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');
  }

  async function callAPI(appId, secret, query) {
    const timestamp = Math.floor(Date.now() / 1000);
    const payload = { query };
    const body = JSON.stringify(payload);
    const sig = await sha256(`${appId}${timestamp}${body}${secret}`);
    const resp = await fetch(PROXY_URL, {
      method: 'POST',
      mode: 'cors',
      headers: { 'Content-Type': 'application/json', 'Authorization': `SHA256 Credential=${appId}, Timestamp=${timestamp}, Signature=${sig}` },
      body
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();
    if (data.errors) throw new Error(data.errors[0]?.message || 'Erro API');
    return data;
  }

  // ══ GERAR LINKS ══
  function showAlert(tipo, msg) {
    document.getElementById('alertError').classList.remove('show');
    document.getElementById('alertInfo').classList.remove('show');
    if (tipo === 'error') { document.getElementById('alertMsg').textContent = msg; document.getElementById('alertError').classList.add('show'); }
    if (tipo === 'info')  { document.getElementById('alertInfoMsg').textContent = msg; document.getElementById('alertInfo').classList.add('show'); }
  }
  function logLine(html) { const log = document.getElementById('progressLog'); log.innerHTML += html + '<br>'; log.scrollTop = log.scrollHeight; }
  function setProgress(a, t) { document.getElementById('progressFill').style.width = Math.round((a/t)*100)+'%'; document.getElementById('progressCount').textContent = `${a}/${t}`; }

  async function gerarLinks() {
    const appId = document.getElementById('appId').value.trim();
    const secret = document.getElementById('secretKey').value.trim();
    showAlert(null,'');
    if (!appId || !secret) return showAlert('error','Informe o App ID e a Secret Key.');
    const itens = coletarItens();
    if (!itens || !itens.length) return;
    resultados = [];
    document.getElementById('resultsWrap').classList.remove('show');
    document.getElementById('resultsBody').innerHTML = '';
    document.getElementById('progressLog').innerHTML = '';
    const btn = document.getElementById('btnGerar');
    btn.classList.add('loading'); btn.disabled = true;
    document.getElementById('progressWrap').classList.add('show');
    setProgress(0, itens.length);
    let ok = 0, erros = 0;
    for (let i = 0; i < itens.length; i++) {
      const { nome, link } = itens[i];
      setProgress(i+1, itens.length);
      try {
        const query = `mutation { generateShortLink(input: { originUrl: "${link}", subIds: [] }) { shortLink } }`;
        const data = await callAPI(appId, secret, query);
        const afiliado = data.data.generateShortLink.shortLink;
        resultados.push({ nome, link: afiliado });
        logLine(`<span class="ok">&#10003;</span> ${nome.substring(0,55)}`);
        renderLinha(resultados.length, nome, afiliado);
        ok++;
      } catch(e) {
        resultados.push({ nome, link: 'ERRO: ' + e.message });
        logLine(`<span class="err">&#10007;</span> ${nome.substring(0,45)} - ${e.message}`);
        erros++;
      }
      await new Promise(r => setTimeout(r, 400));
    }
    btn.classList.remove('loading'); btn.disabled = false;
    document.getElementById('resultsCount').textContent = `OK ${ok} links gerados${erros ? ' / ERRO ' + erros + ' erros' : ''}`;
    document.getElementById('resultsWrap').classList.add('show');
  }

  function renderLinha(idx, nome, link) {
    const isErro = link.startsWith('ERRO');
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="color:var(--muted);font-size:12px">${idx}</td>
      <td class="td-name">${nome}</td>
      <td class="td-link">${isErro ? `<span style="color:var(--error);font-size:12px">${link}</span>` : `<a href="${link}" target="_blank">${link}</a>`}</td>
      <td>${!isErro ? `<button class="copy-btn" onclick="copiar(this,'${link}')">Copiar</button>` : ''}</td>`;
    document.getElementById('resultsBody').appendChild(tr);
  }

  function copiar(btn, link) {
    navigator.clipboard.writeText(link).then(() => {
      btn.textContent = 'Copiado!'; btn.classList.add('copied');
      setTimeout(() => { btn.textContent = 'Copiar'; btn.classList.remove('copied'); }, 1500);
    });
  }

  function downloadExcel() {
    if (!resultados.length) return;
    const ws = XLSX.utils.json_to_sheet(resultados.map(r => ({ 'NOME DO PRODUTO': r.nome, 'LINK DE AFILIADO': r.link })));
    ws['!cols'] = [{ wch: 45 }, { wch: 60 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Links Afiliados');
    XLSX.writeFile(wb, 'produtos_afiliados.xlsx');
  }

  // ══ OFERTAS ══
  function selectCategoria(el, cat) {
    document.querySelectorAll('.badge').forEach(b => b.classList.remove('active'));
    el.classList.add('active');
    document.getElementById('searchInput').value = cat;
    buscarOfertas();
  }

  // Converte preco: retorna número float (reais) ou null
  function toRealNum(v) {
    if (!v) return null;
    const n = Number(v);
    if (n === 0) return null;
    if (n >= 10000000) return n / 100000;
    if (n >= 100000)   return n / 10000;
    if (n >= 1000)     return n / 100;
    if (n >= 10)       return n / 10;
    return n;
  }
  function toReal(v) {
    const num = toRealNum(v);
    if (num === null) return null;
    return num.toFixed(2).replace('.', ',');
  }

  // Comissao: retorna percentual como float ou null
  function toComissaoNum(v) {
    if (!v) return null;
    const n = Number(v);
    if (n === 0) return null;
    if (n < 1)        return n * 100;   // 0.12 -> 12
    if (n > 100)      return n / 100;   // 1200 -> 12
    return n;                            // 12 -> 12
  }
  function toComissao(v) {
    const num = toComissaoNum(v);
    if (num === null) return null;
    return num.toFixed(2).replace('.', ',');
  }

  function limparFiltroPreco() {
    document.getElementById('precoMin').value = '';
    document.getElementById('precoMax').value = '';
    atualizarBarraPreco();
  }

  function atualizarBarraPreco() {
    const mn = parseFloat(document.getElementById('precoMin').value) || 0;
    const mx = parseFloat(document.getElementById('precoMax').value) || 0;
    const MAX = 1000;
    const barra = document.getElementById('barraPreco');
    const lbl   = document.getElementById('lblPreco');
    if (!barra || !lbl) return;
    if (!mn && !mx) {
      barra.style.left  = '0%';
      barra.style.right = '0%';
      lbl.textContent = 'Qualquer preço';
      return;
    }
    const low  = mn || 0;
    const high = mx || MAX;
    const pL = Math.min(low  / MAX * 100, 100);
    const pR = Math.max(100 - high / MAX * 100, 0);
    barra.style.left  = pL.toFixed(1) + '%';
    barra.style.right = pR.toFixed(1) + '%';
    if (mn && mx)       lbl.textContent = 'R$ ' + mn + ' — R$ ' + mx;
    else if (mn && !mx) lbl.textContent = 'A partir de R$ ' + mn;
    else if (!mn && mx) lbl.textContent = 'Até R$ ' + mx;
  }


  // ══ CTA ══
  const CTA_DB = [
    {keys:['cafe','caneca','xicara','moka','capsula'],
     tpl:['A mais linda para o cantinho do caf\u00e9 \u2728\u2615','Para quem ama um caf\u00e9 bem feito \u2615\u2728','Seu ritual do caf\u00e9 merece isso \u2728']},
    {keys:['maquiagem','base','batom','blush','sombra','lip','glitter'],
     tpl:['O look perfeito come\u00e7a aqui \ud83d\udc84\u2728','Sua make vai subir de n\u00edvel \ud83d\udc84\ud83d\udca5','Para quem ama uma make impec\u00e1vel \u2728']},
    {keys:['skincare','creme','serum','hidratante','esfoliante'],
     tpl:['Sua pele vai agradecer muito \ud83c\udf3f\u2728','O skincare que voc\u00ea merecia \ud83c\udf3f\u2728','Pele hidratada e linda \u2728']},
    {keys:['perfume','body splash','fragr'],
     tpl:['O aroma que vai te marcar \ud83c\udf38\u2728','Cheirosa o dia todo \ud83c\udf38\ud83d\udc95','Seu novo perfume favorito \ud83c\udf38']},
    {keys:['bolsa','mochila','carteira','necessaire','bag'],
     tpl:['O acess\u00f3rio que faltava no seu look \ud83d\udc5c\u2728','Pr\u00e1tica e estilosa \ud83d\udc5c\ud83d\udca5']},
    {keys:['vestido','calca','blusa','cropped','saia','conjunto','jaqueta'],
     tpl:['O look que voc\u00ea estava esperando \ud83d\udc57\u2728','Para arrasar com estilo \ud83d\udc57\ud83d\udca5']},
    {keys:['calcinha','sutia','lingerie','pijama'],
     tpl:['Conforto e delicadeza juntos \ud83d\udc95\u2728','Para se sentir linda \ud83d\udc95\u2728']},
    {keys:['cabelo','shampoo','condicionador','capilar','secador'],
     tpl:['Para o cabelo dos sonhos \u2728','Seu cabelo vai amar isso \ud83d\udc87\u2640\ufe0f\u2665\ufe0f']},
    {keys:['colar','pulseira','brinco','anel','joia','biju'],
     tpl:['O detalhe que completa tudo \ud83d\udc8d\u2728','Acess\u00f3rio lindo para arrasar \ud83d\udc8d\ud83d\udca5']},
    {keys:['organiz','decor','casa','cozinha','quarto'],
     tpl:['A casa ainda mais linda \ud83c\udfe1\u2728','Organize com estilo e praticidade \ud83c\udfe1\ud83d\udca5']},
  ];

  function gerarCtaAuto(nome) {
    const n = (nome || '').toLowerCase();
    for (const cat of CTA_DB) {
      if (cat.keys.some(k => n.includes(k))) {
        return cat.tpl[Math.floor(Math.random() * cat.tpl.length)];
      }
    }
    const g = [
      'Um achadinho que voc\u00ea vai amar \u2728\ud83d\udc95',
      'Oferta imperd\u00edvel! \u2728\ud83d\udca5',
      'Esse voc\u00ea precisa ver! \u2728\ud83d\udc40',
      'Corre que \u00e9 por tempo limitado \u2728\ud83d\udd25',
    ];
    return g[Math.floor(Math.random() * g.length)];
  }

  function switchCtaTab(id, tab, btn) {
    btn.closest('.cta-tabs').querySelectorAll('.cta-tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('cta_auto_' + id).style.display = tab === 'auto' ? '' : 'none';
    document.getElementById('cta_ai_'   + id).style.display = tab === 'ai'   ? '' : 'none';
  }

  function regenerarCtaAuto(id, nome) {
    const el = document.getElementById('cta_auto_' + id);
    if (el) el.textContent = gerarCtaAuto(nome);
  }

  function copiarCta(id) {
    const a = document.getElementById('cta_auto_' + id);
    const b = document.getElementById('cta_ai_'   + id);
    const isAi = b && b.style.display !== 'none';
    const txt  = (isAi ? b : a)?.textContent?.trim();
    if (!txt || txt.includes('Clique') || txt.includes('Gerando')) return;
    navigator.clipboard.writeText(txt).then(() => {
      const box = (isAi ? b : a).closest('.cta-box');
      const btn = box?.querySelector('.cta-btn');
      if (btn) {
        const orig = btn.textContent;
        btn.textContent = '\u2713 Copiado!';
        btn.classList.add('copied');
        setTimeout(() => { btn.textContent = orig; btn.classList.remove('copied'); }, 1500);
      }
    });
  }

  async function gerarCtaGemini(id, nomeProduto) {
    const key  = document.getElementById('geminiKey')?.value?.trim() || GEMINI_KEY_DEFAULT;
    const btn  = document.getElementById('btn_ai_' + id);
    const aiEl = document.getElementById('cta_ai_' + id);
    if (!btn || !aiEl) return;
    btn.disabled = true;
    btn.textContent = '...';
    aiEl.style.display    = '';
    aiEl.style.color      = 'var(--muted)';
    aiEl.style.fontStyle  = 'italic';
    aiEl.textContent      = 'Gerando com IA...';
    const tabs = btn.closest('.cta-box').querySelectorAll('.cta-tab');
    tabs.forEach(t => t.classList.remove('active'));
    tabs[1]?.classList.add('active');
    document.getElementById('cta_auto_' + id).style.display = 'none';
    try {
      const prompt = 'Crie um CTA curto (m\u00e1ximo 10 palavras) irresist\u00edvel com emojis para divulgar este produto da Shopee para o p\u00fablico feminino brasileiro. Produto: "' + nomeProduto + '". Responda APENAS com o CTA, sem aspas.';
      const resp = await fetch(
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + key,
        { method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }) }
      );
      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}));
        throw new Error('Gemini HTTP ' + resp.status + ': ' + (errData?.error?.message || ''));
      }
      const data = await resp.json();
      const cta  = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      if (!cta) throw new Error('Resposta vazia da IA');
      aiEl.textContent    = cta;
      aiEl.style.color    = 'var(--text)';
      aiEl.style.fontStyle = 'normal';
    } catch(e) {
      aiEl.textContent    = 'Erro: ' + e.message;
      aiEl.style.color    = 'var(--error)';
      aiEl.style.fontStyle = 'normal';
    } finally {
      btn.disabled    = false;
      btn.textContent = '\u2728 Gerar com IA';
    }
  }

  async function buscarOfertas() {
    const appId  = document.getElementById('appId').value.trim();
    const secret = document.getElementById('secretKey').value.trim();
    if (!appId || !secret) {
      document.getElementById('alertOfertasError').classList.add('show');
      document.getElementById('alertOfertasMsg').textContent = 'Informe o App ID e a Secret Key na aba "Gerar Links".';
      return;
    }
    document.getElementById('alertOfertasError').classList.remove('show');

    const baseKeyword = document.getElementById('searchInput').value.trim() || 'feminino';
    const freteGratis  = document.getElementById('filtroNacional').checked;
    const filtroMall   = document.getElementById('filtroMall').checked;
    const keyword  = freteGratis ? baseKeyword + ' frete gratis' : baseKeyword;
    const sortType = parseInt(document.getElementById('sortType').value);
    const limit    = parseInt(document.getElementById('limitOfertas').value);
    const nacional = freteGratis;

    const btnBusca = document.querySelector('#page-ofertas .btn-pink');
    document.getElementById('spinnerBusca').style.display = 'block';
    document.getElementById('btnBuscaText').style.display = 'none';
    btnBusca.disabled = true;

    const container = document.getElementById('ofertasContainer');
    container.innerHTML = `<div class="loading-grid">${Array(8).fill(`<div class="skeleton"><div class="skeleton-img"></div><div class="skeleton-line"></div><div class="skeleton-line short"></div></div>`).join('')}</div>`;

    try {
      // API limita 20 por pagina — fazemos multiplas paginas se necessario
      const PAGE_SIZE = 20;
      let allNodes = [];
      let page = 1;

      while (allNodes.length < limit) {
        const thisLimit = Math.min(PAGE_SIZE, limit - allNodes.length);
        const query = `{
          productOfferV2(
            keyword: "${keyword}",
            sortType: ${sortType},
            page: ${page},
            limit: ${thisLimit}
            ${filtroMall ? ', isKeySeller: true' : ''}
          ) {
            nodes {
              itemId shopId productName shopName
              priceMin priceMax commissionRate priceDiscountRate
              imageUrl offerLink
            }
            pageInfo { hasNextPage }
          }
        }`;
        const data  = await callAPI(appId, secret, query);
        const nodes = data?.data?.productOfferV2?.nodes || [];
        const hasNext = data?.data?.productOfferV2?.pageInfo?.hasNextPage;
        allNodes = allNodes.concat(nodes);
        if (!hasNext || nodes.length < thisLimit) break;
        page++;
      }

      // Log para debug de preco/comissao
      if (allNodes.length) console.log('RAW[0]:', JSON.stringify(allNodes[0]));

      var fMin = (function(){ var v = document.getElementById('precoMin') ? document.getElementById('precoMin').value.trim() : ''; return v !== '' ? parseFloat(v) : null; })();
      var fMax = (function(){ var v = document.getElementById('precoMax') ? document.getElementById('precoMax').value.trim() : ''; return v !== '' ? parseFloat(v) : null; })();
      let filtered = allNodes.filter(function(p) {
        if (fMin === null && fMax === null) return true;
        var preco = toRealNum(p.priceMin);
        if (!preco || preco === 0) return true;
        if (fMin !== null && preco < fMin) return false;
        if (fMax !== null && preco > fMax) return false;
        return true;
      });

      if (!filtered.length) {
        container.innerHTML = `<div class="empty-state"><div class="icon">&#128580;</div><p>Nenhum produto encontrado${nacional ? ' com frete grátis' : ''} para "<strong>${keyword}</strong>".</p></div>`;
        return;
      }

      container.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:12px">
          <span style="font-size:12px;color:var(--muted)">
            <span style="color:var(--success);font-weight:700">${filtered.length}</span> produtos encontrados
            &nbsp;&#183;&nbsp; Clique para selecionar
          </span>
          <span id="cartInfo" style="font-size:12px;color:var(--muted)">0 selecionados</span>
        </div>
        <div class="products-grid" id="productsGrid"></div>`;

      const grid = document.getElementById('productsGrid');

      filtered.forEach(p => {
        const preco     = toReal(p.priceMin);
        const orig      = toReal(p.priceMax);
        const comissao  = toComissao(p.commissionRate);
        const desconto  = p.priceDiscountRate ? Math.round(Number(p.priceDiscountRate)) : 0;
        const loc       = '';  // shopLocation not available in API
        const isNac     = false;  // sem dados de localização disponíveis
        const link      = p.offerLink || '#';

        const card = document.createElement('div');
        card.className = 'product-card';
        const precoNum2   = toRealNum(p.priceMin);
        const pctNum2     = toComissaoNum(p.commissionRate);
        const valComissao = (precoNum2 && pctNum2) ? (precoNum2 * pctNum2 / 100).toFixed(2) : null;

        card.dataset.link     = link;
        card.dataset.nome     = p.productName || 'Produto';
        card.dataset.preco    = preco ? `R$ ${preco}` : '-';
        card.dataset.comissao = comissao ? `${comissao}%${valComissao ? ' (R$ ' + valComissao.replace('.',',') + ')' : ''}` : '-';
        card.dataset.img      = p.imageUrl || '';
        card.dataset.cta      = '';

        const ctaAuto = gerarCtaAuto(p.productName || '');
        const cardId  = 'c' + (p.itemId || Math.random().toString(36).slice(2,8));
        card.innerHTML = `
          <div class="select-check">&#10003;</div>
          ${p.imageUrl ? `<img class="product-img" src="${p.imageUrl}" alt="" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'" />` : ''}
          <div class="product-img-placeholder"${p.imageUrl ? '' : ' style="display:flex"'}>&#128717;</div>
          <div class="product-info">
            <div class="product-name">${p.productName || 'Produto'}</div>
            <div class="product-price-row">
              <span class="product-price">${preco ? 'R$&nbsp;' + preco : '-'}</span>
              ${orig && orig !== preco ? `<span class="product-original">R$ ${orig}</span>` : ''}
              ${desconto > 0 ? `<span class="product-discount">-${desconto}%</span>` : ''}
            </div>
            <div class="product-meta">
              ${comissao ? (() => {
                const precoNum = toRealNum(p.priceMin);
                const pctNum   = toComissaoNum(p.commissionRate);
                const valorComissao = (precoNum && pctNum) ? (precoNum * pctNum / 100).toFixed(2).replace('.',',') : null;
                return `<span class="product-commission">&#128176; ${comissao}% ${valorComissao ? `<span style="color:#86efac">(R$&nbsp;${valorComissao})</span>` : ''}</span>`;
              })() : ''}
              ${filtroMall ? `<span class="product-national">&#127963; Key Seller</span>` : ''}
            </div>
            ${p.shopName ? `<div style="font-size:11px;color:var(--muted);margin-bottom:8px">&#127978; ${p.shopName}</div>` : ''}
            <div class="product-actions" onclick="event.stopPropagation()">
              <a href="${link}" target="_blank" class="product-btn product-btn-main">Ver produto</a>
            </div>
            <div class="cta-box" onclick="event.stopPropagation()">
              <div class="cta-tabs">
                <button class="cta-tab active" onclick="switchCtaTab('${cardId}','auto',this)">&#9889; Auto</button>
                <button class="cta-tab" onclick="switchCtaTab('${cardId}','ai',this)">&#10024; IA Gemini</button>
              </div>
              <div class="cta-body">
                <div class="cta-text" id="cta_auto_${cardId}">${ctaAuto}</div>
                <div class="cta-text" id="cta_ai_${cardId}" style="display:none;color:var(--muted);font-style:italic">Clique em "Gerar com IA" para criar um CTA personalizado.</div>
                <div class="cta-actions">
                  <button class="cta-btn" onclick="copiarCta('${cardId}')">&#128203; Copiar</button>
                  <button class="cta-btn" onclick="regenerarCtaAuto('${cardId}','${(p.productName||"").replace(/'/g,"")}')">&#8635; Novo</button>
                  <button class="cta-btn cta-btn-ai" id="btn_ai_${cardId}"
                    onclick="gerarCtaGemini('${cardId}','${(p.productName||"").replace(/['"]/g,"")}')">
                    &#10024; Gerar com IA
                  </button>
                </div>
              </div>
            </div>
          </div>`;

        card.dataset.cta = ctaAuto;
        // Atualiza dataset quando CTA muda
        const _ctaObs = new MutationObserver(() => {
          const aiEl = document.getElementById('cta_ai_' + cardId);
          const autoEl = document.getElementById('cta_auto_' + cardId);
          const isAi = aiEl && aiEl.style.display !== 'none';
          const txt = (isAi ? aiEl : autoEl)?.textContent?.trim();
          if (txt && !txt.includes('Clique') && !txt.includes('Gerando')) card.dataset.cta = txt;
        });
        setTimeout(() => {
          const autoEl = document.getElementById('cta_auto_' + cardId);
          const aiEl   = document.getElementById('cta_ai_'   + cardId);
          if (autoEl) _ctaObs.observe(autoEl, {childList:true, characterData:true, subtree:true});
          if (aiEl)   _ctaObs.observe(aiEl,   {childList:true, characterData:true, subtree:true});
        }, 100);
        card.addEventListener('click', () => toggleCarrinho(card));
        grid.appendChild(card);
      });

    } catch(e) {
      container.innerHTML = `<div class="empty-state"><div class="icon">&#10060;</div><p>Erro ao buscar:<br><strong>${e.message}</strong></p></div>`;
    } finally {
      document.getElementById('spinnerBusca').style.display = 'none';
      document.getElementById('btnBuscaText').style.display = 'block';
      btnBusca.disabled = false;
    }
  }

  // ══ CARRINHO ══
  function toggleCarrinho(card) {
    const link = card.dataset.link;
    const idx  = carrinho.findIndex(c => c.link === link);
    if (idx >= 0) {
      carrinho.splice(idx, 1);
      card.classList.remove('selected');
    } else {
      // Pegar CTA atual do DOM antes de salvar
      const cid = card.querySelector('[id^="cta_auto_"]')?.id?.replace('cta_auto_','');
      const aiEl   = cid ? document.getElementById('cta_ai_'  + cid) : null;
      const autoEl = cid ? document.getElementById('cta_auto_' + cid) : null;
      const isAi   = aiEl && aiEl.style.display !== 'none';
      const ctaTxt = (isAi ? aiEl : autoEl)?.textContent?.trim() || card.dataset.cta || '';
      carrinho.push({
        nome:     card.dataset.nome,
        link:     card.dataset.link,
        preco:    card.dataset.preco,
        comissao: card.dataset.comissao,
        imagem:   card.dataset.img,
        cta:      ctaTxt
      });
      card.classList.add('selected');
    }
    atualizarCartBar();
  }

  function atualizarCartBar() {
    const n = carrinho.length;
    const info = document.getElementById('cartInfo');
    if (info) info.textContent = n > 0 ? `${n} selecionado${n>1?'s':''}` : '0 selecionados';
    document.getElementById('cartCount').textContent = n;
    document.getElementById('cartSub').textContent = n === 1 ? '1 produto selecionado' : `${n} produtos selecionados`;
    document.getElementById('cartBar').classList.toggle('show', n > 0);
    const navExp = document.getElementById('nav-exportar');
    if (navExp) navExp.style.display = n > 0 ? '' : 'none';
  }

  function limparCarrinho() {
    carrinho = [];
    document.querySelectorAll('.product-card.selected').forEach(c => c.classList.remove('selected'));
    atualizarCartBar();
  }

  function exportarCarrinho() {
    if (!carrinho.length) return;
    const dados = carrinho.map(p => ({
      'NOME DO PRODUTO': p.nome,
      'PRECO':           p.preco,
      'COMISSAO':        p.comissao,
      'LINK':            p.link,
      'IMAGEM':          p.imagem
    }));
    const ws = XLSX.utils.json_to_sheet(dados);
    ws['!cols'] = [{ wch: 50 }, { wch: 14 }, { wch: 16 }, { wch: 55 }, { wch: 55 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Produtos Selecionados');
    XLSX.writeFile(wb, 'produtos_selecionados.xlsx');
  }

  // ══ Salvar credenciais ══
  window.addEventListener('load', () => {
    const id = localStorage.getItem('shopee_appid');
    const sk = localStorage.getItem('shopee_secret');
    if (id) document.getElementById('appId').value = id;
    if (sk) document.getElementById('secretKey').value = sk;
    const gk = localStorage.getItem('gemini_key') || GEMINI_KEY_DEFAULT;
    if (document.getElementById('geminiKey')) document.getElementById('geminiKey').value = gk;
    if (document.getElementById('geminiKey')) document.getElementById('geminiKey').addEventListener('change', e => localStorage.setItem('gemini_key', e.target.value));
    document.getElementById('appId').addEventListener('change', e => localStorage.setItem('shopee_appid', e.target.value));
    document.getElementById('secretKey').addEventListener('change', e => localStorage.setItem('shopee_secret', e.target.value));
  });
