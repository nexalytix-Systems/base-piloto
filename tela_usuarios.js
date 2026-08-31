/* ==========================================================
   USUÁRIOS — quem tem acesso à organização, e a qual unidade
   ========================================================== */
var CACHE_PESSOAS = [];

async function renderUsuarios(){
  var cli = cliente();
  var { data } = await cli.from('pessoas').select('*').order('nome');
  CACHE_PESSOAS = data || [];
  desenharUsuarios();
}
function desenharUsuarios(){
  var html = '<div class="card">'+
   '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">'+
    '<h2 style="margin:0">Usuários e Permissões</h2>'+
    '<button class="btn" onclick="abrirFormUsuario()">+ Novo usuário</button>'+
   '</div>'+
   '<table><thead><tr><th>Nome</th><th>Cargo</th><th>Unidade</th><th>Situação</th><th></th></tr></thead><tbody>'+
   CACHE_PESSOAS.map(function(p){
     var un = SESSAO.unidades.find(function(u){return u.id===p.unidade_id});
     var souEu = SESSAO.pessoa && SESSAO.pessoa.id===p.id;
     return '<tr><td>'+E(p.nome)+(souEu?' <span style="color:var(--tx2);font-size:12px">(você)</span>':'')+'</td>'+
      '<td>'+rotuloCargo(p.cargo)+'</td>'+
      '<td>'+(un?E(un.nome):'<span style="color:var(--tx2)">organização inteira</span>')+'</td>'+
      '<td><span class="pill '+(p.ativo!==false?'ok':'err')+'">'+(p.ativo!==false?'Ativo':'Inativo')+'</span></td>'+
      '<td><div style="display:flex;gap:6px">'+
       '<button class="btn2" onclick="abrirEditarUsuario(\''+p.id+'\')">Editar</button>'+
       (souEu?'':'<button class="btn2" onclick="alternarAtivoUsuario(\''+p.id+'\')">'+
         (p.ativo!==false?'Desativar':'Ativar')+'</button>')+
      '</div></td></tr>';
   }).join('')+
   '</tbody></table></div>';
  $('miolo').innerHTML = html;
}
function abrirEditarUsuario(id){
  var p = CACHE_PESSOAS.find(function(x){return x.id===id});
  if(!p) return;
  var html = '<div class="modalBg" onclick="if(event.target===this)fecharModal()"><div class="modal">'+
   '<h2>Editar usuário</h2>'+
   '<div class="fld"><label>Nome *</label><input id="euNome" value="'+E(p.nome)+'"></div>'+
   '<div class="fld"><label>Cargo *</label><select id="euCargo">'+
    '<option value="operador"'+(p.cargo==='operador'?' selected':'')+'>Operador (só a unidade dele)</option>'+
    '<option value="admin_unidade"'+(p.cargo==='admin_unidade'?' selected':'')+'>Administrador da unidade</option>'+
    '<option value="admin_organizacao"'+(p.cargo==='admin_organizacao'?' selected':'')+'>Administrador da organização</option>'+
   '</select></div>'+
   '<div class="fld" id="fldEuUnidade"><label>Unidade</label><select id="euUnidade">'+
    '<option value="">Organização inteira</option>'+
    SESSAO.unidades.map(function(u){return '<option value="'+u.id+'"'+
      (p.unidade_id===u.id?' selected':'')+'>'+E(u.nome)+'</option>';}).join('')+
   '</select></div>'+
   '<div class="modalActions">'+
    '<button class="btn2" onclick="fecharModal()">Cancelar</button>'+
    '<button class="btn" onclick="salvarEdicaoUsuario(\''+id+'\')">Salvar</button>'+
   '</div></div></div>';
  document.body.insertAdjacentHTML('beforeend', html);
}
async function salvarEdicaoUsuario(id){
  var nome = $('euNome').value.trim();
  if(!nome){ toast('Informe o nome.'); return; }
  var cli = cliente();
  var r = await cli.from('pessoas').update({
    nome: nome, cargo: $('euCargo').value, unidade_id: $('euUnidade').value || null
  }).eq('id', id);
  if(r.error){ toast('Não consegui salvar: '+r.error.message); return; }
  fecharModal();
  toast('Usuário atualizado.');
  renderUsuarios();
}
async function alternarAtivoUsuario(id){
  var p = CACHE_PESSOAS.find(function(x){return x.id===id});
  if(!p) return;
  var cli = cliente();
  var r = await cli.from('pessoas').update({ ativo: p.ativo===false }).eq('id', id);
  if(r.error){ toast('Não consegui atualizar: '+r.error.message); return; }
  toast(p.ativo===false ? 'Usuário reativado.' : 'Usuário desativado — ele não consegue mais entrar.');
  renderUsuarios();
}
function rotuloCargo(c){
  if(c==='admin_organizacao') return 'Administrador da organização';
  if(c==='admin_unidade') return 'Administrador da unidade';
  return 'Operador';
}
function abrirFormUsuario(){
  var html = '<div class="modalBg" onclick="if(event.target===this)fecharModal()"><div class="modal">'+
   '<h2>Novo usuário</h2>'+
   '<div class="fld"><label>Nome *</label><input id="usNome"></div>'+
   '<div class="row2">'+
    '<div class="fld"><label>E-mail (login) *</label><input id="usEmail" type="email"></div>'+
    '<div class="fld"><label>Senha *</label><input id="usSenha" type="text" placeholder="mín. 6 caracteres"></div>'+
   '</div>'+
   '<div class="fld"><label>Cargo *</label><select id="usCargo">'+
    '<option value="operador">Operador (só a unidade dele)</option>'+
    '<option value="admin_unidade">Administrador da unidade</option>'+
   '</select></div>'+
   '<div class="fld" id="fldUnidade"><label>Unidade *</label><select id="usUnidade">'+
    SESSAO.unidades.map(function(u){return '<option value="'+u.id+'">'+E(u.nome)+'</option>';}).join('')+
   '</select></div>'+
   '<div class="modalActions">'+
    '<button class="btn2" onclick="fecharModal()">Cancelar</button>'+
    '<button class="btn" onclick="salvarUsuario()">Criar acesso</button>'+
   '</div></div></div>';
  document.body.insertAdjacentHTML('beforeend', html);
}
async function salvarUsuario(){
  var nome=$('usNome').value.trim();
  var email=$('usEmail').value.trim();
  var senha=$('usSenha').value;
  var cargo=$('usCargo').value;
  var unidadeId=$('usUnidade').value;
  if(!nome){ toast('Informe o nome.'); return; }
  if(!email||!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)){ toast('Informe um e-mail válido.'); return; }
  if(!senha||senha.length<6){ toast('A senha precisa ter ao menos 6 caracteres.'); return; }
  if(!unidadeId){ toast('Selecione a unidade.'); return; }

  var r = await fetch(CFG.url+'/functions/v1/criar-pessoa', {
    method:'POST',
    headers: { 'Content-Type':'application/json', 'Authorization':'Bearer '+SESSAO.token, 'apikey':CFG.chave },
    body: JSON.stringify({ nome:nome, email:email, senha:senha, cargo:cargo, unidade_id:unidadeId })
  });
  var j = {};
  try{ j = await r.json(); }catch(e){}
  if(!r.ok){ toast('Não consegui criar o acesso: '+(j.erro||'falha')); return; }

  fecharModal();
  toast('Usuário criado — já pode entrar com o e-mail e senha definidos.');
  renderUsuarios();
}
