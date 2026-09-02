/* ==========================================================
   CARDÁPIO DIGITAL (lado do operador) — pedidos recebidos, mesas,
   link pra compartilhar.
   ========================================================== */
var ABA_CARD = 'pedidos';
var CACHE_PEDIDOS_ONLINE = [];
var CACHE_MESAS = [];

async function renderCardapioAdmin(){
  var cli = cliente();
  var { data: pedidos } = await cli.from('pedidos_online').select('*').order('criado_em', {ascending:false});
  CACHE_PEDIDOS_ONLINE = pedidos || [];
  var { data: mesas } = await cli.from('mesas').select('*').order('numero');
  CACHE_MESAS = mesas || [];
  desenharCardapioAdmin();
}
function irParaCard(aba){ ABA_CARD=aba; renderApp(); }

function desenharCardapioAdmin(){
  if(ABA_CARD==='pedidos') return desenharPedidosOnline();
  if(ABA_CARD==='mesas') return desenharMesas();
  if(ABA_CARD==='link') return desenharLinkCardapio();
}

/* ---------- Pedidos recebidos ---------- */
function desenharPedidosOnline(){
  ligarEscuta('pedidos-online', 'pedidos_online', SESSAO.unidadeAtual&&SESSAO.unidadeAtual.id, function(payload){
    if(payload.eventType==='INSERT') toast('Novo pedido chegou!');
    renderCardapioAdmin();
  });
  var pendentes = CACHE_PEDIDOS_ONLINE.filter(function(p){return p.situacao==='pendente'});
  var outros = CACHE_PEDIDOS_ONLINE.filter(function(p){return p.situacao!=='pendente'});
  var html = '<div class="card">'+
   '<h2 style="margin:0 0 16px">Pedidos Recebidos</h2>'+
   (pendentes.length?('<div style="margin-bottom:20px">'+
    pendentes.map(function(p){return cartaoPedido(p,true);}).join('')+'</div>'):
    '<p class="hint">Nenhum pedido pendente no momento.</p>')+
   (outros.length?('<h2 style="margin:16px 0">Histórico</h2>'+outros.map(function(p){return cartaoPedido(p,false);}).join('')):'')+
   '</div>';
  $('miolo').innerHTML = html;
}
function cartaoPedido(p, ativo){
  var mesa = CACHE_MESAS.find(function(m){return m.id===p.mesa_id});
  return '<div class="card" style="margin-bottom:10px;padding:14px'+(ativo?';border-color:var(--acc)':'')+'">'+
   '<div style="display:flex;justify-content:space-between;align-items:flex-start">'+
    '<div><b>'+E(p.cliente_nome||'Cliente')+'</b> — '+
     (mesa?'Mesa '+E(mesa.numero):{cardapio:'Retirada/Entrega',totem:'Totem'}[p.origem]||'Cardápio digital')+
     '<div style="color:var(--tx2);font-size:12.5px">'+E((p.criado_em||'').replace('T',' ').slice(0,16))+'</div></div>'+
    '<span class="pill '+situacaoPedidoCor(p.situacao)+'">'+rotuloSituacaoPedido(p.situacao)+'</span>'+
   '</div>'+
   '<div style="margin:8px 0;font-weight:600">Total: R$ '+money(p.total)+'</div>'+
   (p.observacao?'<div style="color:var(--tx2);font-size:13px;margin-bottom:8px">Obs.: '+E(p.observacao)+'</div>':'')+
   (ativo?('<div style="display:flex;gap:8px">'+
     '<button class="btn" onclick="aceitarPedidoOnlineTela(\''+p.id+'\')">Aceitar</button>'+
     '<button class="btn2" onclick="recusarPedidoOnline(\''+p.id+'\')">Recusar</button>'+
    '</div>'):'')+
   '</div>';
}
function situacaoPedidoCor(s){
  if(s==='pendente') return 'warn';
  if(s==='recusado'||s==='cancelado') return 'err';
  return 'ok';
}
function rotuloSituacaoPedido(s){
  return {pendente:'Pendente',aceito:'Aceito',recusado:'Recusado',preparando:'Preparando',
    pronto:'Pronto',entregue:'Entregue',cancelado:'Cancelado'}[s] || s;
}
async function aceitarPedidoOnlineTela(id){
  var cli = cliente();
  var { error } = await cli.rpc('aceitar_pedido_online', { p_pedido_id: id });
  if(error){ toast('Não consegui aceitar: '+error.message); return; }
  toast('Pedido aceito — já virou venda.');
  renderCardapioAdmin();
}
async function recusarPedidoOnline(id){
  var cli = cliente();
  var r = await cli.from('pedidos_online').update({ situacao:'recusado' }).eq('id', id);
  if(r.error){ toast('Não consegui recusar: '+r.error.message); return; }
  toast('Pedido recusado.');
  renderCardapioAdmin();
}

