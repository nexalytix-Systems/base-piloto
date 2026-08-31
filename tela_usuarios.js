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
   '<table><thead><tr><th>Nome</th><th>Cargo</th><th>Unidade</th><th>Situação</th></tr></thead><tbody>'+
   CACHE_PESSOAS.map(function(p){
     var un = SESSAO.unidades.find(function(u){return u.id===p.unidade_id});
     return '<tr><td>'+E(p.nome)+'</td>'+
      '<td>'+rotuloCargo(p.cargo)+'</td>'+
      '<td>'+(un?E(un.nome):'<span style="color:var(--tx2)">organização inteira</span>')+'</td>'+
      '<td><span class="pill '+(p.ativo!==false?'ok':'err')+'">'+(p.ativo!==false?'Ativo':'Inativo')+'</span></td>'+
      '</tr>';
   }).join('')+
   '</tbody></table></div>';
  $('miolo').innerHTML = html;
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
