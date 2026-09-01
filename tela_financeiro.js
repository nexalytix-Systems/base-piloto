/* ==========================================================
   FINANCEIRO — Lançamentos, Contas a Pagar, Contas a Receber,
   Conciliação Bancária, Fluxo de Caixa, Contas, Categorias.
   ========================================================== */
var ABA_FIN = 'lancamentos';
var CACHE_CONTAS_FIN = [];
var CACHE_CATEGORIAS_FIN = [];
var CACHE_LANCAMENTOS = [];

async function renderFinanceiro(){
  var cli = cliente();
  var { data: contas } = await cli.from('contas_financeiras').select('*').order('nome');
  CACHE_CONTAS_FIN = contas || [];
  var { data: cats } = await cli.from('categorias_financeiras').select('*').order('ordem');
  CACHE_CATEGORIAS_FIN = cats || [];
  var { data: lanc } = await cli.from('lancamentos_financeiros').select('*').order('data_vencimento', {ascending:false});
  CACHE_LANCAMENTOS = lanc || [];
  desenharFinanceiro();
}
function irParaFin(aba){ ABA_FIN=aba; renderApp(); }

function desenharFinanceiro(){
  if(ABA_FIN==='lancamentos') return desenharLancamentos();
  if(ABA_FIN==='pagar') return desenharContasPagarReceber('despesa');
  if(ABA_FIN==='receber') return desenharContasPagarReceber('receita');
  if(ABA_FIN==='conciliacao') return desenharConciliacao();
  if(ABA_FIN==='fluxo') return desenharFluxoCaixa();
  if(ABA_FIN==='contas') return desenharContas();
  if(ABA_FIN==='categorias') return desenharCategoriasFin();
}
function nomeConta(id){ var c=CACHE_CONTAS_FIN.find(function(x){return x.id===id}); return c?c.nome:'—'; }
function nomeCategoriaFin(id){ var c=CACHE_CATEGORIAS_FIN.find(function(x){return x.id===id}); return c?c.nome:'—'; }

