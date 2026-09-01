/* ==========================================================
   ESTOQUE — Fornecedores, Notas de Entrada, Movimentação, Saldo
   Atual, Contagem, Transferência entre unidades, Motivos.
   A baixa por venda acontece sozinha (gatilho no banco) — aqui só
   as ações manuais.
   ========================================================== */
var ABA_EST = 'saldo';
var CACHE_FORNECEDORES = [];
var CACHE_MOTIVOS = [];
var CACHE_ESTOQUE = [];
var CACHE_MOVIMENTACOES = [];
var CACHE_NOTAS_ENTRADA = [];
var CACHE_CONTAGENS = [];
var CACHE_TRANSFERENCIAS = [];

async function renderEstoque(){
  var cli = cliente();
  await carregarCatalogo();
  var { data: forn } = await cli.from('fornecedores').select('*').order('nome');
  CACHE_FORNECEDORES = forn || [];
  var { data: mot } = await cli.from('motivos_movimentacao').select('*').order('nome');
  CACHE_MOTIVOS = mot || [];
  var { data: est } = await cli.from('estoque_unidade').select('*').eq('tipo_item','produto');
  CACHE_ESTOQUE = est || [];
  var { data: mov } = await cli.from('movimentacoes_estoque').select('*').order('criado_em', {ascending:false}).limit(100);
  CACHE_MOVIMENTACOES = mov || [];
  var { data: notas } = await cli.from('notas_entrada').select('*').order('data', {ascending:false});
  CACHE_NOTAS_ENTRADA = notas || [];
  var { data: cont } = await cli.from('contagens_estoque').select('*').order('data', {ascending:false});
  CACHE_CONTAGENS = cont || [];
  var { data: transf } = await cli.from('transferencias_estoque').select('*').order('data', {ascending:false});
  CACHE_TRANSFERENCIAS = transf || [];
  desenharEstoque();
}
function irParaEst(aba){ ABA_EST=aba; renderApp(); }
function nomeItemCat(id){ var it=CACHE_CATALOGO.find(function(x){return x.id===id}); return it?it.nome:'—'; }
function nomeFornecedor(id){ var f=CACHE_FORNECEDORES.find(function(x){return x.id===id}); return f?f.nome:'—'; }
function nomeMotivo(id){ var m=CACHE_MOTIVOS.find(function(x){return x.id===id}); return m?m.nome:'—'; }
function nomeUnidadeById(id){ var u=SESSAO.unidades.find(function(x){return x.id===id}); return u?u.nome:'—'; }

function desenharEstoque(){
  if(ABA_EST==='saldo') return desenharSaldo();
  if(ABA_EST==='movimentacao') return desenharMovimentacao();
  if(ABA_EST==='notas') return desenharNotasEntrada();
  if(ABA_EST==='contagem') return desenharContagens();
  if(ABA_EST==='transferencia') return desenharTransferencias();
  if(ABA_EST==='fornecedores') return desenharFornecedores();
  if(ABA_EST==='motivos') return desenharMotivos();
}

/* ---------- Estoque Atual ---------- */
function desenharSaldo(){
  var comControle = CACHE_CATALOGO.filter(function(i){return i.tipo==='produto' && i.controla_estoque});
  var html = '<div class="card">'+
   '<h2 style="margin:0 0 6px">Estoque Atual</h2>'+
   '<p class="hint">Só aparecem aqui os produtos com "controlar estoque" marcado no Catálogo.</p>'+
   '<table><thead><tr><th>Produto</th><th style="text-align:right">Saldo</th></tr></thead><tbody>'+
   comControle.map(function(it){
     var e = CACHE_ESTOQUE.find(function(x){return x.item_id===it.id});
     var saldo = e ? Number(e.quantidade) : 0;
     return '<tr><td>'+E(it.nome)+'</td>'+
      '<td style="text-align:right'+(saldo<=0?';color:var(--err)':'')+'">'+saldo+'</td></tr>';
   }).join('')+
   (!comControle.length?'<tr><td colspan="2" style="color:var(--tx2)">Nenhum produto com controle de estoque ativado ainda — marque isso no Catálogo.</td></tr>':'')+
   '</tbody></table></div>';
  $('miolo').innerHTML = html;
}

