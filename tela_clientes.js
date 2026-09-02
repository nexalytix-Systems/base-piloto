/* ==========================================================
   CLIENTES E CUPONS
   ========================================================== */
var ABA_CLI = 'clientes';
var CACHE_CLIENTES = [];
var CACHE_CUPONS = [];

async function renderClientes(){
  var cli = cliente();
  var { data: c } = await cli.from('clientes').select('*').order('nome');
  CACHE_CLIENTES = c || [];
  var { data: cp } = await cli.from('cupons').select('*').order('codigo');
  CACHE_CUPONS = cp || [];
  desenharClientes();
}
function irParaCli(aba){ ABA_CLI=aba; renderApp(); }

function desenharClientes(){
  if(ABA_CLI==='clientes') return desenharListaClientes();
  if(ABA_CLI==='cupons') return desenharListaCupons();
}

/* ---------- Clientes ---------- */
function desenharListaClientes(){
  var html = '<div class="card">'+
   '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">'+
    '<h2 style="margin:0">Clientes</h2>'+
    '<button class="btn" onclick="abrirFormCliente()">+ Novo cliente</button>'+
   '</div>'+
   '<table><thead><tr><th>Nome</th><th>Telefone</th><th>E-mail</th><th>Situação</th><th></th></tr></thead><tbody>'+
   CACHE_CLIENTES.map(function(c){
     return '<tr><td>'+E(c.nome)+'</td><td>'+E(c.telefone||'—')+'</td><td>'+E(c.email||'—')+'</td>'+
      '<td><span class="pill '+(c.ativo!==false?'ok':'err')+'">'+(c.ativo!==false?'Ativo':'Inativo')+'</span></td>'+
      '<td><div style="display:flex;gap:6px">'+
       '<button class="btn2" onclick="abrirFormCliente(\''+c.id+'\')">Editar</button>'+
       '<button class="btn2" onclick="verHistoricoCliente(\''+c.id+'\')">Histórico</button>'+
      '</div></td></tr>';
   }).join('')+
   (!CACHE_CLIENTES.length?'<tr><td colspan="5" style="color:var(--tx2)">Nenhum cliente ainda.</td></tr>':'')+
   '</tbody></table></div>';
  $('miolo').innerHTML = html;
}
function abrirFormCliente(id){
  var c = id ? CACHE_CLIENTES.find(function(x){return x.id===id}) : null;
  var html = '<div class="modalBg" onclick="if(event.target===this)fecharModal()"><div class="modal">'+
   '<h2>'+(c?'Editar cliente':'Novo cliente')+'</h2>'+
   '<div class="fld"><label>Nome *</label><input id="clNome" value="'+E(c?c.nome:'')+'"></div>'+
   '<div class="row2">'+
    '<div class="fld" style="margin:0"><label>Telefone</label><input id="clTelefone" value="'+E(c?c.telefone:'')+'"></div>'+
    '<div class="fld" style="margin:0"><label>E-mail</label><input id="clEmail" type="email" value="'+E(c?c.email:'')+'"></div>'+
   '</div>'+
   '<div class="fld" style="margin-top:12px"><label>Documento</label><input id="clDocumento" value="'+E(c?c.documento:'')+'"></div>'+
   '<div class="fld"><label>Observação</label><input id="clObservacao" value="'+E(c?c.observacao:'')+'"></div>'+
   (c?'<div class="fld"><label style="display:flex;gap:8px;align-items:center;font-size:14px">'+
    '<input type="checkbox" id="clAtivo" '+(c.ativo!==false?'checked':'')+' style="width:auto"> Cliente ativo</label></div>':'')+
   '<div class="modalActions">'+
    '<button class="btn2" onclick="fecharModal()">Cancelar</button>'+
    '<button class="btn" onclick="salvarCliente('+(c?"'"+c.id+"'":'null')+')">Salvar</button>'+
   '</div></div></div>';
  document.body.insertAdjacentHTML('beforeend', html);
}
async function salvarCliente(id){
  var nome = $('clNome').value.trim();
  if(!nome){ toast('Informe o nome.'); return; }
  var payload = {
    nome:nome, telefone:$('clTelefone').value.trim()||null, email:$('clEmail').value.trim()||null,
    documento:$('clDocumento').value.trim()||null, observacao:$('clObservacao').value.trim()||null
  };
  if(id) payload.ativo = $('clAtivo').checked;
  var cli = cliente();
  var r = id
    ? await cli.from('clientes').update(payload).eq('id', id)
    : await cli.from('clientes').insert(payload);
  if(r.error){ toast('Não consegui salvar: '+r.error.message); return; }
  fecharModal();
  toast('Cliente salvo.');
  renderClientes();
}
async function verHistoricoCliente(id){
  var c = CACHE_CLIENTES.find(function(x){return x.id===id});
  if(!c) return;
  var cli = cliente();
  var { data: vendas } = await cli.from('vendas').select('*').eq('cliente_id', id).order('criado_em', {ascending:false});
  var lista = vendas || [];
  var total = lista.filter(function(v){return v.situacao==='concluida'}).reduce(function(s,v){return s+Number(v.total)},0);
  var html = '<div class="modalBg" onclick="if(event.target===this)fecharModal()"><div class="modal">'+
   '<h2>Histórico — '+E(c.nome)+'</h2>'+
   '<p class="hint">Total comprado: R$ '+money(total)+' em '+lista.filter(function(v){return v.situacao==='concluida'}).length+' compra(s).</p>'+
   '<table><thead><tr><th>Data</th><th style="text-align:right">Valor</th><th>Situação</th></tr></thead><tbody>'+
   lista.map(function(v){
     return '<tr><td>'+E((v.criado_em||'').slice(0,10))+'</td><td style="text-align:right">R$ '+money(v.total)+'</td>'+
      '<td><span class="pill '+(v.situacao==='concluida'?'ok':(v.situacao==='cancelada'?'err':'warn'))+'">'+
       ({concluida:'Concluída',cancelada:'Cancelada',aberta:'Aberta'}[v.situacao])+'</span></td></tr>';
   }).join('')+
   (!lista.length?'<tr><td colspan="3" style="color:var(--tx2)">Nenhuma compra ainda.</td></tr>':'')+
   '</tbody></table>'+
   '<div class="modalActions"><button class="btn2" onclick="fecharModal()">Fechar</button></div></div></div>';
  document.body.insertAdjacentHTML('beforeend', html);
}

