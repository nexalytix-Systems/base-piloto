/* ==========================================================
   CASCA DO APP — sidebar recolhível, com sub-telas de
   Financeiro/Estoque aninhadas embaixo do item ativo.
   ========================================================== */
var SIDEBAR_COLAPSADA = false;

var ICONES_SVG = {
  pdv: '<circle cx="9" cy="20" r="1.4"/><circle cx="17" cy="20" r="1.4"/><path d="M3 4h2l2.4 12.4a2 2 0 0 0 2 1.6h7.2a2 2 0 0 0 2-1.6L21 8H6"/>',
  agenda: '<rect x="3" y="5" width="18" height="16" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="16" y1="2" x2="16" y2="6"/>',
  catalogo: '<line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/>',
  financeiro: '<circle cx="12" cy="12" r="9"/><path d="M12 7.5v9M15 9.7c0-1.5-1.4-2.7-3-2.7s-3 1.1-3 2.5c0 3.2 6 1.6 6 4.7 0 1.5-1.4 2.5-3 2.5s-3-1.1-3-2.5"/>',
  estoque: '<path d="M21 8l-9-5-9 5 9 5 9-5z"/><path d="M3 8v8l9 5 9-5V8"/><line x1="12" y1="13" x2="12" y2="21"/>',
  usuarios: '<circle cx="9" cy="8" r="3.2"/><path d="M3.5 20a5.5 5.5 0 0 1 11 0"/><circle cx="17" cy="9" r="2.6"/><path d="M15 20a4.5 4.5 0 0 1 6.5-4"/>',
  perfis: '<path d="M12 2 4 5v6c0 5 3.4 8.7 8 11 4.6-2.3 8-6 8-11V5l-8-3z"/>',
  profissionais: '<circle cx="12" cy="8" r="3.6"/><path d="M4.5 21a7.5 7.5 0 0 1 15 0"/>',
  unidades: '<rect x="4" y="3" width="16" height="18"/><line x1="9" y1="8" x2="9.01" y2="8"/><line x1="15" y1="8" x2="15.01" y2="8"/><line x1="9" y1="13" x2="9.01" y2="13"/><line x1="15" y1="13" x2="15.01" y2="13"/><line x1="9" y1="18" x2="15" y2="18"/>',
  relatorios: '<path d="M4 20V10M11 20V4M18 20v-7"/>'
};
function icone(nome){
  return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" '+
   'stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'+(ICONES_SVG[nome]||'')+'</svg>';
}

function montarItensMenu(){
  var org = SESSAO.organizacao;
  var mods = (org && org.modulos_contratados) || [];
  var telas = SESSAO.telasPermitidas;
  function libera(id){ return !telas || telas.indexOf(id)>=0; }
  var itens = [];
  if(mods.indexOf('pdv')>=0 && libera('pdv')) itens.push({id:'pdv', rotulo:'Frente de Loja', icone:'pdv'});
  if(mods.indexOf('agendamento')>=0 && libera('agenda')) itens.push({id:'agenda', rotulo:'Agendamentos', icone:'agenda'});
  if(libera('catalogo')) itens.push({id:'catalogo', rotulo:'Catálogo', icone:'catalogo'});
  if(libera('financeiro')) itens.push({id:'financeiro', rotulo:'Financeiro', icone:'financeiro', filho:'ABA_FIN', ir:'irParaFin', sub:[
    {id:'lancamentos',rotulo:'Lançamentos'},{id:'pagar',rotulo:'Contas a Pagar'},{id:'receber',rotulo:'Contas a Receber'},
    {id:'conciliacao',rotulo:'Conciliação Bancária'},{id:'fluxo',rotulo:'Fluxo de Caixa'},
    {id:'contas',rotulo:'Contas'},{id:'categorias',rotulo:'Categorias'}
  ]});
  if(libera('estoque')) itens.push({id:'estoque', rotulo:'Estoque', icone:'estoque', filho:'ABA_EST', ir:'irParaEst', sub:[
    {id:'saldo',rotulo:'Estoque Atual'},{id:'movimentacao',rotulo:'Movimentação'},{id:'notas',rotulo:'Notas de Entrada'},
    {id:'contagem',rotulo:'Contagem'},{id:'transferencia',rotulo:'Transferência'},
    {id:'fornecedores',rotulo:'Fornecedores'},{id:'motivos',rotulo:'Motivos'}
  ]});
  if(mods.indexOf('producao')>=0&&libera('producao')) itens.push({id:'producao', rotulo:'Produção', icone:'estoque', filho:'ABA_PROD', ir:'irParaProd', sub:[
    {id:'insumos',rotulo:'Insumos'},{id:'fichas',rotulo:'Fichas Técnicas'},{id:'ordens',rotulo:'Ordens de Produção'},{id:'unidadesmedida',rotulo:'Unidades de Medida'}
  ]});
  if(libera('clientes')) itens.push({id:'clientes', rotulo:'Clientes', icone:'usuarios', filho:'ABA_CLI', ir:'irParaCli', sub:[
    {id:'clientes',rotulo:'Clientes'},{id:'cupons',rotulo:'Cupons'}
  ]});
  if(mods.indexOf('cardapio')>=0&&libera('cardapio')) itens.push({id:'cardapio', rotulo:'Cardápio Digital', icone:'catalogo', filho:'ABA_CARD', ir:'irParaCard', sub:[
    {id:'pedidos',rotulo:'Pedidos Recebidos'},{id:'mesas',rotulo:'Mesas'},{id:'link',rotulo:'Link do Cardápio'}
  ]});
  if(libera('relatorios')) itens.push({id:'relatorios', rotulo:'Relatórios', icone:'relatorios', filho:'ABA_REL', ir:'irParaRel', sub:[
    {id:'dashboard',rotulo:'Dashboard'},{id:'faturamento',rotulo:'Faturamento'},
    {id:'itens',rotulo:'Itens Mais Vendidos'},{id:'cancelamentos',rotulo:'Cancelamentos'},{id:'dre',rotulo:'DRE'}
  ]});
  if(libera('usuarios')) itens.push({id:'usuarios', rotulo:'Usuários', icone:'usuarios'});
  if(libera('perfis')) itens.push({id:'perfis', rotulo:'Perfis de Acesso', icone:'perfis'});
  if(mods.indexOf('agendamento')>=0 && libera('profissionais')) itens.push({id:'profissionais', rotulo:'Profissionais', icone:'profissionais'});
  if(libera('unidades')) itens.push({id:'unidades', rotulo:'Unidades', icone:'unidades'});
  return itens;
}