/* ---------- Movimentação (lançamento manual: perda, ajuste...) ---------- */
function desenharMovimentacao(){
  var html = '<div class="card">'+
   '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">'+
    '<h2 style="margin:0">Movimentação de Estoque</h2>'+
    '<button class="btn" onclick="abrirFormMovimentacao()">+ Nova movimentação</button>'+
   '</div>'+
   '<table><thead><tr><th>Data</th><th>Produto</th><th>Tipo</th>'+
    '<th style="text-align:right">Quantidade</th><th>Motivo</th><th>Observação</th></tr></thead><tbody>'+
   CACHE_MOVIMENTACOES.map(function(m){
     return '<tr><td>'+E(m.data)+'</td><td>'+E(nomeItemCat(m.item_id))+'</td>'+
      '<td><span class="pill '+(m.tipo==='entrada'?'ok':'err')+'">'+(m.tipo==='entrada'?'Entrada':'Saída')+'</span></td>'+
      '<td style="text-align:right">'+m.quantidade+'</td>'+
      '<td>'+E(nomeMotivo(m.motivo_id))+'</td>'+
      '<td style="color:var(--tx2)">'+E(m.observacao||(m.venda_id?'Baixa automática por venda':'—'))+'</td></tr>';
   }).join('')+
   (!CACHE_MOVIMENTACOES.length?'<tr><td colspan="6" style="color:var(--tx2)">Nenhuma movimentação ainda.</td></tr>':'')+
   '</tbody></table></div>';
  $('miolo').innerHTML = html;
}
function abrirFormMovimentacao(){
  var produtos = CACHE_CATALOGO.filter(function(i){return i.tipo==='produto'});
  var html = '<div class="modalBg" onclick="if(event.target===this)fecharModal()"><div class="modal">'+
   '<h2>Nova movimentação</h2>'+
   '<div class="fld"><label>Produto *</label><select id="mvProduto">'+
    produtos.map(function(p){return '<option value="'+p.id+'">'+E(p.nome)+'</option>';}).join('')+
   '</select></div>'+
   '<div class="row2">'+
    '<div class="fld" style="margin:0"><label>Tipo *</label><select id="mvTipo">'+
     '<option value="entrada">Entrada</option><option value="saida">Saída</option>'+
    '</select></div>'+
    '<div class="fld" style="margin:0"><label>Quantidade *</label><input id="mvQuantidade" type="number" step="0.01"></div>'+
   '</div>'+
   '<div class="fld"><label>Motivo</label><select id="mvMotivo">'+
    '<option value="">Sem motivo definido</option>'+
    CACHE_MOTIVOS.filter(function(m){return m.ativo!==false}).map(function(m){
      return '<option value="'+m.id+'">'+E(m.nome)+'</option>';
    }).join('')+
   '</select></div>'+
   '<div class="fld"><label>Observação</label><input id="mvObservacao"></div>'+
   '<div class="modalActions">'+
    '<button class="btn2" onclick="fecharModal()">Cancelar</button>'+
    '<button class="btn" onclick="salvarMovimentacao()">Salvar</button>'+
   '</div></div></div>';
  document.body.insertAdjacentHTML('beforeend', html);
}
async function salvarMovimentacao(){
  var qtdTxt = ($('mvQuantidade').value||'').trim();
  if(!qtdTxt || Number(qtdTxt)<=0){ toast('Informe uma quantidade válida.'); return; }
  if(!SESSAO.unidadeAtual){ toast('Selecione uma unidade primeiro.'); return; }
  var cli = cliente();
  var r = await cli.from('movimentacoes_estoque').insert({
    unidade_id: SESSAO.unidadeAtual.id,
    tipo_item: 'produto',
    item_id: $('mvProduto').value,
    tipo: $('mvTipo').value,
    quantidade: Number(qtdTxt),
    motivo_id: $('mvMotivo').value || null,
    observacao: $('mvObservacao').value.trim() || null
  });
  if(r.error){ toast('Não consegui salvar: '+r.error.message); return; }
  fecharModal();
  toast('Movimentação registrada.');
  renderEstoque();
}