/* ---------- Cupons ---------- */
function desenharListaCupons(){
  var html = '<div class="card">'+
   '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">'+
    '<h2 style="margin:0">Cupons</h2>'+
    '<button class="btn" onclick="abrirFormCupom()">+ Novo cupom</button>'+
   '</div>'+
   '<table><thead><tr><th>Código</th><th>Desconto</th><th>Validade</th>'+
    '<th style="text-align:right">Uso</th><th>Situação</th><th></th></tr></thead><tbody>'+
   CACHE_CUPONS.map(function(c){
     return '<tr><td><b>'+E(c.codigo)+'</b></td>'+
      '<td>'+(c.tipo==='percentual'?c.valor+'%':'R$ '+money(c.valor))+'</td>'+
      '<td>'+E(c.validade||'sem validade')+'</td>'+
      '<td style="text-align:right">'+c.usado+(c.limite_uso?' / '+c.limite_uso:'')+'</td>'+
      '<td><span class="pill '+(c.ativo!==false?'ok':'err')+'">'+(c.ativo!==false?'Ativo':'Inativo')+'</span></td>'+
      '<td><button class="btn2" onclick="abrirFormCupom(\''+c.id+'\')">Editar</button></td></tr>';
   }).join('')+
   (!CACHE_CUPONS.length?'<tr><td colspan="6" style="color:var(--tx2)">Nenhum cupom ainda.</td></tr>':'')+
   '</tbody></table></div>';
  $('miolo').innerHTML = html;
}
function abrirFormCupom(id){
  var c = id ? CACHE_CUPONS.find(function(x){return x.id===id}) : null;
  var html = '<div class="modalBg" onclick="if(event.target===this)fecharModal()"><div class="modal">'+
   '<h2>'+(c?'Editar cupom':'Novo cupom')+'</h2>'+
   '<div class="fld"><label>Código *</label><input id="cpCodigo" value="'+E(c?c.codigo:'')+'" '+
    'style="text-transform:uppercase" placeholder="Ex.: BEMVINDO10"></div>'+
   '<div class="row2">'+
    '<div class="fld" style="margin:0"><label>Tipo *</label><select id="cpTipo">'+
     '<option value="percentual"'+(c&&c.tipo==='percentual'?' selected':'')+'>Percentual (%)</option>'+
     '<option value="valor_fixo"'+(c&&c.tipo==='valor_fixo'?' selected':'')+'>Valor fixo (R$)</option>'+
    '</select></div>'+
    '<div class="fld" style="margin:0"><label>Valor *</label><input id="cpValor" value="'+E(c&&c.valor?String(c.valor).replace('.',','):'')+'"></div>'+
   '</div>'+
   '<div class="row2" style="margin-top:12px">'+
    '<div class="fld" style="margin:0"><label>Validade</label><input id="cpValidade" type="date" value="'+E(c?c.validade:'')+'"></div>'+
    '<div class="fld" style="margin:0"><label>Limite de uso (vazio = sem limite)</label>'+
     '<input id="cpLimite" type="number" value="'+E(c&&c.limite_uso?c.limite_uso:'')+'"></div>'+
   '</div>'+
   (c?'<div class="fld" style="margin-top:12px"><label style="display:flex;gap:8px;align-items:center;font-size:14px">'+
    '<input type="checkbox" id="cpAtivo" '+(c.ativo!==false?'checked':'')+' style="width:auto"> Cupom ativo</label></div>':'')+
   '<div class="modalActions">'+
    '<button class="btn2" onclick="fecharModal()">Cancelar</button>'+
    '<button class="btn" onclick="salvarCupom('+(c?"'"+c.id+"'":'null')+')">Salvar</button>'+
   '</div></div></div>';
  document.body.insertAdjacentHTML('beforeend', html);
}
async function salvarCupom(id){
  var codigo = $('cpCodigo').value.trim().toUpperCase();
  var valorTxt = ($('cpValor').value||'').trim();
  if(!codigo){ toast('Informe o código.'); return; }
  if(!valorTxt){ toast('Informe o valor do desconto.'); return; }
  var payload = {
    codigo:codigo, tipo:$('cpTipo').value,
    valor: Number(valorTxt.replace(',','.'))||0,
    validade: $('cpValidade').value || null,
    limite_uso: $('cpLimite').value ? parseInt($('cpLimite').value,10) : null
  };
  if(id) payload.ativo = $('cpAtivo').checked;
  var cli = cliente();
  var r = id
    ? await cli.from('cupons').update(payload).eq('id', id)
    : await cli.from('cupons').insert(payload);
  if(r.error){ toast('Não consegui salvar: '+r.error.message); return; }
  fecharModal();
  toast('Cupom salvo.');
  renderClientes();
}
