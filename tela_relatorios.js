/* ==========================================================
   RELATÓRIOS E DASHBOARD — leitura sobre o que já existe (vendas,
   itens_venda, pagamentos, lançamentos financeiros). Nada aqui
   grava dado novo, exceto o cancelamento de venda.
   ========================================================== */
var ABA_REL = 'dashboard';
var CACHE_VENDAS_REL = [];
var CACHE_ITENS_VENDA_REL = [];
var CACHE_PAGAMENTOS_REL = [];
var CACHE_LANC_REL = [];

function periodoPadrao(){
  var fim = new Date();
  var ini = new Date(); ini.setDate(ini.getDate()-29);
  return { ini: ini.toISOString().slice(0,10), fim: fim.toISOString().slice(0,10) };
}
var FILTRO_PERIODO = periodoPadrao();

async function renderRelatorios(){
  var cli = cliente();
  var { data: vendas } = await cli.from('vendas').select('*')
    .gte('criado_em', FILTRO_PERIODO.ini).lte('criado_em', FILTRO_PERIODO.fim+'T23:59:59');
  CACHE_VENDAS_REL = vendas || [];
  var idsVendas = CACHE_VENDAS_REL.map(function(v){return v.id});
  var { data: itens } = idsVendas.length
    ? await cli.from('itens_venda').select('*').in('venda_id', idsVendas) : {data:[]};
  CACHE_ITENS_VENDA_REL = itens || [];
  var { data: pag } = idsVendas.length
    ? await cli.from('pagamentos_venda').select('*').in('venda_id', idsVendas) : {data:[]};
  CACHE_PAGAMENTOS_REL = pag || [];
  var { data: lanc } = await cli.from('lancamentos_financeiros').select('*')
    .gte('data_vencimento', FILTRO_PERIODO.ini).lte('data_vencimento', FILTRO_PERIODO.fim);
  CACHE_LANC_REL = lanc || [];
  await carregarCatalogo();
  var cliF = cliente();
  var { data: catsFin } = await cliF.from('categorias_financeiras').select('*');
  CACHE_CATEGORIAS_FIN = catsFin || [];
  var { data: formas } = await cliF.from('formas_pagamento').select('*');
  CACHE_FORMAS_PAG = formas || [];
  desenharRelatorios();
}
function irParaRel(aba){ ABA_REL=aba; renderApp(); }

function filtroPeriodoHtml(){
  return '<div class="card" style="margin-bottom:16px;padding:14px 20px">'+
   '<div style="display:flex;gap:12px;align-items:flex-end;flex-wrap:wrap">'+
    '<div class="fld" style="margin:0"><label>De</label><input id="relDe" type="date" value="'+FILTRO_PERIODO.ini+'"></div>'+
    '<div class="fld" style="margin:0"><label>Até</label><input id="relAte" type="date" value="'+FILTRO_PERIODO.fim+'"></div>'+
    '<button class="btn2" onclick="aplicarFiltroPeriodo()">Aplicar</button>'+
   '</div></div>';
}
function aplicarFiltroPeriodo(){
  FILTRO_PERIODO = { ini: $('relDe').value, fim: $('relAte').value };
  renderRelatorios();
}

function desenharRelatorios(){
  var html = filtroPeriodoHtml();
  if(ABA_REL==='dashboard') html += montarDashboard();
  else if(ABA_REL==='faturamento') html += montarFaturamento();
  else if(ABA_REL==='itens') html += montarItensMaisVendidos();
  else if(ABA_REL==='cancelamentos') html += montarCancelamentos();
  else if(ABA_REL==='dre') html += montarDRE();
  $('miolo').innerHTML = html;
}