/* ---------- Lançamentos (visão geral, tudo) ---------- */
function desenharLancamentos(){
  var html = '<div class="card">'+
   '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">'+
    '<h2 style="margin:0">Lançamentos</h2>'+
    '<button class="btn" onclick="abrirFormLancamento()">+ Novo lançamento</button>'+
   '</div>'+
   '<table><thead><tr><th>Descrição</th><th>Tipo</th><th>Categoria</th><th>Conta</th>'+
    '<th style="text-align:right">Valor</th><th>Vencimento</th><th>Situação</th></tr></thead><tbody>'+
   CACHE_LANCAMENTOS.map(function(l){
     return '<tr><td>'+E(l.descricao||'—')+'</td>'+
      '<td><span class="pill '+(l.tipo==='receita'?'ok':'err')+'">'+(l.tipo==='receita'?'Receita':'Despesa')+'</span></td>'+
      '<td>'+E(nomeCategoriaFin(l.categoria_id))+'</td>'+
      '<td>'+E(nomeConta(l.conta_id))+'</td>'+
      '<td style="text-align:right">R$ '+money(l.valor)+'</td>'+
      '<td>'+E(l.data_vencimento||'—')+'</td>'+
      '<td>'+(l.pago?'<span class="pill ok">Pago</span>':'<span class="pill warn">Pendente</span>')+
       (l.conciliado?' <span class="pill" style="background:rgba(79,127,255,.15);color:var(--acc)">Conciliado</span>':'')+
      '</td></tr>';
   }).join('')+
   (!CACHE_LANCAMENTOS.length?'<tr><td colspan="7" style="color:var(--tx2)">Nenhum lançamento ainda.</td></tr>':'')+
   '</tbody></table></div>';
  $('miolo').innerHTML = html;
}
function abrirFormLancamento(tipoFixo){
  var html = '<div class="modalBg" onclick="if(event.target===this)fecharModal()"><div class="modal">'+
   '<h2>Novo lançamento</h2>'+
   '<div class="fld"><label>Tipo *</label><select id="lnTipo" '+(tipoFixo?'disabled':'')+'>'+
    '<option value="despesa"'+(tipoFixo==='despesa'?' selected':'')+'>Despesa (a pagar)</option>'+
    '<option value="receita"'+(tipoFixo==='receita'?' selected':'')+'>Receita (a receber)</option>'+
   '</select></div>'+
   '<div class="fld"><label>Descrição *</label><input id="lnDescricao" placeholder="Ex.: Aluguel de setembro"></div>'+
   '<div class="row2">'+
    '<div class="fld" style="margin:0"><label>Valor (R$) *</label><input id="lnValor" placeholder="0,00"></div>'+
    '<div class="fld" style="margin:0"><label>Vencimento *</label><input id="lnVencimento" type="date"></div>'+
   '</div>'+
   '<div class="fld"><label>Categoria</label><select id="lnCategoria">'+
    '<option value="">Sem categoria</option>'+
    CACHE_CATEGORIAS_FIN.filter(function(c){return c.ativa!==false}).map(function(c){
      return '<option value="'+c.id+'">'+E(c.nome)+'</option>';
    }).join('')+
   '</select></div>'+
   '<div class="fld"><label>Conta</label><select id="lnConta">'+
    '<option value="">Sem conta definida</option>'+
    CACHE_CONTAS_FIN.filter(function(c){return c.ativa!==false}).map(function(c){
      return '<option value="'+c.id+'">'+E(c.nome)+'</option>';
    }).join('')+
   '</select></div>'+
   '<div class="modalActions">'+
    '<button class="btn2" onclick="fecharModal()">Cancelar</button>'+
    '<button class="btn" onclick="salvarLancamento()">Salvar</button>'+
   '</div></div></div>';
  document.body.insertAdjacentHTML('beforeend', html);
}
async function salvarLancamento(){
  var descricao = $('lnDescricao').value.trim();
  var valorTxt = ($('lnValor').value||'').trim();
  var vencimento = $('lnVencimento').value;
  if(!descricao){ toast('Informe a descrição.'); return; }
  if(!valorTxt){ toast('Informe o valor.'); return; }
  if(!vencimento){ toast('Informe o vencimento.'); return; }
  if(!SESSAO.unidadeAtual){ toast('Selecione uma unidade primeiro.'); return; }
  var cli = cliente();
  var r = await cli.from('lancamentos_financeiros').insert({
    unidade_id: SESSAO.unidadeAtual.id,
    tipo: $('lnTipo').value,
    descricao: descricao,
    valor: Number(valorTxt.replace(/\./g,'').replace(',','.'))||0,
    data_vencimento: vencimento,
    categoria_id: $('lnCategoria').value || null,
    conta_id: $('lnConta').value || null,
    pago: false
  });
  if(r.error){ toast('Não consegui salvar: '+r.error.message); return; }
  fecharModal();
  toast('Lançamento criado.');
  renderFinanceiro();
}
async function marcarPago(id, pago){
  var cli = cliente();
  var r = await cli.from('lancamentos_financeiros').update({
    pago: pago, data_pagamento: pago ? new Date().toISOString().slice(0,10) : null
  }).eq('id', id);
  if(r.error){ toast('Não consegui atualizar: '+r.error.message); return; }
  toast(pago ? 'Marcado como pago.' : 'Marcado como pendente novamente.');
  renderFinanceiro();
}

/* ---------- Contas a Pagar / Contas a Receber ---------- */
function desenharContasPagarReceber(tipo){
  var lista = CACHE_LANCAMENTOS.filter(function(l){return l.tipo===tipo});
  var hoje = new Date().toISOString().slice(0,10);
  var titulo = tipo==='despesa' ? 'Contas a Pagar' : 'Contas a Receber';
  var html = '<div class="card">'+
   '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">'+
    '<h2 style="margin:0">'+titulo+'</h2>'+
    '<button class="btn" onclick="abrirFormLancamento(\''+tipo+'\')">+ Novo</button>'+
   '</div>'+
   '<table><thead><tr><th>Descrição</th><th>Categoria</th>'+
    '<th style="text-align:right">Valor</th><th>Vencimento</th><th>Situação</th><th></th></tr></thead><tbody>'+
   lista.map(function(l){
     var vencido = !l.pago && l.data_vencimento && l.data_vencimento < hoje;
     return '<tr><td>'+E(l.descricao||'—')+'</td>'+
      '<td>'+E(nomeCategoriaFin(l.categoria_id))+'</td>'+
      '<td style="text-align:right">R$ '+money(l.valor)+'</td>'+
      '<td>'+E(l.data_vencimento||'—')+(vencido?' <span class="pill err">Vencido</span>':'')+'</td>'+
      '<td>'+(l.pago?'<span class="pill ok">Pago em '+E(l.data_pagamento||'')+'</span>':'<span class="pill warn">Pendente</span>')+'</td>'+
      '<td>'+(l.pago
        ?'<button class="btn2" onclick="marcarPago(\''+l.id+'\',false)">Desfazer</button>'
        :'<button class="btn2" onclick="marcarPago(\''+l.id+'\',true)">Marcar como pago</button>')+'</td></tr>';
   }).join('')+
   (!lista.length?'<tr><td colspan="6" style="color:var(--tx2)">Nada por aqui ainda.</td></tr>':'')+
   '</tbody></table></div>';
  $('miolo').innerHTML = html;
}