/* ---------- Mesas ---------- */
function desenharMesas(){
  ligarEscuta('mesas', 'mesas', SESSAO.unidadeAtual&&SESSAO.unidadeAtual.id, function(){ renderCardapioAdmin(); });
  var html = '<div class="card">'+
   '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">'+
    '<h2 style="margin:0">Mesas</h2>'+
    '<button class="btn" onclick="abrirFormMesa()">+ Nova mesa</button>'+
   '</div>'+
   '<table><thead><tr><th>Número</th><th>Capacidade</th><th>Situação</th><th></th></tr></thead><tbody>'+
   CACHE_MESAS.map(function(m){
     return '<tr><td>'+E(m.numero)+'</td><td>'+(m.capacidade||'—')+'</td>'+
      '<td><span class="pill '+(m.situacao==='livre'?'ok':(m.situacao==='ocupada'?'warn':'err'))+'">'+
       ({livre:'Livre',ocupada:'Ocupada',fechando:'Fechando'}[m.situacao])+'</span></td>'+
      '<td><button class="btn2" onclick="abrirFormMesa(\''+m.id+'\')">Editar</button></td></tr>';
   }).join('')+
   (!CACHE_MESAS.length?'<tr><td colspan="4" style="color:var(--tx2)">Nenhuma mesa ainda.</td></tr>':'')+
   '</tbody></table></div>';
  $('miolo').innerHTML = html;
}
function abrirFormMesa(id){
  var m = id ? CACHE_MESAS.find(function(x){return x.id===id}) : null;
  var html = '<div class="modalBg" onclick="if(event.target===this)fecharModal()"><div class="modal">'+
   '<h2>'+(m?'Editar mesa':'Nova mesa')+'</h2>'+
   '<div class="fld"><label>Número *</label><input id="msNumero" value="'+E(m?m.numero:'')+'"></div>'+
   '<div class="fld"><label>Capacidade</label><input id="msCapacidade" type="number" value="'+E(m?m.capacidade:'')+'"></div>'+
   (m?'<div class="fld"><label>Situação</label><select id="msSituacao">'+
    ['livre','ocupada','fechando'].map(function(s){return '<option value="'+s+'"'+
      (m.situacao===s?' selected':'')+'>'+rotuloSituacaoPedido(s)+'</option>';}).join('')+
    '</select></div>':'')+
   '<div class="modalActions">'+
    '<button class="btn2" onclick="fecharModal()">Cancelar</button>'+
    '<button class="btn" onclick="salvarMesa('+(m?"'"+m.id+"'":'null')+')">Salvar</button>'+
   '</div></div></div>';
  document.body.insertAdjacentHTML('beforeend', html);
}
async function salvarMesa(id){
  var numero = $('msNumero').value.trim();
  if(!numero){ toast('Informe o número.'); return; }
  if(!SESSAO.unidadeAtual){ toast('Selecione uma unidade primeiro.'); return; }
  var payload = { numero:numero, capacidade: $('msCapacidade').value?parseInt($('msCapacidade').value,10):null };
  if(!id) payload.unidade_id = SESSAO.unidadeAtual.id;
  if(id) payload.situacao = $('msSituacao').value;
  var cli = cliente();
  var r = id
    ? await cli.from('mesas').update(payload).eq('id', id)
    : await cli.from('mesas').insert(payload);
  if(r.error){ toast('Não consegui salvar: '+r.error.message); return; }
  fecharModal();
  toast('Mesa salva.');
  renderCardapioAdmin();
}

/* ---------- Link do cardápio ---------- */
function desenharLinkCardapio(){
  if(!SESSAO.unidadeAtual){
    $('miolo').innerHTML = '<div class="card"><p class="hint">Selecione uma unidade primeiro.</p></div>';
    return;
  }
  var base = (CFG.siteUrl || (window.location.origin + window.location.pathname)).replace(/index\.html$/,'');
  var link = base + 'cardapio.html?loja=' + SESSAO.unidadeAtual.id;
  var html = '<div class="card">'+
   '<h2 style="margin:0 0 6px">Link do Cardápio Digital</h2>'+
   '<p class="hint">Compartilhe esse link, ou gere um QR Code pra colocar na mesa — quem abrir não precisa fazer login.</p>'+
   '<div class="fld"><input id="linkCardapio" value="'+E(link)+'" readonly onclick="this.select()"></div>'+
   '<button class="btn2" onclick="copiarLinkCardapio()">Copiar link</button>'+
   '</div>';
  $('miolo').innerHTML = html;
}
function copiarLinkCardapio(){
  var el = $('linkCardapio');
  el.select();
  document.execCommand('copy');
  toast('Link copiado.');
}
