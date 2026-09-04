/* ==========================================================
   PRODUÇÃO — Insumos, Fichas Técnicas, Unidades de Medida.
   Módulo opcional: só pra quem produz o próprio produto (comida,
   por exemplo) — quem revende pronto nem precisa disso.
   ========================================================== */
var ABA_PROD = 'insumos';
var CACHE_INSUMOS = [];
var CACHE_UNIDADES_MEDIDA = [];
var CACHE_FICHAS = [];
var CACHE_ORDENS_PRODUCAO = [];

async function renderProducao(){
  var cli = cliente();
  var { data: um } = await cli.from('unidades_medida').select('*').order('nome');
  CACHE_UNIDADES_MEDIDA = um || [];
  var { data: ins } = await cli.from('insumos').select('*').order('nome');
  CACHE_INSUMOS = ins || [];
  var { data: fichas } = await cli.from('fichas_tecnicas').select('*');
  CACHE_FICHAS = fichas || [];
  var { data: ordens } = await cli.from('ordens_producao').select('*').order('criado_em', {ascending:false});
  CACHE_ORDENS_PRODUCAO = ordens || [];
  await carregarCatalogo();
  desenharProducao();
}
function irParaProd(aba){ ABA_PROD=aba; renderApp(); }
function nomeUnidadeMedida(id){ var u=CACHE_UNIDADES_MEDIDA.find(function(x){return x.id===id}); return u?u.sigla:'—'; }
function nomeInsumo(id){ var i=CACHE_INSUMOS.find(function(x){return x.id===id}); return i?i.nome:'—'; }

function desenharProducao(){
  if(ABA_PROD==='insumos') return desenharInsumos();
  if(ABA_PROD==='fichas') return desenharFichas();
  if(ABA_PROD==='ordens') return desenharOrdensProducao();
  if(ABA_PROD==='unidadesmedida') return desenharUnidadesMedida();
}

/* ---------- Insumos ---------- */
function desenharInsumos(){
  var html = '<div class="card">'+
   '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">'+
    '<h2 style="margin:0">Insumos</h2>'+
    '<button class="btn" onclick="abrirFormInsumo()">+ Novo insumo</button>'+
   '</div>'+
   '<table><thead><tr><th>Nome</th><th>Unidade</th><th style="text-align:right">Custo médio</th>'+
    '<th style="text-align:right">Estoque mínimo</th><th>Situação</th><th></th></tr></thead><tbody>'+
   CACHE_INSUMOS.map(function(i){
     return '<tr><td>'+E(i.nome)+'</td><td>'+E(nomeUnidadeMedida(i.unidade_medida_id))+'</td>'+
      '<td style="text-align:right">R$ '+money(i.custo_medio)+'</td>'+
      '<td style="text-align:right">'+i.estoque_minimo+'</td>'+
      '<td><span class="pill '+(i.ativo!==false?'ok':'err')+'">'+(i.ativo!==false?'Ativo':'Inativo')+'</span></td>'+
      '<td><button class="btn2" onclick="abrirFormInsumo(\''+i.id+'\')">Editar</button></td></tr>';
   }).join('')+
   (!CACHE_INSUMOS.length?'<tr><td colspan="6" style="color:var(--tx2)">Nenhum insumo ainda.</td></tr>':'')+
   '</tbody></table></div>';
  $('miolo').innerHTML = html;
}
function abrirFormInsumo(id){
  var i = id ? CACHE_INSUMOS.find(function(x){return x.id===id}) : null;
  if(!CACHE_UNIDADES_MEDIDA.length){
    toast('Cadastre ao menos uma Unidade de Medida primeiro.');
    return;
  }
  var html = '<div class="modalBg" onclick="if(event.target===this)fecharModal()"><div class="modal">'+
   '<h2>'+(i?'Editar insumo':'Novo insumo')+'</h2>'+
   '<div class="fld"><label>Nome *</label><input id="inNome" value="'+E(i?i.nome:'')+'" placeholder="Ex.: Farinha de trigo"></div>'+
   '<div class="row2">'+
    '<div class="fld" style="margin:0"><label>Unidade de medida *</label><select id="inUnidade">'+
     CACHE_UNIDADES_MEDIDA.map(function(u){return '<option value="'+u.id+'"'+
       (i&&i.unidade_medida_id===u.id?' selected':'')+'>'+E(u.nome)+' ('+E(u.sigla)+')</option>';}).join('')+
    '</select></div>'+
    '<div class="fld" style="margin:0"><label>Custo médio (R$) *</label>'+
     '<input id="inCusto" value="'+E(i&&i.custo_medio?String(i.custo_medio).replace('.',','):'')+'" placeholder="0,00"></div>'+
   '</div>'+
   '<div class="fld"><label>Estoque mínimo</label><input id="inMinimo" type="number" step="0.01" value="'+E(i?i.estoque_minimo:0)+'"></div>'+
   (i?'<div class="fld"><label style="display:flex;gap:8px;align-items:center;font-size:14px">'+
    '<input type="checkbox" id="inAtivo" '+(i.ativo!==false?'checked':'')+' style="width:auto"> Insumo ativo</label></div>':'')+
   '<div class="modalActions">'+
    '<button class="btn2" onclick="fecharModal()">Cancelar</button>'+
    '<button class="btn" onclick="salvarInsumo('+(i?"'"+i.id+"'":'null')+')">Salvar</button>'+
   '</div></div></div>';
  document.body.insertAdjacentHTML('beforeend', html);
}
async function salvarInsumo(id){
  var nome = $('inNome').value.trim();
  var custoTxt = ($('inCusto').value||'').trim();
  if(!nome){ toast('Informe o nome.'); return; }
  if(!custoTxt){ toast('Informe o custo médio.'); return; }
  var payload = {
    nome:nome, unidade_medida_id:$('inUnidade').value,
    custo_medio: Number(custoTxt.replace(/\./g,'').replace(',','.'))||0,
    estoque_minimo: Number($('inMinimo').value)||0
  };
  if(!SESSAO.unidadeAtual){ toast('Selecione uma unidade primeiro.'); return; }
  if(!id) payload.unidade_id = SESSAO.unidadeAtual.id;
  if(id) payload.ativo = $('inAtivo').checked;
  var cli = cliente();
  var r = id
    ? await cli.from('insumos').update(payload).eq('id', id)
    : await cli.from('insumos').insert(payload);
  if(r.error){ toast('Não consegui salvar: '+r.error.message); return; }
  fecharModal();
  toast('Insumo salvo.');
  renderProducao();
}