/* ---------- Dashboard ---------- */
function montarDashboard(){
  var concluidas = CACHE_VENDAS_REL.filter(function(v){return v.situacao==='concluida'});
  var total = concluidas.reduce(function(s,v){return s+Number(v.total)},0);
  var qtdVendas = concluidas.length;
  var ticketMedio = qtdVendas ? total/qtdVendas : 0;
  var canceladas = CACHE_VENDAS_REL.filter(function(v){return v.situacao==='cancelada'}).length;

  var porDia = {};
  concluidas.forEach(function(v){
    var d = (v.criado_em||'').slice(0,10);
    porDia[d] = (porDia[d]||0) + Number(v.total);
  });
  var dias = Object.keys(porDia).sort();
  var maxDia = Math.max.apply(null, dias.map(function(d){return porDia[d]}).concat([1]));

  return '<div class="row2" style="grid-template-columns:repeat(4,1fr);margin-bottom:16px">'+
   cartaoNumero('Faturamento no período', 'R$ '+money(total), 'var(--ok)')+
   cartaoNumero('Vendas concluídas', qtdVendas, 'var(--tx)')+
   cartaoNumero('Ticket médio', 'R$ '+money(ticketMedio), 'var(--tx)')+
   cartaoNumero('Cancelamentos', canceladas, canceladas?'var(--err)':'var(--tx)')+
   '</div>'+
   '<div class="card">'+
    '<h2 style="margin:0 0 16px">Faturamento por dia</h2>'+
    (dias.length ? dias.map(function(d){
      var pct = Math.round((porDia[d]/maxDia)*100);
      return '<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">'+
       '<span style="width:90px;font-size:12.5px;color:var(--tx2)">'+E(d)+'</span>'+
       '<div style="flex:1;background:var(--bg2);border-radius:4px;height:18px;overflow:hidden">'+
        '<div style="width:'+pct+'%;background:var(--acc);height:100%"></div></div>'+
       '<span style="width:90px;text-align:right;font-size:12.5px">R$ '+money(porDia[d])+'</span></div>';
    }).join('') : '<p class="hint" style="margin:0">Nenhuma venda concluída no período.</p>')+
   '</div>';
}
function cartaoNumero(rotulo, valor, cor){
  return '<div class="card" style="padding:16px"><div style="color:var(--tx2);font-size:12.5px;margin-bottom:6px">'+
   E(rotulo)+'</div><div style="font-size:22px;font-weight:600;color:'+cor+'">'+valor+'</div></div>';
}

/* ---------- Faturamento (por canal e forma de pagamento) ---------- */
function montarFaturamento(){
  var concluidas = CACHE_VENDAS_REL.filter(function(v){return v.situacao==='concluida'});
  var porCanal = {};
  concluidas.forEach(function(v){
    var c = v.origem || 'outro';
    porCanal[c] = (porCanal[c]||0) + Number(v.total);
  });
  var porForma = {};
  CACHE_PAGAMENTOS_REL.forEach(function(p){
    var vendaOk = concluidas.some(function(v){return v.id===p.venda_id});
    if(!vendaOk) return;
    var f = p.forma_pagamento_id || 'sem-forma';
    porForma[f] = (porForma[f]||0) + Number(p.valor);
  });
  var rotCanal = { pdv:'Frente de Loja (PDV)', agendamento:'Agendamento', externa:'Externa', outro:'Outro' };
  return '<div class="row2">'+
   '<div class="card"><h2 style="margin:0 0 14px">Por canal de venda</h2>'+
    '<table><thead><tr><th>Canal</th><th style="text-align:right">Total</th></tr></thead><tbody>'+
    Object.keys(porCanal).map(function(c){
      return '<tr><td>'+E(rotCanal[c]||c)+'</td><td style="text-align:right">R$ '+money(porCanal[c])+'</td></tr>';
    }).join('')+
    (!Object.keys(porCanal).length?'<tr><td colspan="2" style="color:var(--tx2)">Nada no período.</td></tr>':'')+
    '</tbody></table></div>'+
   '<div class="card"><h2 style="margin:0 0 14px">Por forma de pagamento</h2>'+
    '<table><thead><tr><th>Forma</th><th style="text-align:right">Total</th></tr></thead><tbody>'+
    Object.keys(porForma).map(function(f){
      return '<tr><td>'+E(nomeForma(f))+'</td><td style="text-align:right">R$ '+money(porForma[f])+'</td></tr>';
    }).join('')+
    (!Object.keys(porForma).length?'<tr><td colspan="2" style="color:var(--tx2)">Nada no período.</td></tr>':'')+
    '</tbody></table></div>'+
   '</div>';
}
function nomeForma(id){
  if(id==='sem-forma') return 'Sem forma definida';
  var f = (CACHE_FORMAS_PAG||[]).find(function(x){return x.id===id});
  return f ? f.nome : '—';
}

/* ---------- Itens Mais Vendidos ---------- */
function montarItensMaisVendidos(){
  var idsConcluidas = CACHE_VENDAS_REL.filter(function(v){return v.situacao==='concluida'}).map(function(v){return v.id});
  var porItem = {};
  CACHE_ITENS_VENDA_REL.filter(function(iv){return idsConcluidas.indexOf(iv.venda_id)>=0}).forEach(function(iv){
    var k = iv.item_catalogo_id || iv.nome;
    if(!porItem[k]) porItem[k] = { nome: iv.nome, quantidade:0, total:0 };
    porItem[k].quantidade += Number(iv.quantidade);
    porItem[k].total += Number(iv.total);
  });
  var lista = Object.keys(porItem).map(function(k){return porItem[k]}).sort(function(a,b){return b.total-a.total});
  return '<div class="card"><h2 style="margin:0 0 14px">Itens Mais Vendidos</h2>'+
   '<table><thead><tr><th>Item</th><th style="text-align:right">Quantidade</th>'+
    '<th style="text-align:right">Total</th></tr></thead><tbody>'+
   lista.map(function(it){
     return '<tr><td>'+E(it.nome)+'</td><td style="text-align:right">'+it.quantidade+'</td>'+
      '<td style="text-align:right">R$ '+money(it.total)+'</td></tr>';
   }).join('')+
   (!lista.length?'<tr><td colspan="3" style="color:var(--tx2)">Nada vendido no período.</td></tr>':'')+
   '</tbody></table></div>';
}

