/* ==========================================================
   PERFIS DE ACESSO — cada perfil carrega uma lista de telas
   liberadas. Usuário recebe um perfil pronto.
   ========================================================== */
var CACHE_PERFIS = [];
var TELAS_DISPONIVEIS = [
  {id:'pdv', nome:'Frente de Loja (PDV)'},
  {id:'agenda', nome:'Agendamentos'},
  {id:'catalogo', nome:'Catálogo'},
  {id:'financeiro', nome:'Financeiro'},
  {id:'profissionais', nome:'Profissionais'},
  {id:'unidades', nome:'Unidades'},
  {id:'usuarios', nome:'Usuários e Permissões'},
  {id:'perfis', nome:'Perfis de Acesso'}
];

async function carregarPerfis(){
  var cli = cliente();
  var { data } = await cli.from('perfis_acesso').select('*').order('nome');
  CACHE_PERFIS = data || [];
}
async function renderPerfis(){
  await carregarPerfis();
  var html = '<div class="card">'+
   '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">'+
    '<h2 style="margin:0">Perfis de Acesso</h2>'+
    '<button class="btn" onclick="abrirFormPerfil()">+ Novo perfil</button>'+
   '</div>'+
   '<table><thead><tr><th>Nome</th><th>Telas liberadas</th><th>Situação</th><th></th></tr></thead><tbody>'+
   CACHE_PERFIS.map(function(p){
     var nomes = (p.telas_permitidas||[]).map(function(id){
       var t = TELAS_DISPONIVEIS.find(function(x){return x.id===id});
       return t ? t.nome : id;
     });
     return '<tr><td>'+E(p.nome)+'</td>'+
      '<td style="color:var(--tx2);font-size:13px">'+E(nomes.join(', ')||'nenhuma')+'</td>'+
      '<td><span class="pill '+(p.ativo!==false?'ok':'err')+'">'+(p.ativo!==false?'Ativo':'Inativo')+'</span></td>'+
      '<td><button class="btn2" onclick="abrirFormPerfil(\''+p.id+'\')">Editar</button></td></tr>';
   }).join('')+
   '</tbody></table></div>';
  $('miolo').innerHTML = html;
}
function abrirFormPerfil(id){
  var p = id ? CACHE_PERFIS.find(function(x){return x.id===id}) : null;
  var atuais = p ? (p.telas_permitidas||[]) : [];
  var html = '<div class="modalBg" onclick="if(event.target===this)fecharModal()"><div class="modal">'+
   '<h2>'+(p?'Editar perfil':'Novo perfil')+'</h2>'+
   '<div class="fld"><label>Nome *</label><input id="pfNome" value="'+E(p?p.nome:'')+'"></div>'+
   '<div class="fld"><label>Telas liberadas</label>'+
    TELAS_DISPONIVEIS.map(function(t){
      return '<label style="display:flex;gap:8px;align-items:center;font-size:14px;padding:6px 0">'+
       '<input type="checkbox" data-tela="'+t.id+'" '+(atuais.indexOf(t.id)>=0?'checked':'')+' style="width:auto">'+
       E(t.nome)+'</label>';
    }).join('')+
   '</div>'+
   (p?'<div class="fld"><label style="display:flex;gap:8px;align-items:center;font-size:14px">'+
    '<input type="checkbox" id="pfAtivo" '+(p.ativo!==false?'checked':'')+' style="width:auto"> Perfil ativo</label></div>':'')+
   '<div class="modalActions">'+
    '<button class="btn2" onclick="fecharModal()">Cancelar</button>'+
    '<button class="btn" onclick="salvarPerfil('+(p?"'"+p.id+"'":'null')+')">Salvar</button>'+
   '</div></div></div>';
  document.body.insertAdjacentHTML('beforeend', html);
}
async function salvarPerfil(id){
  var nome = $('pfNome').value.trim();
  if(!nome){ toast('Informe o nome do perfil.'); return; }
  var telas = [];
  document.querySelectorAll('[data-tela]').forEach(function(el){
    if(el.checked) telas.push(el.getAttribute('data-tela'));
  });
  var payload = { nome: nome, telas_permitidas: telas };
  if(id) payload.ativo = $('pfAtivo').checked;
  var cli = cliente();
  var r = id
    ? await cli.from('perfis_acesso').update(payload).eq('id', id)
    : await cli.from('perfis_acesso').insert(payload);
  if(r.error){ toast('Não consegui salvar: '+r.error.message); return; }
  fecharModal();
  toast('Perfil salvo.');
  renderPerfis();
}