/* ---------- Notas de Entrada ---------- */
function desenharNotasEntrada(){
  var html = '<div class="card">'+
   '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">'+
    '<h2 style="margin:0">Notas de Entrada</h2>'+
    '<button class="btn" onclick="abrirFormNotaEntrada()">+ Nova nota</button>'+
   '</div>'+
   '<table><thead><tr><th>Número</th><th>Fornecedor</th><th>Data</th>'+
    '<th style="text-align:right">Valor total</th><th>Situação</th></tr></thead><tbody>'+
   CACHE_NOTAS_ENTRADA.map(function(n){
     return '<tr><td>'+E(n.numero||'—')+'</td><td>'+E(nomeFornecedor(n.fornecedor_id))+'</td>'+
      '<td>'+E(n.data)+'</td><td style="text-align:right">R$ '+money(n.valor_total)+'</td>'+
      '<td><span class="pill '+(n.situacao==='lancada'?'ok':'err')+'">'+(n.situacao==='lancada'?'Lançada':'Cancelada')+'</span></td></tr>';
   }).join('')+
   (!CACHE_NOTAS_ENTRADA.length?'<tr><td colspan="5" style="color:var(--tx2)">Nenhuma nota ainda.</td></tr>':'')+
   '</tbody></table></div>';
  $('miolo').innerHTML = html;
}
var CARRINHO_NOTA = [];
function abrirFormNotaEntrada(){
  CARRINHO_NOTA = [];
  var produtos = CACHE_CATALOGO.filter(function(i){return i.tipo==='produto'});
  var html = '<div class="modalBg" onclick="if(event.target===this)fecharModal()"><div class="modal" style="max-width:560px">'+
   '<h2>Nova nota de entrada</h2>'+
   '<div class="row2">'+
    '<div class="fld" style="margin:0"><label>Fornecedor</label><select id="neFornecedor">'+
     '<option value="">Sem fornecedor</option>'+
     CACHE_FORNECEDORES.filter(function(f){return f.ativo!==false}).map(function(f){
       return '<option value="'+f.id+'">'+E(f.nome)+'</option>';
     }).join('')+
    '</select></div>'+
    '<div class="fld" style="margin:0"><label>Número da nota</label><input id="neNumero"></div>'+
   '</div>'+
   '<div class="fld" style="margin-top:12px"><label>Adicionar item</label>'+
    '<div style="display:flex;gap:8px">'+
     '<select id="neProdutoSel" style="flex:2">'+
      produtos.map(function(p){return '<option value="'+p.id+'" data-preco="'+p.preco+'">'+E(p.nome)+'</option>';}).join('')+
     '</select>'+
     '<input id="neQtdSel" type="number" step="0.01" placeholder="Qtd" style="flex:1">'+
     '<input id="nePrecoSel" type="text" placeholder="Custo un." style="flex:1">'+
     '<button class="btn2" onclick="addItemNota()">+</button>'+
    '</div></div>'+
   '<div id="neCarrinho" style="margin:10px 0"></div>'+
   '<div class="modalActions">'+
    '<button class="btn2" onclick="fecharModal()">Cancelar</button>'+
    '<button class="btn" onclick="salvarNotaEntrada()">Lançar nota</button>'+
   '</div></div></div>';
  document.body.insertAdjacentHTML('beforeend', html);
}
function addItemNota(){
  var sel = $('neProdutoSel');
  var id = sel.value;
  var nome = sel.options[sel.selectedIndex].text;
  var qtd = Number($('neQtdSel').value)||0;
  var custo = Number((($('nePrecoSel').value)||'0').replace(',','.'))||0;
  if(qtd<=0){ toast('Informe uma quantidade válida.'); return; }
  CARRINHO_NOTA.push({ item_id:id, nome:nome, quantidade:qtd, custo_unitario:custo });
  desenharCarrinhoNota();
}
function desenharCarrinhoNota(){
  var total = CARRINHO_NOTA.reduce(function(s,i){return s+i.quantidade*i.custo_unitario},0);
  $('neCarrinho').innerHTML = CARRINHO_NOTA.map(function(i,idx){
    return '<div class="cartRow"><span>'+E(i.nome)+' x'+i.quantidade+' — R$ '+money(i.custo_unitario)+'/un</span>'+
     '<span>R$ '+money(i.quantidade*i.custo_unitario)+' <button onclick="tirarItemNota('+idx+')">remover</button></span></div>';
  }).join('') + '<div class="totalBar"><span>Total</span><span>R$ '+money(total)+'</span></div>';
}
function tirarItemNota(idx){ CARRINHO_NOTA.splice(idx,1); desenharCarrinhoNota(); }
async function salvarNotaEntrada(){
  if(!CARRINHO_NOTA.length){ toast('Adicione ao menos um item.'); return; }
  if(!SESSAO.unidadeAtual){ toast('Selecione uma unidade primeiro.'); return; }
  var cli = cliente();
  var total = CARRINHO_NOTA.reduce(function(s,i){return s+i.quantidade*i.custo_unitario},0);
  var fornecedorId = $('neFornecedor').value || null;
  var { data: nota, error: e1 } = await cli.from('notas_entrada').insert({
    unidade_id: SESSAO.unidadeAtual.id, fornecedor_id: fornecedorId,
    numero: $('neNumero').value.trim()||null, valor_total: total
  }).select().single();
  if(e1){ toast('Não consegui lançar a nota: '+e1.message); return; }

  await cli.from('nota_entrada_itens').insert(CARRINHO_NOTA.map(function(i){
    return { nota_entrada_id: nota.id, tipo_item:'produto', item_id:i.item_id,
      quantidade:i.quantidade, custo_unitario:i.custo_unitario };
  }));
  // gera a movimentação de entrada pra cada item — é isso que sobe o saldo
  await cli.from('movimentacoes_estoque').insert(CARRINHO_NOTA.map(function(i){
    return { unidade_id: SESSAO.unidadeAtual.id, tipo_item:'produto', item_id:i.item_id,
      tipo:'entrada', quantidade:i.quantidade, custo_unitario:i.custo_unitario,
      fornecedor_id:fornecedorId, observacao:'Nota de entrada'+($('neNumero').value?' #'+$('neNumero').value:'') };
  }));

  fecharModal();
  toast('Nota lançada — estoque atualizado.');
  renderEstoque();
}