/* ---------- Ordens de Produção ---------- */
function desenharOrdensProducao(){
  var html = '<div class="card">'+
   '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">'+
    '<h2 style="margin:0">Ordens de Produção</h2>'+
    '<button class="btn" onclick="abrirNovaOrdemProducao()">+ Produzir em lote</button>'+
   '</div>'+
   '<table><thead><tr><th>Data</th><th>Produto</th><th style="text-align:right">Quantidade</th>'+
    '<th style="text-align:right">Custo total</th><th>Situação</th></tr></thead><tbody>'+
   CACHE_ORDENS_PRODUCAO.map(function(o){
     var ficha = CACHE_FICHAS.find(function(f){return f.id===o.ficha_id});
     var prod = ficha ? CACHE_CATALOGO.find(function(p){return p.id===ficha.item_catalogo_id}) : null;
     return '<tr><td>'+E((o.criado_em||'').slice(0,10))+'</td><td>'+E(prod?prod.nome:'—')+'</td>'+
      '<td style="text-align:right">'+o.quantidade_produzida+'</td>'+
      '<td style="text-align:right">R$ '+money(o.custo_total)+'</td>'+
      '<td><span class="pill '+(o.situacao==='concluida'?'ok':'err')+'">'+
       (o.situacao==='concluida'?'Concluída':'Cancelada')+'</span></td></tr>';
   }).join('')+
   (!CACHE_ORDENS_PRODUCAO.length?'<tr><td colspan="5" style="color:var(--tx2)">Nenhuma ordem ainda.</td></tr>':'')+
   '</tbody></table></div>';
  $('miolo').innerHTML = html;
}
function abrirNovaOrdemProducao(){
  if(!CACHE_FICHAS.length){ toast('Cadastre uma ficha técnica primeiro.'); return; }
  var html = '<div class="modalBg" onclick="if(event.target===this)fecharModal()"><div class="modal">'+
   '<h2>Produzir em lote</h2>'+
   '<div class="fld"><label>Ficha técnica (produto) *</label><select id="opFicha" onchange="atualizarPreviaOrdem()">'+
    CACHE_FICHAS.map(function(f){
      var prod = CACHE_CATALOGO.find(function(p){return p.id===f.item_catalogo_id});
      return '<option value="'+f.id+'">'+E(prod?prod.nome:'—')+' (rendimento '+f.rendimento+')</option>';
    }).join('')+
   '</select></div>'+
   '<div class="fld"><label>Quantidade a produzir *</label>'+
    '<input id="opQuantidade" type="number" step="0.01" value="1" oninput="atualizarPreviaOrdem()"></div>'+
   '<div id="opPrevia" style="margin:12px 0"></div>'+
   '<div class="fld"><label>Observação</label><input id="opObservacao"></div>'+
   '<div class="modalActions">'+
    '<button class="btn2" onclick="fecharModal()">Cancelar</button>'+
    '<button class="btn" onclick="confirmarOrdemProducao()">Produzir</button>'+
   '</div></div></div>';
  document.body.insertAdjacentHTML('beforeend', html);
  atualizarPreviaOrdem();
}
async function atualizarPreviaOrdem(){
  var fichaId = $('opFicha').value;
  var qtd = Number($('opQuantidade').value)||0;
  var ficha = CACHE_FICHAS.find(function(f){return f.id===fichaId});
  if(!ficha || qtd<=0){ $('opPrevia').innerHTML = ''; return; }
  var cli = cliente();
  var { data: itens } = await cli.from('ficha_itens').select('*').eq('ficha_id', fichaId);
  var fator = qtd / ficha.rendimento;
  var html = '<p class="hint" style="margin-bottom:6px">Vai baixar do estoque:</p>'+
   '<table><thead><tr><th>Insumo</th><th style="text-align:right">Quantidade</th></tr></thead><tbody>'+
   (itens||[]).map(function(it){
     var ins = CACHE_INSUMOS.find(function(i){return i.id===it.insumo_id});
     return '<tr><td>'+E(ins?ins.nome:'—')+'</td><td style="text-align:right">'+
      (it.quantidade*fator).toFixed(3)+' '+E(ins?nomeUnidadeMedida(ins.unidade_medida_id):'')+'</td></tr>';
   }).join('')+
   '</tbody></table>';
  $('opPrevia').innerHTML = html;
}
async function confirmarOrdemProducao(){
  var fichaId = $('opFicha').value;
  var qtd = Number($('opQuantidade').value)||0;
  if(qtd<=0){ toast('Informe uma quantidade válida.'); return; }
  if(!SESSAO.unidadeAtual){ toast('Selecione uma unidade primeiro.'); return; }
  var cli = cliente();
  var { error } = await cli.rpc('registrar_ordem_producao', {
    p_unidade_id: SESSAO.unidadeAtual.id, p_ficha_id: fichaId, p_quantidade: qtd,
    p_observacao: $('opObservacao').value.trim() || null
  });
  if(error){ toast('Não consegui registrar: '+error.message); return; }
  fecharModal();
  toast('Produção registrada — estoque atualizado.');
  renderProducao();
}

