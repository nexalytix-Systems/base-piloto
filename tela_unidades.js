/* ==========================================================
   UNIDADES — lista simples + trocar a unidade atual + módulos
   opcionais da organização (só admin vê essa segunda parte)
   ========================================================== */
var MODULOS_OPCIONAIS = [
  {id:'producao', nome:'Produção (Insumos e Fichas Técnicas)', descricao:'pra quem fabrica o próprio produto — receita, custo por insumo'},
  {id:'cardapio', nome:'Cardápio Digital, Mesas e Totem', descricao:'link público sem login pro cliente pedir sozinho — específico de alimentação'}
];
function renderUnidades(){
  var admin = souAdminOrganizacao();
  var mods = (SESSAO.organizacao && SESSAO.organizacao.modulos_contratados) || [];
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
        :'<button class="btn2" onclick="trocarUnidade(\''+u.id+'\')">Usar esta</button>')+
       (admin?' <button class="btn2" onclick="abrirConfigImpressao(\''+u.id+'\')">Impressão</button>':'')+
       '</td></tr>';
   }).join('')+
   (!SESSAO.unidades.length?'<tr><td colspan="4" style="color:var(--tx2)">Você não está vinculado a nenhuma unidade ainda — peça pro administrador liberar.</td></tr>':'')+
   '</tbody></table></div>'+
   (admin?('<div class="card" style="margin-top:16px">'+
    '<h2 style="margin:0 0 6px">Módulos opcionais</h2>'+
    '<p class="hint">Ligue só o que faz sentido pro seu negócio — não aparece no menu de ninguém até ligar aqui.</p>'+
    MODULOS_OPCIONAIS.map(function(m){
      var ligado = mods.indexOf(m.id)>=0;
      return '<label style="display:flex;gap:10px;align-items:flex-start;padding:10px 0;border-bottom:1px solid var(--line)">'+
       '<input type="checkbox" '+(ligado?'checked':'')+' style="width:auto;margin-top:3px" '+
       'onchange="alternarModuloOrganizacao(\''+m.id+'\',this.checked)">'+
       '<span><b style="display:block">'+E(m.nome)+'</b>'+
       '<span style="color:var(--tx2);font-size:12.5px">'+E(m.descricao)+'</span></span></label>';
    }).join('')+
   '</div>'):'');
  $('miolo').innerHTML = html;
}
async function alternarModuloOrganizacao(moduloId, ligar){
  var cli = cliente();
  var atuais = (SESSAO.organizacao.modulos_contratados||[]).slice();
  if(ligar && atuais.indexOf(moduloId)<0) atuais.push(moduloId);
  if(!ligar) atuais = atuais.filter(function(m){return m!==moduloId});
  var r = await cli.from('organizacoes').update({ modulos_contratados: atuais }).eq('id', SESSAO.organizacao.id);
  if(r.error){ toast('Não consegui atualizar: '+r.error.message); return; }
  SESSAO.organizacao.modulos_contratados = atuais;
  toast(ligar ? 'Módulo ligado.' : 'Módulo desligado.');
  renderApp();
}
function abrirConfigImpressao(unidadeId){
  var u = SESSAO.unidades.find(function(x){return x.id===unidadeId});
  if(!u) return;
  var html = '<div class="modalBg" onclick="if(event.target===this)fecharModal()"><div class="modal">'+
   '<h2>Configuração de Impressão — '+E(u.nome)+'</h2>'+
   '<label style="display:flex;gap:8px;align-items:center;font-size:14px;padding:8px 0">'+
    '<input type="checkbox" id="ciAuto" '+(u.impressao_auto?'checked':'')+' style="width:auto"> '+
    'Imprimir automaticamente ao concluir a venda</label>'+
   '<div class="fld"><label>Largura do papel</label><select id="ciLargura">'+
    '<option value="80mm"'+(u.impressao_largura!=='58mm'?' selected':'')+'>80mm (padrão)</option>'+
    '<option value="58mm"'+(u.impressao_largura==='58mm'?' selected':'')+'>58mm (bobina pequena)</option>'+
   '</select></div>'+
   '<div class="fld"><label>Texto do cabeçalho (nome/endereço da loja)</label>'+
    '<input id="ciCabecalho" value="'+E(u.impressao_cabecalho||'')+'" placeholder="Ex.: Cafeteria Doce Aroma - Rua X, 123"></div>'+
   '<div class="fld"><label>Texto do rodapé</label>'+
    '<input id="ciRodape" value="'+E(u.impressao_rodape||'')+'" placeholder="Ex.: Obrigado pela preferência!"></div>'+
   '<label style="display:flex;gap:8px;align-items:center;font-size:14px;padding:8px 0">'+
    '<input type="checkbox" id="ciLogo" '+(u.impressao_mostrar_logo!==false?'checked':'')+' style="width:auto"> '+
    'Mostrar o logo do Wirtu no rodapé do cupom</label>'+
   '<div class="modalActions">'+
    '<button class="btn2" onclick="fecharModal()">Cancelar</button>'+
    '<button class="btn" onclick="salvarConfigImpressao(\''+unidadeId+'\')">Salvar</button>'+
   '</div></div></div>';
  document.body.insertAdjacentHTML('beforeend', html);
}
async function salvarConfigImpressao(unidadeId){
  var cli = cliente();
  var payload = {
    impressao_auto: $('ciAuto').checked,
    impressao_largura: $('ciLargura').value,
    impressao_cabecalho: $('ciCabecalho').value.trim() || null,
    impressao_rodape: $('ciRodape').value.trim() || null,
    impressao_mostrar_logo: $('ciLogo').checked
  };
  var r = await cli.from('unidades').update(payload).eq('id', unidadeId);
  if(r.error){ toast('Não consegui salvar: '+r.error.message); return; }
  var u = SESSAO.unidades.find(function(x){return x.id===unidadeId});
  if(u) Object.assign(u, payload);
  fecharModal();
  toast('Configuração de impressão salva.');
  renderUnidades();
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