function renderApp(){
  var org = SESSAO.organizacao;
  var un = SESSAO.unidadeAtual;
  var itens = montarItensMenu();
  var colapsada = SIDEBAR_COLAPSADA;

  var html = '<div class="appShell">'+
   '<div class="sidebar'+(colapsada?' colapsada':'')+'">'+
    '<div class="sidebarTopo">'+
     (colapsada?'':'<span class="sidebarLogo" title="'+E(org?org.nome:'')+'">'+E(org?org.nome:'')+'</span>')+
     '<button class="btnColapsar" onclick="alternarSidebar()" title="'+(colapsada?'Expandir':'Recolher')+'">'+
      (colapsada?'»':'«')+'</button>'+
    '</div>'+
    '<div class="sidebarNav">'+
     itens.map(function(item){
       var ativo = ABA_MOD===item.id;
       var pedaco = '<button class="sidebarItem'+(ativo?' on':'')+'" onclick="irPara(\''+item.id+'\')" title="'+E(item.rotulo)+'">'+
        icone(item.icone)+(colapsada?'':'<span>'+E(item.rotulo)+'</span>')+'</button>';
       if(item.sub && ativo && !colapsada){
         var abaAtual = window[item.filho];
         pedaco += '<div class="sidebarSub">'+item.sub.map(function(s){
           return '<button class="sidebarSubItem'+(abaAtual===s.id?' on':'')+'" onclick="'+item.ir+'(\''+s.id+'\')">'+E(s.rotulo)+'</button>';
         }).join('')+'</div>';
       }
       return pedaco;
     }).join('')+
    '</div>'+
    '<div class="sidebarRodape">'+
     (colapsada?'':'<div style="font-size:12.5px;color:var(--tx2);margin-bottom:8px">'+
       E((SESSAO.pessoa||{}).nome)+'<br>'+E(un?un.nome:'toda a organização')+'</div>')+
     '<button class="btn2" onclick="sair()" style="width:100%" title="Sair">'+(colapsada?'⏻':'Sair')+'</button>'+
    '</div>'+
   '</div>'+
   '<div class="conteudoPrincipal"><div id="miolo"></div></div>'+
  '</div>';
  $('app').innerHTML = html;
  renderMiolo();
}
function alternarSidebar(){ SIDEBAR_COLAPSADA = !SIDEBAR_COLAPSADA; renderApp(); }
function irPara(aba){ ABA_MOD=aba; renderApp(); }

function renderMiolo(){
  desligarTodasEscutas(); // troca de tela: nunca fica ouvindo o que já não está mais na tela
  if(ABA_MOD==='pdv') return renderPDV();
  if(ABA_MOD==='agenda') return renderAgendamentos();
  if(ABA_MOD==='catalogo') return renderCatalogo();
  if(ABA_MOD==='financeiro') return renderFinanceiro();
  if(ABA_MOD==='estoque') return renderEstoque();
  if(ABA_MOD==='producao') return renderProducao();
  if(ABA_MOD==='clientes') return renderClientes();
  if(ABA_MOD==='cardapio') return renderCardapioAdmin();
  if(ABA_MOD==='relatorios') return renderRelatorios();
  if(ABA_MOD==='usuarios') return renderUsuarios();
  if(ABA_MOD==='perfis') return renderPerfis();
  if(ABA_MOD==='profissionais') return renderProfissionais();
  if(ABA_MOD==='unidades') return renderUnidades();
}
