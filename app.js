/* ==========================================================
   BASE — núcleo (sessão, navegação, utilitários)
   Código novo, sem relação com nenhum sistema anterior.
   ========================================================== */
var CFG = {
  url: 'https://jtlcfodyscxqhdzfrcwi.supabase.co',      // preencha com a URL do seu projeto Supabase antes de publicar
  chave: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0bGNmb2R5c2N4cWhkemZyY3dpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgxOTUyODgsImV4cCI6MjEwMzc3MTI4OH0.0ZoUatyN3JTJoisogeBoN7l9qkMDFQ6oREUnuJg-qsI'     // chave anon/publishable
};

var SB = null;           // cliente Supabase
var SESSAO = { token: null, pessoa: null, organizacao: null, unidades: [], unidadeAtual: null };
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
    if(!CFG.url||!CFG.chave){ toast('Configure CFG.url e CFG.chave no topo do app.js.'); throw new Error('sem config'); }
    SB = window.supabase.createClient(CFG.url, CFG.chave);
  }
  return SB;
}

/* ---------- sessão ---------- */
async function iniciarSessao(){
  var cli = cliente();
  var { data } = await cli.auth.getSession();
  if(data && data.session){
    SESSAO.token = data.session.access_token;
    await carregarPessoa(data.session.user.id);
  }
  render();
}

async function carregarPessoa(userId){
  var cli = cliente();
  var { data: pessoa, error } = await cli.from('pessoas')
    .select('id,nome,cargo,organizacao_id,unidade_id,ativo')
    .eq('id', userId).maybeSingle();
  if(error || !pessoa){ SESSAO.pessoa = null; return; }
  SESSAO.pessoa = pessoa;

  var { data: org } = await cli.from('organizacoes').select('*').eq('id', pessoa.organizacao_id).maybeSingle();
  SESSAO.organizacao = org || null;

  var { data: unidades } = await cli.from('unidades').select('*').eq('organizacao_id', pessoa.organizacao_id).order('nome');
  SESSAO.unidades = unidades || [];
  SESSAO.unidadeAtual = pessoa.unidade_id
    ? SESSAO.unidades.find(function(u){return u.id===pessoa.unidade_id})
    : SESSAO.unidades[0];
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
  SESSAO = { token:null, pessoa:null, organizacao:null, unidades:[], unidadeAtual:null };
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
