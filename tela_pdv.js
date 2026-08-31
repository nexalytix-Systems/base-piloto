/* ==========================================================
   PDV — venda imediata de produtos (ou serviços avulsos)
   ========================================================== */
var CARRINHO = [];
var CACHE_FORMAS_PAG = [];

async function renderPDV(){
  await carregarCatalogo();
  var cli = cliente();
  var { data: formas } = await cli.from('formas_pagamento').select('*').eq('ativa', true);
  CACHE_FORMAS_PAG = formas || [];
  if(!CACHE_FORMAS_PAG.length){
    await cli.from('formas_pagamento').insert([
      {nome:'Dinheiro', tipo:'dinheiro', ref_local:uidLocal('fp')},
      {nome:'Cartão', tipo:'credito', ref_local:uidLocal('fp')},
      {nome:'Pix', tipo:'pix', ref_local:uidLocal('fp')}
    ]);
    var { data: formas2 } = await cli.from('formas_pagamento').select('*').eq('ativa', true);
    CACHE_FORMAS_PAG = formas2 || [];
  }
  desenharPDV();
}

function desenharPDV(){
  var total = CARRINHO.reduce(function(s,i){return s+i.total},0);
  var html = '<div class="card">'+
   '<h2>Frente de Loja</h2>'+
   '<div class="itemGrid">'+
    CACHE_CATALOGO.filter(function(i){return i.ativo!==false}).map(function(it){
      return '<button class="itemBtn" onclick="addCarrinho(\''+it.id+'\')">'+
       '<b>'+E(it.nome)+'</b><span>R$ '+money(it.preco)+'</span></button>';
    }).join('')+
    (!CACHE_CATALOGO.length?'<p style="color:var(--tx2)">Cadastre itens no Catálogo primeiro.</p>':'')+
   '</div>'+
   '<div style="border-top:1px solid var(--line);padding-top:14px">'+
    (CARRINHO.length?CARRINHO.map(function(c,i){
      return '<div class="cartRow"><span>'+E(c.nome)+' x'+c.quantidade+'</span>'+
       '<span>R$ '+money(c.total)+' <button onclick="tirarCarrinho('+i+')">remover</button></span></div>';
    }).join(''):'<p style="color:var(--tx2)">Carrinho vazio.</p>')+
    '<div class="totalBar"><span>Total</span><span>R$ '+money(total)+'</span></div>'+
    (CARRINHO.length?'<button class="btn" style="width:100%;margin-top:10px" onclick="abrirPagamento()">Finalizar venda</button>':'')+
   '</div></div>';
  $('miolo').innerHTML = html;
}
function addCarrinho(itemId){
  var it = CACHE_CATALOGO.find(function(x){return x.id===itemId});
  if(!it) return;
  var existente = CARRINHO.find(function(c){return c.item_catalogo_id===itemId});
  if(existente){ existente.quantidade++; existente.total = existente.quantidade*it.preco; }
  else CARRINHO.push({item_catalogo_id:itemId, nome:it.nome, quantidade:1, preco_unitario:it.preco, total:it.preco});
  desenharPDV();
}
function tirarCarrinho(i){ CARRINHO.splice(i,1); desenharPDV(); }

function abrirPagamento(){
  var total = CARRINHO.reduce(function(s,i){return s+i.total},0);
  var html = '<div class="modalBg" onclick="if(event.target===this)fecharModal()"><div class="modal">'+
   '<h2>Finalizar venda — R$ '+money(total)+'</h2>'+
   '<div class="fld"><label>Cliente (opcional)</label><input id="vdCliente" placeholder="Nome do cliente"></div>'+
   '<div class="fld"><label>Forma de pagamento *</label><select id="vdForma">'+
    CACHE_FORMAS_PAG.map(function(f){return '<option value="'+f.id+'">'+E(f.nome)+'</option>';}).join('')+
   '</select></div>'+
   '<div class="modalActions">'+
    '<button class="btn2" onclick="fecharModal()">Cancelar</button>'+
    '<button class="btn" onclick="confirmarVenda()">Confirmar</button>'+
   '</div></div></div>';
  document.body.insertAdjacentHTML('beforeend', html);
}
async function confirmarVenda(){
  var cli = cliente();
  var total = CARRINHO.reduce(function(s,i){return s+i.total},0);
  var { data: venda, error: e1 } = await cli.from('vendas').insert({
    unidade_id: SESSAO.unidadeAtual.id, origem:'pdv', situacao:'concluida',
    cliente_nome: $('vdCliente').value.trim()||null, subtotal: total, total: total,
    concluida_em: new Date().toISOString(), ref_local: uidLocal('venda')
  }).select().single();
  if(e1){ toast('Não consegui gravar a venda: '+e1.message); return; }

  var itensPayload = CARRINHO.map(function(c){
    return {venda_id:venda.id, item_catalogo_id:c.item_catalogo_id, nome:c.nome,
      quantidade:c.quantidade, preco_unitario:c.preco_unitario, total:c.total, ref_local:uidLocal('iv')};
  });
  var { error: e2 } = await cli.from('itens_venda').insert(itensPayload);
  if(e2){ toast('Venda gravada, mas os itens falharam: '+e2.message); return; }

  var { error: e3 } = await cli.from('pagamentos_venda').insert({
    venda_id:venda.id, forma_pagamento_id:$('vdForma').value, valor:total, ref_local:uidLocal('pg')
  });
  if(e3){ toast('Venda gravada, mas o pagamento falhou: '+e3.message); return; }

  CARRINHO = [];
  fecharModal();
  toast('Venda concluída — R$ '+money(total));
  desenharPDV();
}