/* ---------- Conciliação Bancária ---------- */
function desenharConciliacao(){
  var pagos = CACHE_LANCAMENTOS.filter(function(l){return l.pago});
  var html = '<div class="card">'+
   '<h2 style="margin:0 0 6px">Conciliação Bancária</h2>'+
   '<p class="hint">Marque os lançamentos já pagos que você conferiu no extrato do banco.</p>'+
   '<table><thead><tr><th>Descrição</th><th>Conta</th>'+
    '<th style="text-align:right">Valor</th><th>Pago em</th><th>Conciliado?</th></tr></thead><tbody>'+
   pagos.map(function(l){
     return '<tr><td>'+E(l.descricao||'—')+'</td>'+
      '<td>'+E(nomeConta(l.conta_id))+'</td>'+
      '<td style="text-align:right">R$ '+money(l.valor)+'</td>'+
      '<td>'+E(l.data_pagamento||'—')+'</td>'+
      '<td><label style="display:flex;gap:8px;align-items:center">'+
       '<input type="checkbox" style="width:auto" '+(l.conciliado?'checked':'')+' '+
       'onchange="alternarConciliado(\''+l.id+'\',this.checked)"> '+
       (l.conciliado?'Conciliado':'Pendente')+'</label></td></tr>';
   }).join('')+
   (!pagos.length?'<tr><td colspan="5" style="color:var(--tx2)">Nenhum lançamento pago ainda pra conciliar.</td></tr>':'')+
   '</tbody></table></div>';
  $('miolo').innerHTML = html;
}
async function alternarConciliado(id, valor){
  var cli = cliente();
  var r = await cli.from('lancamentos_financeiros').update({ conciliado: valor }).eq('id', id);
  if(r.error){ toast('Não consegui atualizar: '+r.error.message); return; }
  toast(valor ? 'Marcado como conciliado.' : 'Desmarcado.');
  renderFinanceiro();
}

/* ---------- Fluxo de Caixa ---------- */
function desenharFluxoCaixa(){
  var porDia = {};
  CACHE_LANCAMENTOS.filter(function(l){return l.pago && l.data_pagamento}).forEach(function(l){
    var d = l.data_pagamento;
    if(!porDia[d]) porDia[d] = { entradas:0, saidas:0 };
    if(l.tipo==='receita') porDia[d].entradas += Number(l.valor)||0;
    else porDia[d].saidas += Number(l.valor)||0;
  });
  var dias = Object.keys(porDia).sort();
  var saldo = 0;
  var linhas = dias.map(function(d){
    saldo += porDia[d].entradas - porDia[d].saidas;
    return { data:d, entradas:porDia[d].entradas, saidas:porDia[d].saidas, saldo:saldo };
  });
  var totalEntradas = dias.reduce(function(s,d){return s+porDia[d].entradas},0);
  var totalSaidas = dias.reduce(function(s,d){return s+porDia[d].saidas},0);
  var html = '<div class="card">'+
   '<h2 style="margin:0 0 16px">Fluxo de Caixa</h2>'+
   '<div class="row2" style="margin-bottom:16px">'+
    '<div class="card" style="padding:14px"><div style="color:var(--tx2);font-size:12.5px">Total de entradas</div>'+
     '<div style="font-size:20px;font-weight:600;color:var(--ok)">R$ '+money(totalEntradas)+'</div></div>'+
    '<div class="card" style="padding:14px"><div style="color:var(--tx2);font-size:12.5px">Total de saídas</div>'+
     '<div style="font-size:20px;font-weight:600;color:var(--err)">R$ '+money(totalSaidas)+'</div></div>'+
   '</div>'+
   '<table><thead><tr><th>Data</th><th style="text-align:right">Entradas</th>'+
    '<th style="text-align:right">Saídas</th><th style="text-align:right">Saldo acumulado</th></tr></thead><tbody>'+
   linhas.map(function(l){
     return '<tr><td>'+E(l.data)+'</td>'+
      '<td style="text-align:right;color:var(--ok)">R$ '+money(l.entradas)+'</td>'+
      '<td style="text-align:right;color:var(--err)">R$ '+money(l.saidas)+'</td>'+
      '<td style="text-align:right;font-weight:600">R$ '+money(l.saldo)+'</td></tr>';
   }).join('')+
   (!linhas.length?'<tr><td colspan="4" style="color:var(--tx2)">Nenhum lançamento pago ainda.</td></tr>':'')+
   '</tbody></table></div>';
  $('miolo').innerHTML = html;
}

