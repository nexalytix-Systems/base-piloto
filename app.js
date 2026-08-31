/* ==========================================================
   BASE — núcleo (sessão, navegação, utilitários)
   Código novo, sem relação com nenhum sistema anterior.
   ========================================================== */
var CFG = {
  url: 'https://jtlcfodyscxqhdzfrcwi.supabase.co',      // preencha com a URL do seu projeto Supabase antes de publicar
  chave: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0bGNmb2R5c2N4cWhkemZyY3dpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgxOTUyODgsImV4cCI6MjEwMzc3MTI4OH0.0ZoUatyN3JTJoisogeBoN7l9qkMDFQ6oREUnuJg-qsI'     // chave anon/publishable
};

var SB = null;           // cliente Supabase
var SESSAO = { token: null, pessoa: null, organizacao: null, unidades: [], unidadeAtual: null, telasPermitidas: null };
var TELA = 'login';
var ABA_MOD = 'pdv';

function $(id){ return document.getElementById(id); }
function E(s){ return String(s==null?'':s).replace(/[&<>"']/g, function(c){
  return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
}); }
function money(v){ return Number(v||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}); }
function uidLocal(prefixo){ return prefixo+'_'+Date.now().toString(36)+Math.random().toString(36).slice(2,8); }

var _toastT=null;
function toast(msg){
  var el=$('toast'); el.textContent=msg; el.classList.add('on');
  clearTimeout(_toastT);
  _toastT=setTimeout(function(){ el.classList.remove('on'); }, 3200);
}

function cliente(){
  if(!SB){
    if(!CFG.url||!CFG.chave){ throw new Error('sem_config'); }
    SB = window.supabase.createClient(CFG.url, CFG.chave);
  }
  return SB;
}
function renderErroConfig(){
  $('app').innerHTML = '<div class="centro"><div class="card" style="width:100%;max-width:480px">'+
   '<h1>Falta configurar</h1>'+
   '<p class="hint">Este sistema ainda não sabe com qual projeto Supabase falar.</p>'+
   '<p style="font-size:14px;line-height:1.6">Abra o arquivo <code>app.js</code>, ache '+
   '<code>var CFG = {</code> perto do topo, e preencha:</p>'+
   '<pre style="background:var(--bg2);border:1px solid var(--line);border-radius:8px;'+
   'padding:12px;font-size:13px;overflow:auto">var CFG = {\n  url: \'https://SEU-PROJETO.supabase.co\',\n  chave: \'sua-chave-anon-aqui\'\n};</pre>'+
   '<p class="hint" style="margin-top:14px">A URL e a chave ficam em Project Settings → API, '+
   'no painel do seu projeto Supabase (a chave anon/publishable, nunca a service_role).</p>'+
   '</div></div>';
}

/* ---------- sessão ---------- */
async function iniciarSessao(){
  var cli;
  try{ cli = cliente(); }
  catch(e){ renderErroConfig(); return; }
  try{
    var { data } = await cli.auth.getSession();
    if(data && data.session){
      SESSAO.token = data.session.access_token;
      await carregarPessoa(data.session.user.id);
    }
  }catch(e){
    $('app').innerHTML = '<div class="centro"><div class="card" style="width:100%;max-width:480px">'+
     '<h1>Não consegui falar com o servidor</h1>'+
     '<p class="hint">Verifique sua internet e a URL/chave configuradas em app.js. Detalhe técnico: '+
     E((e&&e.message)||'erro desconhecido')+'</p></div></div>';
    return;
  }
  render();
}

async function carregarPessoa(userId){
  var cli = cliente();
  var { data: pessoa, error } = await cli.from('pessoas')
    .select('id,nome,cargo,organizacao_id,unidade_id,ativo,perfil_id')
    .eq('id', userId).maybeSingle();
  if(error || !pessoa){ SESSAO.pessoa = null; return; }
  SESSAO.pessoa = pessoa;

  var { data: org } = await cli.from('organizacoes').select('*').eq('id', pessoa.organizacao_id).maybeSingle();
  SESSAO.organizacao = org || null;

  /* a consulta abaixo já vem filtrada pelo próprio banco (RLS em
     "unidades"): admin_organizacao recebe todas, os demais só as
     que estão vinculados via pessoas_unidades — não precisa filtrar
     de novo aqui no cliente. */
  var { data: unidades } = await cli.from('unidades').select('*').eq('organizacao_id', pessoa.organizacao_id).order('nome');
  SESSAO.unidades = unidades || [];
  SESSAO.unidadeAtual = pessoa.unidade_id
    ? SESSAO.unidades.find(function(u){return u.id===pessoa.unidade_id})
    : SESSAO.unidades[0];

  SESSAO.telasPermitidas = []; // padrão seguro: sem perfil definido = nenhuma tela (não "tudo")
  if(pessoa.cargo==='admin_organizacao'){
    SESSAO.telasPermitidas = null; // null = acesso total
  } else if(pessoa.perfil_id){
    var { data: perfil } = await cli.from('perfis_acesso').select('telas_permitidas').eq('id', pessoa.perfil_id).maybeSingle();
    SESSAO.telasPermitidas = perfil ? (perfil.telas_permitidas||[]) : [];
  }
}

async function fazerLogin(email, senha){
  var cli = cliente();
  var { data, error } = await cli.auth.signInWithPassword({ email: email, password: senha });
  if(error){ toast('Não consegui entrar: '+error.message); return; }
  SESSAO.token = data.session.access_token;
  await carregarPessoa(data.user.id);
  TELA = SESSAO.pessoa ? 'app' : 'bootstrap';
  render();
}

async function sair(){
  var cli = cliente();
  await cli.auth.signOut();
  SESSAO = { token:null, pessoa:null, organizacao:null, unidades:[], unidadeAtual:null, telasPermitidas:null };
  TELA = 'login';
  render();
}

/* ---------- render raiz ---------- */
function render(){
  if(TELA==='login') return renderLogin();
  if(TELA==='bootstrap') return renderBootstrap();
  return renderApp();
}

document.addEventListener('DOMContentLoaded', iniciarSessao);
