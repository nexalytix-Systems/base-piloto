/* ==========================================================
   CATÁLOGO — item vendável genérico (produto ou serviço)
   ========================================================== */
var CACHE_CATALOGO = [];
var CACHE_CATEGORIAS = [];

async function carregarCatalogo(){
  var cli = cliente();
  var unId = SESSAO.unidadeAtual ? SESSAO.unidadeAtual.id : null;
  var { data: cats } = await cli.from('categorias_catalogo').select('*')
    .or('unidade_id.is.null'+(unId?',unidade_id.eq.'+unId:'')).order('ordem');
  CACHE_CATEGORIAS = cats || [];
  var { data: itens } = await cli.from('itens_catalogo').select('*')
    .or('unidade_id.is.null'+(unId?',unidade_id.eq.'+unId:'')).order('ordem');
  CACHE_CATALOGO = itens || [];
}

async function renderCatalogo(){
  await carregarCatalogo();
  var html = '<div class="card">'+
   '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">'+
    '<h2 style="margin:0">Catálogo</h2>'+
    '<button class="btn" onclick="abrirFormItem()">+ Novo item</button>'+
   '</div>'+
   '<table><thead><tr><th>Nome</th><th>Tipo</th><th>Categoria</th><th>Preço</th><th></th></tr></thead><tbody>'+
   CACHE_CATALOGO.map(function(it){
     var cat = CACHE_CATEGORIAS.find(function(c){return c.id===it.categoria_id});
     return '<tr><td>'+E(it.nome)+'</td>'+
      '<td><span class="pill '+(it.tipo==='produto'?'ok':'warn')+'">'+
       (it.tipo==='produto'?'Produto':'Serviço')+'</span></td>'+
      '<td>'+E(cat?cat.nome:'—')+'</td>'+
      '<td>R$ '+money(it.preco)+'</td>'+
      '<td><button class="btn2" onclick="abrirFormItem(\''+it.id+'\')">Editar</button></td></tr>';
   }).join('')+
   (!CACHE_CATALOGO.length?'<tr><td colspan="5" style="color:var(--tx2)">Nenhum item ainda.</td></tr>':'')+
   '</tbody></table></div>';
  $('miolo').innerHTML = html;
}

function abrirFormItem(id){
  var it = id ? CACHE_CATALOGO.find(function(x){return x.id===id}) : null;
  var modalHtml =
   '<div class="modalBg" onclick="if(event.target===this)fecharModal()"><div class="modal">'+
    '<h2>'+(it?'Editar item':'Novo item')+'</h2>'+
    '<div class="fld"><label>Tipo *</label><select id="itTipo" onchange="onTipoItemMudou()">'+
     '<option value="produto"'+(it&&it.tipo==='produto'?' selected':'')+'>Produto (vendido no PDV)</option>'+
     '<option value="servico"'+(it&&it.tipo==='servico'?' selected':'')+'>Serviço (agendável)</option>'+
    '</select></div>'+
    '<div class="fld"><label>Nome *</label><input id="itNome" value="'+E(it?it.nome:'')+'"></div>'+
    '<div class="row2">'+
     '<div class="fld"><label>Categoria</label><select id="itCategoria">'+
      '<option value="">Sem categoria</option>'+
      CACHE_CATEGORIAS.map(function(c){return '<option value="'+c.id+'"'+
        (it&&it.categoria_id===c.id?' selected':'')+'>'+E(c.nome)+'</option>';}).join('')+
     '</select></div>'+
     '<div class="fld"><label>Preço (R$) *</label>'+
      '<input id="itPreco" value="'+E(it?String(it.preco).replace('.',','):'')+'" placeholder="0,00"></div>'+
    '</div>'+
    '<div id="itCamposServico" style="display:'+((it&&it.tipo==='servico')?'block':'none')+'">'+
     '<div class="fld"><label>Duração (minutos)</label>'+
      '<input id="itDuracao" type="number" value="'+E(it&&it.duracao_minutos?it.duracao_minutos:30)+'"></div>'+
    '</div>'+
    '<div class="modalActions">'+
     '<button class="btn2" onclick="fecharModal()">Cancelar</button>'+
     '<button class="btn" onclick="salvarItem('+(it?"'"+it.id+"'":'null')+')">Salvar</button>'+
    '</div></div></div>';
  document.body.insertAdjacentHTML('beforeend', modalHtml);
}
function onTipoItemMudou(){
  $('itCamposServico').style.display = $('itTipo').value==='servico' ? 'block' : 'none';
}
function fecharModal(){
  var bg = document.querySelector('.modalBg');
  if(bg) bg.remove();
}
async function salvarItem(id){
  var nome=$('itNome').value.trim();
  var precoTxt=($('itPreco').value||'').trim();
  if(!nome){ toast('Informe o nome do item.'); return; }
  if(!precoTxt){ toast('Informe o preço.'); return; }
  var tipo=$('itTipo').value;
  var payload = {
    tipo: tipo,
    nome: nome,
    categoria_id: $('itCategoria').value || null,
    preco: Number(precoTxt.replace(/\./g,'').replace(',','.'))||0,
    unidade_id: SESSAO.unidadeAtual ? SESSAO.unidadeAtual.id : null,
    duracao_minutos: tipo==='servico' ? (parseInt($('itDuracao').value,10)||30) : null,
    requer_profissional: tipo==='servico'
  };
  var cli = cliente();
  var r = id
    ? await cli.from('itens_catalogo').update(payload).eq('id', id)
    : await cli.from('itens_catalogo').insert(Object.assign({ref_local:uidLocal('item')}, payload));
  if(r.error){ toast('Não consegui salvar: '+r.error.message); return; }
  fecharModal();
  toast('Item salvo.');
  renderCatalogo();
}