/* ---------- Contas (bancárias / caixa) ---------- */
function desenharContas(){
  var html = '<div class="card">'+
   '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">'+
    '<h2 style="margin:0">Contas</h2>'+
    '<button class="btn" onclick="abrirFormConta()">+ Nova conta</button>'+
   '</div>'+
   '<table><thead><tr><th>Nome</th><th>Tipo</th><th style="text-align:right">Saldo inicial</th>'+
    '<th>Situação</th><th></th></tr></thead><tbody>'+
   CACHE_CONTAS_FIN.map(function(c){
     return '<tr><td>'+E(c.nome)+'</td>'+
      '<td>'+E({caixa:'Caixa',banco:'Banco',carteira_digital:'Carteira digital'}[c.tipo]||c.tipo)+'</td>'+
      '<td style="text-align:right">R$ '+money(c.saldo_inicial)+'</td>'+
      '<td><span class="pill '+(c.ativa!==false?'ok':'err')+'">'+(c.ativa!==false?'Ativa':'Inativa')+'</span></td>'+
      '<td><button class="btn2" onclick="abrirFormConta(\''+c.id+'\')">Editar</button></td></tr>';
   }).join('')+
   (!CACHE_CONTAS_FIN.length?'<tr><td colspan="5" style="color:var(--tx2)">Nenhuma conta ainda.</td></tr>':'')+
   '</tbody></table></div>';
  $('miolo').innerHTML = html;
}
function abrirFormConta(id){
  var c = id ? CACHE_CONTAS_FIN.find(function(x){return x.id===id}) : null;
  var html = '<div class="modalBg" onclick="if(event.target===this)fecharModal()"><div class="modal">'+
   '<h2>'+(c?'Editar conta':'Nova conta')+'</h2>'+
   '<div class="fld"><label>Nome *</label><input id="ctNome" value="'+E(c?c.nome:'')+'"></div>'+
   '<div class="fld"><label>Tipo *</label><select id="ctTipo">'+
    '<option value="caixa"'+(c&&c.tipo==='caixa'?' selected':'')+'>Caixa</option>'+
    '<option value="banco"'+(c&&c.tipo==='banco'?' selected':'')+'>Banco</option>'+
    '<option value="carteira_digital"'+(c&&c.tipo==='carteira_digital'?' selected':'')+'>Carteira digital</option>'+
   '</select></div>'+
   '<div class="fld"><label>Saldo inicial (R$)</label><input id="ctSaldo" value="'+
    E(c&&c.saldo_inicial?String(c.saldo_inicial).replace('.',','):'')+'" placeholder="0,00"></div>'+
   (c?'<div class="fld"><label style="display:flex;gap:8px;align-items:center;font-size:14px">'+
    '<input type="checkbox" id="ctAtiva" '+(c.ativa!==false?'checked':'')+' style="width:auto"> Conta ativa</label></div>':'')+
   '<div class="modalActions">'+
    '<button class="btn2" onclick="fecharModal()">Cancelar</button>'+
    '<button class="btn" onclick="salvarConta('+(c?"'"+c.id+"'":'null')+')">Salvar</button>'+
   '</div></div></div>';
  document.body.insertAdjacentHTML('beforeend', html);
}
async function salvarConta(id){
  var nome = $('ctNome').value.trim();
  if(!nome){ toast('Informe o nome.'); return; }
  var payload = {
    nome:nome, tipo:$('ctTipo').value,
    saldo_inicial: Number((($('ctSaldo').value)||'0').replace(/\./g,'').replace(',','.'))||0
  };
  if(id) payload.ativa = $('ctAtiva').checked;
  var cli = cliente();
  var r = id
    ? await cli.from('contas_financeiras').update(payload).eq('id', id)
    : await cli.from('contas_financeiras').insert(payload);
  if(r.error){ toast('Não consegui salvar: '+r.error.message); return; }
  fecharModal();
  toast('Conta salva.');
  renderFinanceiro();
}

