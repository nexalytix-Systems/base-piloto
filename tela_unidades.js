/* ==========================================================
   UNIDADES — lista simples + trocar a unidade atual
   ========================================================== */
function renderUnidades(){
  var admin = souAdminOrganizacao();
  var html = '<div class="card">'+
   '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">'+
    '<h2 style="margin:0">Unidades</h2>'+
    (admin?'<button class="btn" onclick="abrirFormUnidade()">+ Nova unidade</button>':'')+
   '</div>'+
   '<table><thead><tr><th>Nome</th><th>Vínculo</th><th>Situação</th><th></th></tr></thead><tbody>'+
   SESSAO.unidades.map(function(u){
     return '<tr><td>'+E(u.nome)+'</td>'+
      '<td>'+(u.tipo_vinculo==='franquia'?'Franquia':'Filial')+'</td>'+
      '<td>'+(u.pendente_admin
        ?'<span class="pill warn">Pendente</span>'
        :(u.ativa!==false?'<span class="pill ok">Ativa</span>':'<span class="pill err">Inativa</span>'))+'</td>'+
      '<td>'+(SESSAO.unidadeAtual&&SESSAO.unidadeAtual.id===u.id
        ?'<span style="color:var(--tx2);font-size:13px">unidade atual</span>'
        :'<button class="btn2" onclick="trocarUnidade(\''+u.id+'\')">Usar esta</button>')+'</td></tr>';
   }).join('')+
   (!SESSAO.unidades.length?'<tr><td colspan="4" style="color:var(--tx2)">Você não está vinculado a nenhuma unidade ainda — peça pro administrador liberar.</td></tr>':'')+
   '</tbody></table></div>';
  $('miolo').innerHTML = html;
}
function trocarUnidade(id){
  SESSAO.unidadeAtual = SESSAO.unidades.find(function(u){return u.id===id});
  toast('Trabalhando em: '+SESSAO.unidadeAtual.nome);
  renderApp();
}
function abrirFormUnidade(){
  if(!souAdminOrganizacao()){ toast('Só o administrador da organização cria unidades.'); return; }
  var html = '<div class="modalBg" onclick="if(event.target===this)fecharModal()"><div class="modal">'+
   '<h2>Nova unidade</h2>'+
   '<div class="fld"><label>Nome *</label><input id="unNome" placeholder="Ex.: Loja Shopping Sul"></div>'+
   '<div class="fld"><label>Vínculo</label><select id="unTipo">'+
    '<option value="filial">Filial</option><option value="franquia">Franquia</option>'+
   '</select></div>'+
   '<div class="modalActions">'+
    '<button class="btn2" onclick="fecharModal()">Cancelar</button>'+
    '<button class="btn" onclick="salvarUnidade()">Criar</button>'+
   '</div></div></div>';
  document.body.insertAdjacentHTML('beforeend', html);
}
async function salvarUnidade(){
  var nome = $('unNome').value.trim();
  if(!nome){ toast('Informe o nome.'); return; }
  var cli = cliente();
  var r = await cli.from('unidades').insert({
    organizacao_id: SESSAO.organizacao.id, tipo_vinculo: $('unTipo').value,
    nome: nome, pendente_admin: false
  });
  if(r.error){ toast('Não consegui criar: '+r.error.message); return; }
  var { data: unidades } = await cli.from('unidades').select('*')
    .eq('organizacao_id', SESSAO.organizacao.id).order('nome');
  SESSAO.unidades = unidades || [];
  fecharModal();
  toast('Unidade criada.');
  renderApp();
}
