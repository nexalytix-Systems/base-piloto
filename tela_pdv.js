/* ==========================================================
   PDV — venda imediata de produtos (ou serviços avulsos)
   ========================================================== */
var CARRINHO = [];
var CACHE_FORMAS_PAG = [];
var CACHE_CLIENTES_PDV = [];

async function renderPDV(){
  await carregarCatalogo();
  var cli = cliente();
  var { data: clientes } = await cli.from('clientes').select('*').order('nome');
  CACHE_CLIENTES_PDV = clientes || [];
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

var CUPOM_APLICADO = null;
function abrirPagamento(){
  var total = CARRINHO.reduce(function(s,i){return s+i.total},0);
  CUPOM_APLICADO = null;
  var html = '<div class="modalBg" onclick="if(event.target===this)fecharModal()"><div class="modal">'+
   '<h2>Finalizar venda</h2>'+
   '<div class="fld"><label>Cliente (opcional)</label><select id="vdCliente">'+
    '<option value="">Sem cliente identificado</option>'+
    (CACHE_CLIENTES_PDV||[]).filter(function(c){return c.ativo!==false}).map(function(c){
      return '<option value="'+c.id+'">'+E(c.nome)+'</option>';
    }).join('')+
   '</select></div>'+
   '<div class="fld"><label>Cupom de desconto (opcional)</label>'+
    '<div style="display:flex;gap:8px">'+
     '<input id="vdCupom" placeholder="Código" style="text-transform:uppercase">'+
     '<button class="btn2" onclick="aplicarCupomPdv()">Aplicar</button>'+
    '</div><div id="vdCupomMsg" style="font-size:12.5px;color:var(--tx2);margin-top:4px"></div></div>'+
   '<div class="fld"><label>Forma de pagamento *</label><select id="vdForma">'+
    CACHE_FORMAS_PAG.map(function(f){return '<option value="'+f.id+'">'+E(f.nome)+'</option>';}).join('')+
   '</select></div>'+
   '<div class="totalBar"><span>Total</span><span id="vdTotalFinal">R$ '+money(total)+'</span></div>'+
   '<div class="modalActions">'+
    '<button class="btn2" onclick="fecharModal()">Cancelar</button>'+
    '<button class="btn" onclick="confirmarVenda()">Confirmar</button>'+
   '</div></div></div>';
  document.body.insertAdjacentHTML('beforeend', html);
}
async function aplicarCupomPdv(){
  var codigo = $('vdCupom').value.trim().toUpperCase();
  if(!codigo){ return; }
  var cli = cliente();
  var { data: cupom } = await cli.from('cupons').select('*').ilike('codigo', codigo).maybeSingle();
  var msg = $('vdCupomMsg');
  var subtotal = CARRINHO.reduce(function(s,i){return s+i.total},0);
  if(!cupom || cupom.ativo===false){ msg.textContent='Cupom não encontrado ou inativo.'; msg.style.color='var(--err)'; CUPOM_APLICADO=null; }
  else if(cupom.validade && cupom.validade < new Date().toISOString().slice(0,10)){ msg.textContent='Cupom vencido.'; msg.style.color='var(--err)'; CUPOM_APLICADO=null; }
  else if(cupom.limite_uso && cupom.usado>=cupom.limite_uso){ msg.textContent='Cupom já atingiu o limite de uso.'; msg.style.color='var(--err)'; CUPOM_APLICADO=null; }
  else{
    var desconto = cupom.tipo==='percentual' ? subtotal*(Number(cupom.valor)/100) : Number(cupom.valor);
    if(desconto>subtotal) desconto=subtotal;
    CUPOM_APLICADO = { id:cupom.id, desconto:desconto };
    msg.textContent='Cupom aplicado: -R$ '+money(desconto);
    msg.style.color='var(--ok)';
  }
  var totalFinal = subtotal - (CUPOM_APLICADO?CUPOM_APLICADO.desconto:0);
  $('vdTotalFinal').textContent = 'R$ '+money(totalFinal);
}
async function confirmarVenda(){
  var cli = cliente();
  var subtotal = CARRINHO.reduce(function(s,i){return s+i.total},0);
  var desconto = CUPOM_APLICADO ? CUPOM_APLICADO.desconto : 0;
  var total = subtotal - desconto;
  var { data: venda, error: e1 } = await cli.from('vendas').insert({
    unidade_id: SESSAO.unidadeAtual.id, origem:'pdv', situacao:'concluida',
    cliente_id: $('vdCliente').value || null,
    cupom_id: CUPOM_APLICADO ? CUPOM_APLICADO.id : null,
    subtotal: subtotal, desconto: desconto, total: total,
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
  CUPOM_APLICADO = null;
  fecharModal();
  toast('Venda concluída — R$ '+money(total));
  desenharPDV();
}
