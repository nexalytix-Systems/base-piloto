/* ==========================================================
   USUÁRIOS — quem tem acesso à organização, a quais unidades e
   com qual perfil. Editar e desativar só aparecem pra quem é
   admin_organizacao — o banco já bloqueia o resto (RLS), isso aqui
   é só pra não mostrar um botão que vai dar erro na cara de quem
   não pode usar.
   ========================================================== */
var CACHE_PESSOAS = [];
var CACHE_VINCULOS = []; // pessoa_id -> [unidade_id,...]

function souAdminOrganizacao(){
  return SESSAO.pessoa && SESSAO.pessoa.cargo==='admin_organizacao';
}

async function renderUsuarios(){
  var cli = cliente();
  var { data } = await cli.from('pessoas').select('*').order('nome');
  CACHE_PESSOAS = data || [];
  await carregarPerfis();
  var { data: vinc } = await cli.from('pessoas_unidades').select('*');
  CACHE_VINCULOS = vinc || [];
  desenharUsuarios();
}
function unidadesDaPessoa(id){
  return CACHE_VINCULOS.filter(function(v){return v.pessoa_id===id})
    .map(function(v){return v.unidade_id});
}
function desenharUsuarios(){
  var admin = souAdminOrganizacao();
  var html = '<div class="card">'+
   '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">'+
    '<h2 style="margin:0">Usuários e Permissões</h2>'+
    (admin?'<button class="btn" onclick="abrirFormUsuario()">+ Novo usuário</button>':'')+
   '</div>'+
   '<table><thead><tr><th>Nome</th><th>Cargo</th><th>Unidades</th><th>Situação</th>'+
    (admin?'<th></th>':'')+'</tr></thead><tbody>'+
   CACHE_PESSOAS.map(function(p){
     var idsUn = unidadesDaPessoa(p.id);
     var nomesUn = SESSAO.unidades.filter(function(u){return idsUn.indexOf(u.id)>=0}).map(function(u){return u.nome});
     var pf = CACHE_PERFIS.find(function(x){return x.id===p.perfil_id});
     var souEu = SESSAO.pessoa && SESSAO.pessoa.id===p.id;
     return '<tr><td>'+E(p.nome)+(souEu?' <span style="color:var(--tx2);font-size:12px">(você)</span>':'')+'</td>'+
      '<td>'+rotuloCargo(p.cargo)+'<br><span style="color:var(--tx2);font-size:12px">'+
       (pf?E(pf.nome):'sem perfil')+'</span></td>'+
      '<td>'+(p.cargo==='admin_organizacao'
        ?'<span style="color:var(--tx2)">organização inteira</span>'
        :E(nomesUn.join(', ')||'nenhuma'))+'</td>'+
      '<td><span class="pill '+(p.ativo!==false?'ok':'err')+'">'+(p.ativo!==false?'Ativo':'Inativo')+'</span></td>'+
      (admin?('<td><div style="display:flex;gap:6px">'+
       '<button class="btn2" onclick="abrirEditarUsuario(\''+p.id+'\')">Editar</button>'+
       (souEu?'':'<button class="btn2" onclick="alternarAtivoUsuario(\''+p.id+'\')">'+
         (p.ativo!==false?'Desativar':'Ativar')+'</button>')+
      '</div></td>'):'')+'</tr>';
   }).join('')+
   '</tbody></table></div>';
  $('miolo').innerHTML = html;
}
function checklistUnidades(idPrefix, marcadas){
  return SESSAO.unidades.map(function(u){
    return '<label style="display:flex;gap:8px;align-items:center;font-size:14px;padding:4px 0">'+
     '<input type="checkbox" data-'+idPrefix+'-un="'+u.id+'" '+(marcadas.indexOf(u.id)>=0?'checked':'')+' style="width:auto">'+
     E(u.nome)+'</label>';
  }).join('');
}
function abrirEditarUsuario(id){
  if(!souAdminOrganizacao()){ toast('Só o administrador da organização edita usuários.'); return; }
  var p = CACHE_PESSOAS.find(function(x){return x.id===id});
  if(!p) return;
  var minhasUn = unidadesDaPessoa(id);
  var html = '<div class="modalBg" onclick="if(event.target===this)fecharModal()"><div class="modal">'+
   '<h2>Editar usuário</h2>'+
   '<div class="fld"><label>E-mail (login)</label>'+
    '<div style="padding:9px 12px;background:var(--bg2);border:1px solid var(--line);border-radius:8px;color:var(--tx2)">'+
     E(p.email||'não registrado')+'</div></div>'+
   '<div class="fld"><label>Nome *</label><input id="euNome" value="'+E(p.nome)+'"></div>'+
   '<div class="fld"><label>Cargo *</label><select id="euCargo">'+
    '<option value="operador"'+(p.cargo==='operador'?' selected':'')+'>Operador</option>'+
    '<option value="admin_unidade"'+(p.cargo==='admin_unidade'?' selected':'')+'>Administrador da unidade</option>'+
    '<option value="admin_organizacao"'+(p.cargo==='admin_organizacao'?' selected':'')+'>Administrador da organização</option>'+
   '</select></div>'+
   '<div class="fld" id="fldEuUnidades"><label>Unidades com acesso (ignorado se for Administrador da organização)</label>'+
    checklistUnidades('eu', minhasUn)+
   '</div>'+
   '<div class="fld"><label>Perfil de acesso</label><select id="euPerfil">'+
    '<option value="">Sem perfil (nenhuma tela liberada)</option>'+
    CACHE_PERFIS.filter(function(x){return x.ativo!==false}).map(function(x){
      return '<option value="'+x.id+'"'+(p.perfil_id===x.id?' selected':'')+'>'+E(x.nome)+'</option>';
    }).join('')+
   '</select></div>'+
   '<div class="fld"><label>Senha</label>'+
    '<button class="btn2" style="width:100%" onclick="abrirRedefinirSenha(\''+id+'\',\''+E(p.nome).replace(/'/g,"\\'")+'\')">Redefinir senha</button></div>'+
   '<div class="modalActions">'+
    '<button class="btn2" onclick="fecharModal()">Cancelar</button>'+
    '<button class="btn" onclick="salvarEdicaoUsuario(\''+id+'\')">Salvar</button>'+
   '</div></div></div>';
  document.body.insertAdjacentHTML('beforeend', html);
}
function abrirRedefinirSenha(id, nome){
  var html = '<div class="modalBg" onclick="if(event.target===this)fecharModal()"><div class="modal">'+
   '<h2>Redefinir senha — '+E(nome)+'</h2>'+
   '<p class="hint">A pessoa vai precisar usar essa nova senha no próximo acesso.</p>'+
   '<div class="fld"><label>Nova senha *</label><input id="rsSenha" type="text" placeholder="mínimo 6 caracteres"></div>'+
   '<div class="modalActions">'+
    '<button class="btn2" onclick="fecharModal()">Cancelar</button>'+
    '<button class="btn" onclick="confirmarRedefinirSenha(\''+id+'\')">Redefinir</button>'+
   '</div></div></div>';
  document.body.insertAdjacentHTML('beforeend', html);
}
async function confirmarRedefinirSenha(id){
  var senha = $('rsSenha').value;
  if(!senha||senha.length<6){ toast('A senha precisa ter ao menos 6 caracteres.'); return; }
  var r;
  try{
    r = await fetch(CFG.url+'/functions/v1/redefinir-senha', {
      method:'POST',
      headers: { 'Content-Type':'application/json', 'Authorization':'Bearer '+SESSAO.token, 'apikey':CFG.chave },
      body: JSON.stringify({ pessoa_id:id, nova_senha:senha })
    });
  }catch(e){
    toast('Não consegui falar com o servidor. Confira o Console (F12) — detalhe: '+((e&&e.message)||'erro de rede'));
    return;
  }
  var j = {};
  try{ j = await r.json(); }catch(e){}
  if(!r.ok){ toast('Não consegui redefinir: '+(j.erro||'falha')); return; }
  fecharModal();
  toast('Senha redefinida.');
}
async function salvarEdicaoUsuario(id){
  var nome = $('euNome').value.trim();
  if(!nome){ toast('Informe o nome.'); return; }
  var cli = cliente();
  var r = await cli.from('pessoas').update({
    nome: nome, cargo: $('euCargo').value, perfil_id: $('euPerfil').value || null
  }).eq('id', id);
  if(r.error){ toast('Não consegui salvar: '+r.error.message); return; }

  var marcadas = [];
  document.querySelectorAll('[data-eu-un]').forEach(function(el){
    if(el.checked) marcadas.push(el.getAttribute('data-eu-un'));
  });
  var antigas = unidadesDaPessoa(id);
  var paraAdicionar = marcadas.filter(function(u){return antigas.indexOf(u)<0});
  var paraRemover = antigas.filter(function(u){return marcadas.indexOf(u)<0});
  if(paraAdicionar.length){
    await cli.from('pessoas_unidades').insert(paraAdicionar.map(function(uid){
      return { pessoa_id:id, unidade_id:uid };
    }));
  }
  for(var i=0;i<paraRemover.length;i++){
    await cli.from('pessoas_unidades').delete().eq('pessoa_id', id).eq('unidade_id', paraRemover[i]);
  }

  fecharModal();
  toast('Usuário atualizado.');
  renderUsuarios();
}
async function alternarAtivoUsuario(id){
  if(!souAdminOrganizacao()){ toast('Só o administrador da organização faz isso.'); return; }
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
  if(!souAdminOrganizacao()){ toast('Só o administrador da organização cria usuários.'); return; }
  var html = '<div class="modalBg" onclick="if(event.target===this)fecharModal()"><div class="modal">'+
   '<h2>Novo usuário</h2>'+
   '<p class="hint">A pessoa recebe um e-mail de convite e define a própria senha — ninguém mais precisa digitar senha por ela.</p>'+
   '<div class="fld"><label>Nome *</label><input id="usNome"></div>'+
   '<div class="fld"><label>E-mail *</label><input id="usEmail" type="email"></div>'+
   '<div class="fld"><label>Cargo *</label><select id="usCargo">'+
    '<option value="operador">Operador</option>'+
    '<option value="admin_unidade">Administrador da unidade</option>'+
   '</select></div>'+
   '<div class="fld" id="fldUnidades"><label>Unidades com acesso * (marque uma ou mais)</label>'+
    checklistUnidades('us', [])+
   '</div>'+
   '<div class="fld"><label>Perfil de acesso *</label><select id="usPerfil">'+
    CACHE_PERFIS.filter(function(p){return p.ativo!==false}).map(function(p){
      return '<option value="'+p.id+'">'+E(p.nome)+'</option>';
    }).join('')+
   '</select></div>'+
   '<div class="modalActions">'+
    '<button class="btn2" onclick="fecharModal()">Cancelar</button>'+
    '<button class="btn" onclick="salvarUsuario()">Enviar convite</button>'+
   '</div></div></div>';
  document.body.insertAdjacentHTML('beforeend', html);
}
async function salvarUsuario(){
  var nome=$('usNome').value.trim();
  var email=$('usEmail').value.trim();
  var cargo=$('usCargo').value;
  var perfilId=$('usPerfil').value;
  var unidades = [];
  document.querySelectorAll('[data-us-un]').forEach(function(el){
    if(el.checked) unidades.push(el.getAttribute('data-us-un'));
  });
  if(!nome){ toast('Informe o nome.'); return; }
  if(!email||!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)){ toast('Informe um e-mail válido.'); return; }
  if(!unidades.length){ toast('Marque ao menos uma unidade.'); return; }
  if(!perfilId){ toast('Selecione o perfil de acesso.'); return; }

  var r;
  try{
    r = await fetch(CFG.url+'/functions/v1/criar-pessoa', {
      method:'POST',
      headers: { 'Content-Type':'application/json', 'Authorization':'Bearer '+SESSAO.token, 'apikey':CFG.chave },
      body: JSON.stringify({
        nome:nome, email:email, cargo:cargo, unidades:unidades, perfil_id:perfilId,
        redirect_to: CFG.siteUrl || (window.location.origin + window.location.pathname)
      })
    });
  }catch(e){
    toast('Não consegui falar com o servidor. Confira o Console (F12) — detalhe: '+((e&&e.message)||'erro de rede'));
    return;
  }
  var j = {};
  try{ j = await r.json(); }catch(e){}
  if(!r.ok){ toast('Não consegui enviar o convite: '+(j.erro||'falha')); return; }

  fecharModal();
  toast('Convite enviado — a pessoa recebe um e-mail pra definir a própria senha.');
  renderUsuarios();
}