/* ---------- Unidades de Medida ---------- */
function desenharUnidadesMedida(){
  var html = '<div class="card">'+
   '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">'+
    '<h2 style="margin:0">Unidades de Medida</h2>'+
    '<button class="btn" onclick="abrirFormUnidadeMedida()">+ Nova unidade</button>'+
   '</div>'+
   '<table><thead><tr><th>Nome</th><th>Sigla</th><th>Situação</th><th></th></tr></thead><tbody>'+
   CACHE_UNIDADES_MEDIDA.map(function(u){
     return '<tr><td>'+E(u.nome)+'</td><td>'+E(u.sigla)+'</td>'+
      '<td><span class="pill '+(u.ativa!==false?'ok':'err')+'">'+(u.ativa!==false?'Ativa':'Inativa')+'</span></td>'+
      '<td><button class="btn2" onclick="abrirFormUnidadeMedida(\''+u.id+'\')">Editar</button></td></tr>';
   }).join('')+
   (!CACHE_UNIDADES_MEDIDA.length?'<tr><td colspan="4" style="color:var(--tx2)">Nenhuma ainda. Ex.: Quilograma (kg), Litro (l), Unidade (un).</td></tr>':'')+
   '</tbody></table></div>';
  $('miolo').innerHTML = html;
}
function abrirFormUnidadeMedida(id){
  var u = id ? CACHE_UNIDADES_MEDIDA.find(function(x){return x.id===id}) : null;
  var html = '<div class="modalBg" onclick="if(event.target===this)fecharModal()"><div class="modal">'+
   '<h2>'+(u?'Editar unidade de medida':'Nova unidade de medida')+'</h2>'+
   '<div class="fld"><label>Nome *</label><input id="umNome" value="'+E(u?u.nome:'')+'" placeholder="Ex.: Quilograma"></div>'+
   '<div class="fld"><label>Sigla *</label><input id="umSigla" value="'+E(u?u.sigla:'')+'" placeholder="Ex.: kg"></div>'+
   (u?'<div class="fld"><label style="display:flex;gap:8px;align-items:center;font-size:14px">'+
    '<input type="checkbox" id="umAtiva" '+(u.ativa!==false?'checked':'')+' style="width:auto"> Ativa</label></div>':'')+
   '<div class="modalActions">'+
    '<button class="btn2" onclick="fecharModal()">Cancelar</button>'+
    '<button class="btn" onclick="salvarUnidadeMedida('+(u?"'"+u.id+"'":'null')+')">Salvar</button>'+
   '</div></div></div>';
  document.body.insertAdjacentHTML('beforeend', html);
}
async function salvarUnidadeMedida(id){
  var nome = $('umNome').value.trim();
  var sigla = $('umSigla').value.trim();
  if(!nome){ toast('Informe o nome.'); return; }
  if(!sigla){ toast('Informe a sigla.'); return; }
  var payload = { nome:nome, sigla:sigla };
  if(id) payload.ativa = $('umAtiva').checked;
  var cli = cliente();
  var r = id
    ? await cli.from('unidades_medida').update(payload).eq('id', id)
    : await cli.from('unidades_medida').insert(payload);
  if(r.error){ toast('Não consegui salvar: '+r.error.message); return; }
  fecharModal();
  toast('Unidade de medida salva.');
  renderProducao();
}