/* ---------- Categorias Financeiras ---------- */
function desenharCategoriasFin(){
  var html = '<div class="card">'+
   '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">'+
    '<h2 style="margin:0">Categorias Financeiras</h2>'+
    '<button class="btn" onclick="abrirFormCategoriaFin()">+ Nova categoria</button>'+
   '</div>'+
   '<table><thead><tr><th>Nome</th><th>Tipo</th><th>Situação</th><th></th></tr></thead><tbody>'+
   CACHE_CATEGORIAS_FIN.map(function(c){
     return '<tr><td>'+E(c.nome)+'</td>'+
      '<td><span class="pill '+(c.tipo==='receita'?'ok':'err')+'">'+(c.tipo==='receita'?'Receita':'Despesa')+'</span></td>'+
      '<td><span class="pill '+(c.ativa!==false?'ok':'err')+'">'+(c.ativa!==false?'Ativa':'Inativa')+'</span></td>'+
      '<td><button class="btn2" onclick="abrirFormCategoriaFin(\''+c.id+'\')">Editar</button></td></tr>';
   }).join('')+
   (!CACHE_CATEGORIAS_FIN.length?'<tr><td colspan="4" style="color:var(--tx2)">Nenhuma categoria ainda.</td></tr>':'')+
   '</tbody></table></div>';
  $('miolo').innerHTML = html;
}
function abrirFormCategoriaFin(id){
  var c = id ? CACHE_CATEGORIAS_FIN.find(function(x){return x.id===id}) : null;
  var html = '<div class="modalBg" onclick="if(event.target===this)fecharModal()"><div class="modal">'+
   '<h2>'+(c?'Editar categoria':'Nova categoria')+'</h2>'+
   '<div class="fld"><label>Nome *</label><input id="cfNome" value="'+E(c?c.nome:'')+'"></div>'+
   '<div class="fld"><label>Tipo *</label><select id="cfTipo">'+
    '<option value="despesa"'+(c&&c.tipo==='despesa'?' selected':'')+'>Despesa</option>'+
    '<option value="receita"'+(c&&c.tipo==='receita'?' selected':'')+'>Receita</option>'+
   '</select></div>'+
   (c?'<div class="fld"><label style="display:flex;gap:8px;align-items:center;font-size:14px">'+
    '<input type="checkbox" id="cfAtiva" '+(c.ativa!==false?'checked':'')+' style="width:auto"> Categoria ativa</label></div>':'')+
   '<div class="modalActions">'+
    '<button class="btn2" onclick="fecharModal()">Cancelar</button>'+
    '<button class="btn" onclick="salvarCategoriaFin('+(c?"'"+c.id+"'":'null')+')">Salvar</button>'+
   '</div></div></div>';
  document.body.insertAdjacentHTML('beforeend', html);
}
async function salvarCategoriaFin(id){
  var nome = $('cfNome').value.trim();
  if(!nome){ toast('Informe o nome.'); return; }
  var payload = { nome:nome, tipo:$('cfTipo').value };
  if(id) payload.ativa = $('cfAtiva').checked;
  var cli = cliente();
  var r = id
    ? await cli.from('categorias_financeiras').update(payload).eq('id', id)
    : await cli.from('categorias_financeiras').insert(payload);
  if(r.error){ toast('Não consegui salvar: '+r.error.message); return; }
  fecharModal();
  toast('Categoria salva.');
  renderFinanceiro();
}