/* ---------- Cancelamentos ---------- */
function montarCancelamentos(){
  var concluidasOuCanceladas = CACHE_VENDAS_REL.filter(function(v){return v.situacao!=='aberta'});
  var canceladas = CACHE_VENDAS_REL.filter(function(v){return v.situacao==='cancelada'});
  var totalPerdido = canceladas.reduce(function(s,v){return s+Number(v.total)},0);
  return '<div class="card">'+
   '<h2 style="margin:0 0 6px">Cancelamentos</h2>'+
   '<p class="hint">'+canceladas.length+' venda(s) cancelada(s) no período, somando R$ '+money(totalPerdido)+'.</p>'+
   '<table><thead><tr><th>Nº</th><th>Data</th><th>Cliente</th>'+
    '<th style="text-align:right">Valor</th><th>Situação</th><th></th></tr></thead><tbody>'+
   concluidasOuCanceladas.map(function(v){
     return '<tr><td>'+(v.numero||'—')+'</td><td>'+E((v.criado_em||'').slice(0,10))+'</td>'+
      '<td>'+E(v.cliente_nome||'—')+'</td><td style="text-align:right">R$ '+money(v.total)+'</td>'+
      '<td><span class="pill '+(v.situacao==='cancelada'?'err':'ok')+'">'+
       (v.situacao==='cancelada'?'Cancelada':'Concluída')+'</span></td>'+
      '<td>'+(v.situacao==='concluida'?'<button class="btn2" onclick="cancelarVendaTela(\''+v.id+'\')">Cancelar</button>':'')+'</td></tr>';
   }).join('')+
   (!concluidasOuCanceladas.length?'<tr><td colspan="6" style="color:var(--tx2)">Nenhuma venda no período.</td></tr>':'')+
   '</tbody></table></div>';
}
async function cancelarVendaTela(id){
  if(!confirm('Cancelar esta venda? O estoque baixado volta e o lançamento financeiro é removido.')){ return; }
  var cli = cliente();
  var r = await cli.rpc('cancelar_venda', { p_venda_id: id });
  if(r.error){ toast('Não consegui cancelar: '+r.error.message); return; }
  toast('Venda cancelada — estoque devolvido, financeiro ajustado.');
  renderRelatorios();
}

/* ---------- DRE — Demonstrativo de Resultado ---------- */
function montarDRE(){
  var receitas = CACHE_LANC_REL.filter(function(l){return l.tipo==='receita'});
  var despesas = CACHE_LANC_REL.filter(function(l){return l.tipo==='despesa'});
  var totalReceita = receitas.reduce(function(s,l){return s+Number(l.valor)},0);
  var totalDespesa = despesas.reduce(function(s,l){return s+Number(l.valor)},0);
  var resultado = totalReceita - totalDespesa;

  function agruparPorCategoria(lista){
    var porCat = {};
    lista.forEach(function(l){
      var k = l.categoria_id || 'sem-categoria';
      porCat[k] = (porCat[k]||0) + Number(l.valor);
    });
    return porCat;
  }
  var receitaPorCat = agruparPorCategoria(receitas);
  var despesaPorCat = agruparPorCategoria(despesas);

  function linhasCategoria(porCat){
    return Object.keys(porCat).map(function(k){
      var nome = k==='sem-categoria' ? 'Sem categoria' : nomeCategoriaFin(k);
      return '<tr><td style="padding-left:20px;color:var(--tx2)">'+E(nome)+'</td>'+
       '<td style="text-align:right">R$ '+money(porCat[k])+'</td></tr>';
    }).join('');
  }

  return '<div class="card">'+
   '<h2 style="margin:0 0 16px">DRE — Demonstrativo de Resultado</h2>'+
   '<table><tbody>'+
    '<tr><td><b>Receitas</b></td><td style="text-align:right"><b>R$ '+money(totalReceita)+'</b></td></tr>'+
    linhasCategoria(receitaPorCat)+
    '<tr><td><b>Despesas</b></td><td style="text-align:right"><b>R$ '+money(totalDespesa)+'</b></td></tr>'+
    linhasCategoria(despesaPorCat)+
    '<tr style="border-top:2px solid var(--line)"><td><b>Resultado</b></td>'+
     '<td style="text-align:right"><b style="color:'+(resultado>=0?'var(--ok)':'var(--err)')+'">R$ '+money(resultado)+'</b></td></tr>'+
   '</tbody></table></div>';
}