/* ---------- Fichas Técnicas ---------- */
function desenharFichas(){
  var produtos = CACHE_CATALOGO.filter(function(i){return i.tipo==='produto'});
  var html = '<div class="card">'+
   '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">'+
    '<h2 style="margin:0">Fichas Técnicas</h2>'+
    '<button class="btn" onclick="abrirNovaFicha()">+ Nova ficha</button>'+
   '</div>'+
   '<table><thead><tr><th>Produto</th><th style="text-align:right">Rendimento</th>'+
    '<th style="text-align:right">Custo calculado</th><th></th></tr></thead><tbody>'+
   CACHE_FICHAS.map(function(f){
     var prod = CACHE_CATALOGO.find(function(p){return p.id===f.item_catalogo_id});
     return '<tr><td>'+E(prod?prod.nome:'—')+'</td>'+
      '<td style="text-align:right">'+f.rendimento+'</td>'+
      '<td style="text-align:right" id="custo-ficha-'+f.id+'">calculando...</td>'+
      '<td><button class="btn2" onclick="abrirFicha(\''+f.id+'\')">Editar</button></td></tr>';
   }).join('')+
   (!CACHE_FICHAS.length?'<tr><td colspan="4" style="color:var(--tx2)">Nenhuma ficha ainda.</td></tr>':'')+
   '</tbody></table></div>';
  $('miolo').innerHTML = html;
  CACHE_FICHAS.forEach(calcularCustoFicha);
}
async function calcularCustoFicha(f){
  var cli = cliente();
  var { data: itens } = await cli.from('ficha_itens').select('*').eq('ficha_id', f.id);
  var total = (itens||[]).reduce(function(s,it){
    var ins = CACHE_INSUMOS.find(function(x){return x.id===it.insumo_id});
    return s + (ins ? Number(ins.custo_medio)*Number(it.quantidade) : 0);
  }, 0);
  var custoUnitario = f.rendimento ? total/f.rendimento : total;
  var el = $('custo-ficha-'+f.id);
  if(el) el.textContent = 'R$ '+money(custoUnitario)+' /un';
}
function abrirNovaFicha(){
  var produtos = CACHE_CATALOGO.filter(function(i){return i.tipo==='produto' &&
    !CACHE_FICHAS.some(function(f){return f.item_catalogo_id===i.id})});
  if(!produtos.length){ toast('Todo produto já tem ficha, ou não há produto cadastrado.'); return; }
  var html = '<div class="modalBg" onclick="if(event.target===this)fecharModal()"><div class="modal">'+
   '<h2>Nova ficha técnica</h2>'+
   '<div class="fld"><label>Produto *</label><select id="ftProduto">'+
    produtos.map(function(p){return '<option value="'+p.id+'">'+E(p.nome)+'</option>';}).join('')+
   '</select></div>'+
   '<div class="fld"><label>Rendimento (quantas unidades essa receita produz) *</label>'+
    '<input id="ftRendimento" type="number" step="0.01" value="1"></div>'+
   '<div class="modalActions">'+
    '<button class="btn2" onclick="fecharModal()">Cancelar</button>'+
    '<button class="btn" onclick="salvarNovaFicha()">Criar e adicionar insumos</button>'+
   '</div></div></div>';
  document.body.insertAdjacentHTML('beforeend', html);
}
async function salvarNovaFicha(){
  var rendimento = Number($('ftRendimento').value)||1;
  var cli = cliente();
  var { data: ficha, error } = await cli.from('fichas_tecnicas').insert({
    item_catalogo_id: $('ftProduto').value, rendimento: rendimento
  }).select().single();
  if(error){ toast('Não consegui criar: '+error.message); return; }
  fecharModal();
  await renderProducao();
  abrirFicha(ficha.id);
}
async function abrirFicha(id){
  var f = CACHE_FICHAS.find(function(x){return x.id===id});
  if(!f) return;
  var prod = CACHE_CATALOGO.find(function(p){return p.id===f.item_catalogo_id});
  var cli = cliente();
  var { data: itens } = await cli.from('ficha_itens').select('*').eq('ficha_id', id);
  var html = '<div class="modalBg" onclick="if(event.target===this)fecharModal()"><div class="modal" style="max-width:560px">'+
   '<h2>Ficha técnica — '+E(prod?prod.nome:'')+'</h2>'+
   '<div class="fld"><label>Rendimento</label><input id="ftEditRendimento" type="number" step="0.01" value="'+f.rendimento+'"></div>'+
   '<div class="fld"><label>Adicionar insumo</label>'+
    '<div style="display:flex;gap:8px">'+
     '<select id="fiInsumoSel" style="flex:2">'+
      CACHE_INSUMOS.filter(function(i){return i.ativo!==false}).map(function(i){
        return '<option value="'+i.id+'">'+E(i.nome)+' ('+E(nomeUnidadeMedida(i.unidade_medida_id))+')</option>';
      }).join('')+
     '</select>'+
     '<input id="fiQtdSel" type="number" step="0.01" placeholder="Qtd" style="flex:1">'+
     '<button class="btn2" onclick="addItemFicha(\''+id+'\')">+</button>'+
    '</div></div>'+
   '<table><thead><tr><th>Insumo</th><th style="text-align:right">Quantidade</th><th></th></tr></thead><tbody id="fiLista">'+
    (itens||[]).map(function(it){
      return '<tr><td>'+E(nomeInsumo(it.insumo_id))+'</td><td style="text-align:right">'+it.quantidade+'</td>'+
       '<td><button class="btn2" onclick="tirarItemFicha(\''+it.id+'\',\''+id+'\')">remover</button></td></tr>';
    }).join('')+
   '</tbody></table>'+
   '<div class="modalActions">'+
    '<button class="btn2" onclick="fecharModal()">Fechar</button>'+
    '<button class="btn" onclick="salvarRendimentoFicha(\''+id+'\')">Salvar rendimento</button>'+
   '</div></div></div>';
  document.body.insertAdjacentHTML('beforeend', html);
}
async function addItemFicha(fichaId){
  var insumoId = $('fiInsumoSel').value;
  var qtd = Number($('fiQtdSel').value)||0;
  if(qtd<=0){ toast('Informe uma quantidade válida.'); return; }
  var cli = cliente();
  var r = await cli.from('ficha_itens').insert({ ficha_id:fichaId, insumo_id:insumoId, quantidade:qtd });
  if(r.error){ toast('Não consegui adicionar: '+r.error.message); return; }
  fecharModal();
  await renderProducao();
  abrirFicha(fichaId);
}
async function tirarItemFicha(itemId, fichaId){
  var cli = cliente();
  await cli.from('ficha_itens').delete().eq('id', itemId);
  fecharModal();
  await renderProducao();
  abrirFicha(fichaId);
}
async function salvarRendimentoFicha(id){
  var rendimento = Number($('ftEditRendimento').value)||1;
  var cli = cliente();
  var r = await cli.from('fichas_tecnicas').update({ rendimento:rendimento }).eq('id', id);
  if(r.error){ toast('Não consegui salvar: '+r.error.message); return; }
  fecharModal();
  toast('Ficha atualizada.');
  renderProducao();
}