/* ---------- Contagem de Estoque ---------- */
function desenharContagens(){
  var html = '<div class="card">'+
   '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">'+
    '<h2 style="margin:0">Contagem de Estoque</h2>'+
    '<button class="btn" onclick="abrirNovaContagem()">+ Nova contagem</button>'+
   '</div>'+
   '<table><thead><tr><th>Data</th><th>Situação</th><th></th></tr></thead><tbody>'+
   CACHE_CONTAGENS.map(function(c){
     return '<tr><td>'+E(c.data)+'</td>'+
      '<td><span class="pill '+(c.situacao==='concluida'?'ok':'warn')+'">'+(c.situacao==='concluida'?'Concluída':'Aberta')+'</span></td>'+
      '<td>'+(c.situacao==='aberta'?'<button class="btn2" onclick="abrirContagem(\''+c.id+'\')">Continuar</button>':'')+'</td></tr>';
   }).join('')+
   (!CACHE_CONTAGENS.length?'<tr><td colspan="3" style="color:var(--tx2)">Nenhuma contagem ainda.</td></tr>':'')+
   '</tbody></table></div>';
  $('miolo').innerHTML = html;
}
async function abrirNovaContagem(){
  if(!SESSAO.unidadeAtual){ toast('Selecione uma unidade primeiro.'); return; }
  var cli = cliente();
  var comControle = CACHE_CATALOGO.filter(function(i){return i.tipo==='produto' && i.controla_estoque});
  if(!comControle.length){ toast('Nenhum produto com controle de estoque pra contar.'); return; }
  var { data: contagem, error } = await cli.from('contagens_estoque').insert({
    unidade_id: SESSAO.unidadeAtual.id, situacao:'aberta'
  }).select().single();
  if(error){ toast('Não consegui abrir a contagem: '+error.message); return; }
  var itens = comControle.map(function(it){
    var e = CACHE_ESTOQUE.find(function(x){return x.item_id===it.id});
    return { contagem_id: contagem.id, tipo_item:'produto', item_id: it.id,
      quantidade_sistema: e?Number(e.quantidade):0, quantidade_contada: e?Number(e.quantidade):0 };
  });
  await cli.from('contagem_itens').insert(itens);
  toast('Contagem aberta — preencha o que foi contado.');
  await renderEstoque();
  abrirContagem(contagem.id);
}
async function abrirContagem(id){
  var cli = cliente();
  var { data: itens } = await cli.from('contagem_itens').select('*').eq('contagem_id', id);
  var html = '<div class="modalBg" onclick="if(event.target===this)fecharModal()"><div class="modal" style="max-width:560px">'+
   '<h2>Contagem</h2>'+
   '<table><thead><tr><th>Produto</th><th style="width:90px">Sistema</th><th style="width:110px">Contado</th></tr></thead><tbody>'+
   (itens||[]).map(function(it){
     return '<tr><td>'+E(nomeItemCat(it.item_id))+'</td><td>'+it.quantidade_sistema+'</td>'+
      '<td><input type="number" step="0.01" data-contagem-item="'+it.id+'" value="'+it.quantidade_contada+'"></td></tr>';
   }).join('')+
   '</tbody></table>'+
   '<div class="modalActions">'+
    '<button class="btn2" onclick="fecharModal()">Fechar sem concluir</button>'+
    '<button class="btn" onclick="concluirContagem(\''+id+'\')">Concluir e ajustar estoque</button>'+
   '</div></div></div>';
  document.body.insertAdjacentHTML('beforeend', html);
}
async function concluirContagem(id){
  var cli = cliente();
  var ajustes = [];
  var linhas = document.querySelectorAll('[data-contagem-item]');
  for(var i=0;i<linhas.length;i++){
    var el = linhas[i];
    var itemId = el.getAttribute('data-contagem-item');
    var novoValor = Number(el.value)||0;
    await cli.from('contagem_itens').update({ quantidade_contada: novoValor }).eq('id', itemId);
    ajustes.push(itemId);
  }
  var { data: itens } = await cli.from('contagem_itens').select('*').eq('contagem_id', id);
  var { data: motivoAjuste } = await cli.from('motivos_movimentacao')
    .select('id').eq('nome','Ajuste de contagem').maybeSingle();
  var motivoId = motivoAjuste ? motivoAjuste.id : null;
  var movs = [];
  (itens||[]).forEach(function(it){
    var dif = Number(it.quantidade_contada) - Number(it.quantidade_sistema);
    if(dif !== 0){
      movs.push({
        unidade_id: SESSAO.unidadeAtual.id, tipo_item: it.tipo_item, item_id: it.item_id,
        tipo: dif>0?'entrada':'saida', quantidade: Math.abs(dif), motivo_id: motivoId,
        observacao: 'Ajuste de contagem'
      });
    }
  });
  if(movs.length) await cli.from('movimentacoes_estoque').insert(movs);
  await cli.from('contagens_estoque').update({ situacao:'concluida' }).eq('id', id);
  fecharModal();
  toast('Contagem concluída — estoque ajustado.');
  renderEstoque();
}

