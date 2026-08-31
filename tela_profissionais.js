/* ==========================================================
   PROFISSIONAIS — quem atende (só existe pra quem usa Agendamento)
   ========================================================== */
var CACHE_PROFISSIONAIS = [];

async function carregarProfissionais(){
  var cli = cliente();
  var { data } = await cli.from('profissionais').select('*')
    .eq('unidade_id', SESSAO.unidadeAtual.id).order('nome');
  CACHE_PROFISSIONAIS = data || [];
}

async function renderProfissionais(){
  await carregarProfissionais();
  var html = '<div class="card">'+
   '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">'+
    '<h2 style="margin:0">Profissionais</h2>'+
    '<button class="btn" onclick="abrirFormProfissional()">+ Novo profissional</button>'+
   '</div>'+
   '<table><thead><tr><th>Nome</th><th>Situação</th><th></th></tr></thead><tbody>'+
   CACHE_PROFISSIONAIS.map(function(p){
     return '<tr><td>'+E(p.nome)+'</td>'+
      '<td><span class="pill '+(p.ativo!==false?'ok':'err')+'">'+(p.ativo!==false?'Ativo':'Inativo')+'</span></td>'+
      '<td><button class="btn2" onclick="abrirFormProfissional(\''+p.id+'\')">Editar</button></td></tr>';
   }).join('')+
   (!CACHE_PROFISSIONAIS.length?'<tr><td colspan="3" style="color:var(--tx2)">Nenhum profissional ainda.</td></tr>':'')+
   '</tbody></table></div>';
  $('miolo').innerHTML = html;
}
function abrirFormProfissional(id){
  var p = id ? CACHE_PROFISSIONAIS.find(function(x){return x.id===id}) : null;
  var html = '<div class="modalBg" onclick="if(event.target===this)fecharModal()"><div class="modal">'+
   '<h2>'+(p?'Editar profissional':'Novo profissional')+'</h2>'+
   '<div class="fld"><label>Nome *</label><input id="prNome" value="'+E(p?p.nome:'')+'"></div>'+
   (p?'<div class="fld"><label>&nbsp;</label>'+
    '<label style="display:flex;gap:8px;align-items:center;font-size:14px;color:var(--tx)">'+
    '<input type="checkbox" id="prAtivo" '+(p.ativo!==false?'checked':'')+' style="width:auto"> Ativo</label></div>':'')+
   '<div class="modalActions">'+
    '<button class="btn2" onclick="fecharModal()">Cancelar</button>'+
    '<button class="btn" onclick="salvarProfissional('+(p?"'"+p.id+"'":'null')+')">Salvar</button>'+
   '</div></div></div>';
  document.body.insertAdjacentHTML('beforeend', html);
}
async function salvarProfissional(id){
  var nome = $('prNome').value.trim();
  if(!nome){ toast('Informe o nome.'); return; }
  var cli = cliente();
  var payload = { nome:nome, unidade_id: SESSAO.unidadeAtual.id };
  if(id) payload.ativo = $('prAtivo').checked;
  var r = id
    ? await cli.from('profissionais').update(payload).eq('id', id)
    : await cli.from('profissionais').insert(Object.assign({ref_local:uidLocal('prof')}, payload));
  if(r.error){ toast('Não consegui salvar: '+r.error.message); return; }
  fecharModal();
  toast('Profissional salvo.');
  renderProfissionais();
}
