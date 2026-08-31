/* ==========================================================
   CASCA DO APP — barra superior + navegação entre módulos
   ========================================================== */
function renderApp(){
  var org = SESSAO.organizacao;
  var un = SESSAO.unidadeAtual;
  var mods = (org && org.modulos_contratados) || [];
  var telas = SESSAO.telasPermitidas; // null = acesso total

  function libera(id){ return !telas || telas.indexOf(id)>=0; }

  var html = '<div class="topbar">'+
    '<b>'+E(org?org.nome:'')+'</b>'+
    '<span style="color:var(--tx2);font-size:13px">'+E(un?un.nome:'toda a organização')+'</span>'+
    '<div class="sp"></div>'+
    '<span style="color:var(--tx2);font-size:13px">'+E((SESSAO.pessoa||{}).nome)+'</span>'+
    '<button class="btn2" onclick="sair()">Sair</button>'+
   '</div>'+
   '<div class="wrap">'+
    '<div class="nav">'+
     (mods.indexOf('pdv')>=0&&libera('pdv')?navBtn('pdv','Frente de Loja'):'')+
     (mods.indexOf('agendamento')>=0&&libera('agenda')?navBtn('agenda','Agendamentos'):'')+
     (libera('catalogo')?navBtn('catalogo','Catálogo'):'')+
     (libera('financeiro')?navBtn('financeiro','Financeiro'):'')+
     (libera('usuarios')?navBtn('usuarios','Usuários'):'')+
     (libera('perfis')?navBtn('perfis','Perfis de Acesso'):'')+
     (mods.indexOf('agendamento')>=0&&libera('profissionais')?navBtn('profissionais','Profissionais'):'')+
     (libera('unidades')?navBtn('unidades','Unidades'):'')+
    '</div>'+
    '<div id="miolo"></div>'+
   '</div>';
  $('app').innerHTML = html;
  renderMiolo();
}
function navBtn(id,rotulo){
  return '<button class="'+(ABA_MOD===id?'on':'')+'" onclick="irPara(\''+id+'\')">'+E(rotulo)+'</button>';
}
function irPara(aba){ ABA_MOD=aba; renderApp(); }

function renderMiolo(){
  if(ABA_MOD==='pdv') return renderPDV();
  if(ABA_MOD==='agenda') return renderAgendamentos();
  if(ABA_MOD==='catalogo') return renderCatalogo();
  if(ABA_MOD==='financeiro') return renderFinanceiro();
  if(ABA_MOD==='usuarios') return renderUsuarios();
  if(ABA_MOD==='perfis') return renderPerfis();
  if(ABA_MOD==='profissionais') return renderProfissionais();
  if(ABA_MOD==='unidades') return renderUnidades();
}