/* ---------- Transferência entre unidades ---------- */
function desenharTransferencias(){
  var html = '<div class="card">'+
   '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">'+
    '<h2 style="margin:0">Transferência entre Unidades</h2>'+
    '<button class="btn" onclick="abrirFormTransferencia()">+ Nova transferência</button>'+
   '</div>'+
   '<table><thead><tr><th>Data</th><th>Origem</th><th>Destino</th><th>Situação</th><th></th></tr></thead><tbody>'+
   CACHE_TRANSFERENCIAS.map(function(t){
     return '<tr><td>'+E(t.data)+'</td><td>'+E(nomeUnidadeById(t.unidade_origem_id))+'</td>'+
      '<td>'+E(nomeUnidadeById(t.unidade_destino_id))+'</td>'+
      '<td><span class="pill '+(t.situacao==='recebida'?'ok':(t.situacao==='cancelada'?'err':'warn'))+'">'+
       ({pendente:'Pendente',recebida:'Recebida',cancelada:'Cancelada'}[t.situacao])+'</span></td>'+
      '<td>'+(t.situacao==='pendente'?'<button class="btn2" onclick="confirmarTransferencia(\''+t.id+'\')">Confirmar recebimento</button>':'')+'</td></tr>';
   }).join('')+
   (!CACHE_TRANSFERENCIAS.length?'<tr><td colspan="5" style="color:var(--tx2)">Nenhuma transferência ainda.</td></tr>':'')+
   '</tbody></table></div>';
  $('miolo').innerHTML = html;
}
var CARRINHO_TRANSF = [];
function abrirFormTransferencia(){
  CARRINHO_TRANSF = [];
  var produtos = CACHE_CATALOGO.filter(function(i){return i.tipo==='produto'});
  var outras = SESSAO.unidades.filter(function(u){return !SESSAO.unidadeAtual || u.id!==SESSAO.unidadeAtual.id});
  var html = '<div class="modalBg" onclick="if(event.target===this)fecharModal()"><div class="modal" style="max-width:560px">'+
   '<h2>Nova transferência (saindo de '+E(SESSAO.unidadeAtual?SESSAO.unidadeAtual.nome:'')+')</h2>'+
   '<div class="fld"><label>Unidade de destino *</label><select id="tfDestino">'+
    outras.map(function(u){return '<option value="'+u.id+'">'+E(u.nome)+'</option>';}).join('')+
   '</select></div>'+
   (!outras.length?'<p class="hint">Você só tem acesso a uma unidade — não tem pra onde transferir.</p>':
   '<div class="fld"><label>Adicionar item</label>'+
    '<div style="display:flex;gap:8px">'+
     '<select id="tfProdutoSel" style="flex:2">'+
      produtos.map(function(p){return '<option value="'+p.id+'">'+E(p.nome)+'</option>';}).join('')+
     '</select>'+
     '<input id="tfQtdSel" type="number" step="0.01" placeholder="Qtd" style="flex:1">'+
     '<button class="btn2" onclick="addItemTransf()">+</button>'+
    '</div></div>'+
   '<div id="tfCarrinho" style="margin:10px 0"></div>')+
   '<div class="modalActions">'+
    '<button class="btn2" onclick="fecharModal()">Cancelar</button>'+
    (outras.length?'<button class="btn" onclick="salvarTransferencia()">Enviar</button>':'')+
   '</div></div></div>';
  document.body.insertAdjacentHTML('beforeend', html);
}
function addItemTransf(){
  var sel = $('tfProdutoSel');
  var id = sel.value; var nome = sel.options[sel.selectedIndex].text;
  var qtd = Number($('tfQtdSel').value)||0;
  if(qtd<=0){ toast('Informe uma quantidade válida.'); return; }
  CARRINHO_TRANSF.push({ item_id:id, nome:nome, quantidade:qtd });
  desenharCarrinhoTransf();
}
function desenharCarrinhoTransf(){
  $('tfCarrinho').innerHTML = CARRINHO_TRANSF.map(function(i,idx){
    return '<div class="cartRow"><span>'+E(i.nome)+' x'+i.quantidade+'</span>'+
     '<button onclick="tirarItemTransf('+idx+')">remover</button></div>';
  }).join('');
}
function tirarItemTransf(idx){ CARRINHO_TRANSF.splice(idx,1); desenharCarrinhoTransf(); }
async function salvarTransferencia(){
  if(!CARRINHO_TRANSF.length){ toast('Adicione ao menos um item.'); return; }
  var cli = cliente();
  var { data: transf, error } = await cli.from('transferencias_estoque').insert({
    unidade_origem_id: SESSAO.unidadeAtual.id, unidade_destino_id: $('tfDestino').value, situacao:'pendente'
  }).select().single();
  if(error){ toast('Não consegui criar: '+error.message); return; }
  await cli.from('transferencia_itens').insert(CARRINHO_TRANSF.map(function(i){
    return { transferencia_id: transf.id, tipo_item:'produto', item_id:i.item_id, quantidade:i.quantidade };
  }));
  // saída já sai da origem na hora de enviar
  await cli.from('movimentacoes_estoque').insert(CARRINHO_TRANSF.map(function(i){
    return { unidade_id: SESSAO.unidadeAtual.id, tipo_item:'produto', item_id:i.item_id,
      tipo:'saida', quantidade:i.quantidade, observacao:'Transferência enviada' };
  }));
  fecharModal();
  toast('Transferência enviada — aguardando confirmação de recebimento.');
  renderEstoque();
}
async function confirmarTransferencia(id){
  var cli = cliente();
  var { data: transf } = await cli.from('transferencias_estoque').select('*').eq('id', id).maybeSingle();
  var { data: itens } = await cli.from('transferencia_itens').select('*').eq('transferencia_id', id);
  if(!transf || !itens){ toast('Não encontrei os dados da transferência.'); return; }
  await cli.from('movimentacoes_estoque').insert(itens.map(function(i){
    return { unidade_id: transf.unidade_destino_id, tipo_item:i.tipo_item, item_id:i.item_id,
      tipo:'entrada', quantidade:i.quantidade, observacao:'Transferência recebida' };
  }));
  await cli.from('transferencias_estoque').update({ situacao:'recebida' }).eq('id', id);
  toast('Recebimento confirmado — estoque do destino atualizado.');
  renderEstoque();
}

/* ---------- Fornecedores ---------- */
function desenharFornecedores(){
  var html = '<div class="card">'+
   '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">'+
    '<h2 style="margin:0">Fornecedores</h2>'+
    '<button class="btn" onclick="abrirFormFornecedor()">+ Novo fornecedor</button>'+
   '</div>'+
   '<table><thead><tr><th>Nome</th><th>Documento</th><th>Telefone</th><th>Situação</th><th></th></tr></thead><tbody>'+
   CACHE_FORNECEDORES.map(function(f){
     return '<tr><td>'+E(f.nome)+'</td><td>'+E(f.documento||'—')+'</td><td>'+E(f.telefone||'—')+'</td>'+
      '<td><span class="pill '+(f.ativo!==false?'ok':'err')+'">'+(f.ativo!==false?'Ativo':'Inativo')+'</span></td>'+
      '<td><button class="btn2" onclick="abrirFormFornecedor(\''+f.id+'\')">Editar</button></td></tr>';
   }).join('')+
   (!CACHE_FORNECEDORES.length?'<tr><td colspan="5" style="color:var(--tx2)">Nenhum fornecedor ainda.</td></tr>':'')+
   '</tbody></table></div>';
  $('miolo').innerHTML = html;
}
function abrirFormFornecedor(id){
  var f = id ? CACHE_FORNECEDORES.find(function(x){return x.id===id}) : null;
  var html = '<div class="modalBg" onclick="if(event.target===this)fecharModal()"><div class="modal">'+
   '<h2>'+(f?'Editar fornecedor':'Novo fornecedor')+'</h2>'+
   '<div class="fld"><label>Nome *</label><input id="fnNome" value="'+E(f?f.nome:'')+'"></div>'+
   '<div class="row2">'+
    '<div class="fld" style="margin:0"><label>Documento</label><input id="fnDocumento" value="'+E(f?f.documento:'')+'"></div>'+
    '<div class="fld" style="margin:0"><label>Telefone</label><input id="fnTelefone" value="'+E(f?f.telefone:'')+'"></div>'+
   '</div>'+
   (f?'<div class="fld" style="margin-top:12px"><label style="display:flex;gap:8px;align-items:center;font-size:14px">'+
    '<input type="checkbox" id="fnAtivo" '+(f.ativo!==false?'checked':'')+' style="width:auto"> Fornecedor ativo</label></div>':'')+
   '<div class="modalActions">'+
    '<button class="btn2" onclick="fecharModal()">Cancelar</button>'+
    '<button class="btn" onclick="salvarFornecedor('+(f?"'"+f.id+"'":'null')+')">Salvar</button>'+
   '</div></div></div>';
  document.body.insertAdjacentHTML('beforeend', html);
}
async function salvarFornecedor(id){
  var nome = $('fnNome').value.trim();
  if(!nome){ toast('Informe o nome.'); return; }
  var payload = { nome:nome, documento:$('fnDocumento').value.trim()||null, telefone:$('fnTelefone').value.trim()||null };
  if(id) payload.ativo = $('fnAtivo').checked;
  var cli = cliente();
  var r = id
    ? await cli.from('fornecedores').update(payload).eq('id', id)
    : await cli.from('fornecedores').insert(payload);
  if(r.error){ toast('Não consegui salvar: '+r.error.message); return; }
  fecharModal();
  toast('Fornecedor salvo.');
  renderEstoque();
}

/* ---------- Motivos de Movimentação ---------- */
function desenharMotivos(){
  var html = '<div class="card">'+
   '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">'+
    '<h2 style="margin:0">Motivos de Movimentação</h2>'+
    '<button class="btn" onclick="abrirFormMotivo()">+ Novo motivo</button>'+
   '</div>'+
   '<table><thead><tr><th>Nome</th><th>Tipo</th><th>Situação</th><th></th></tr></thead><tbody>'+
   CACHE_MOTIVOS.map(function(m){
     return '<tr><td>'+E(m.nome)+'</td>'+
      '<td><span class="pill '+(m.tipo==='entrada'?'ok':'err')+'">'+(m.tipo==='entrada'?'Entrada':'Saída')+'</span></td>'+
      '<td><span class="pill '+(m.ativo!==false?'ok':'err')+'">'+(m.ativo!==false?'Ativo':'Inativo')+'</span></td>'+
      '<td><button class="btn2" onclick="abrirFormMotivo(\''+m.id+'\')">Editar</button></td></tr>';
   }).join('')+
   (!CACHE_MOTIVOS.length?'<tr><td colspan="4" style="color:var(--tx2)">Nenhum motivo ainda.</td></tr>':'')+
   '</tbody></table></div>';
  $('miolo').innerHTML = html;
}
function abrirFormMotivo(id){
  var m = id ? CACHE_MOTIVOS.find(function(x){return x.id===id}) : null;
  var html = '<div class="modalBg" onclick="if(event.target===this)fecharModal()"><div class="modal">'+
   '<h2>'+(m?'Editar motivo':'Novo motivo')+'</h2>'+
   '<div class="fld"><label>Nome *</label><input id="mtNome" value="'+E(m?m.nome:'')+'" placeholder="Ex.: Perda, Compra, Brinde"></div>'+
   '<div class="fld"><label>Tipo *</label><select id="mtTipo">'+
    '<option value="entrada"'+(m&&m.tipo==='entrada'?' selected':'')+'>Entrada</option>'+
    '<option value="saida"'+(m&&m.tipo==='saida'?' selected':'')+'>Saída</option>'+
   '</select></div>'+
   (m?'<div class="fld"><label style="display:flex;gap:8px;align-items:center;font-size:14px">'+
    '<input type="checkbox" id="mtAtivo" '+(m.ativo!==false?'checked':'')+' style="width:auto"> Motivo ativo</label></div>':'')+
   '<div class="modalActions">'+
    '<button class="btn2" onclick="fecharModal()">Cancelar</button>'+
    '<button class="btn" onclick="salvarMotivo('+(m?"'"+m.id+"'":'null')+')">Salvar</button>'+
   '</div></div></div>';
  document.body.insertAdjacentHTML('beforeend', html);
}
async function salvarMotivo(id){
  var nome = $('mtNome').value.trim();
  if(!nome){ toast('Informe o nome.'); return; }
  var payload = { nome:nome, tipo:$('mtTipo').value };
  if(id) payload.ativo = $('mtAtivo').checked;
  var cli = cliente();
  var r = id
    ? await cli.from('motivos_movimentacao').update(payload).eq('id', id)
    : await cli.from('motivos_movimentacao').insert(payload);
  if(r.error){ toast('Não consegui salvar: '+r.error.message); return; }
  fecharModal();
  toast('Motivo salvo.');
  renderEstoque();
}
