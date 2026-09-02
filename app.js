/* ==========================================================
   BASE — núcleo (sessão, navegação, utilitários)
   Código novo, sem relação com nenhum sistema anterior.
   ========================================================== */
var CFG = {
  url: 'https://jtlcfodyscxqhdzfrcwi.supabase.co',      // preencha com a URL do seu projeto Supabase antes de publicar
  chave: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0bGNmb2R5c2N4cWhkemZyY3dpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgxOTUyODgsImV4cCI6MjEwMzc3MTI4OH0.0ZoUatyN3JTJoisogeBoN7l9qkMDFQ6oREUnuJg-qsI',    // chave anon/publishable
  siteUrl: 'https://nexalytix-systems.github.io/base-piloto/'   // preencha com o endereço FIXO onde o Wirtu está publicado
                // (ex.: 'https://nexalytix-systems.github.io/base-piloto/')
                // — usado nos links de convite/redefinição de senha, pra não
                // depender de onde o admin estava quando clicou o botão
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
    /* convite/recuperação de senha chegam com informação no hash da URL
       (#access_token=...&type=invite) OU na query string (?code=...&type=invite),
       dependendo do fluxo de autenticação que o projeto usa — precisa checar
       os dois formatos, ANTES de decidir a tela normal, senão a pessoa cai
       direto no sistema sem nunca ter definido a própria senha. */
    var tipoLink = (window.location.hash.match(/type=([a-z]+)/)||[])[1]
      || (window.location.search.match(/type=([a-z]+)/)||[])[1];

    var { data } = await cli.auth.getSession();
    if(data && data.session){
      SESSAO.token = data.session.access_token;
      if(tipoLink==='invite' || tipoLink==='recovery'){
        TELA = 'definir-senha';
        render();
        return;
      }
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

/* ==========================================================
   TELA — Definir senha (primeiro acesso por convite, ou
   recuperação de senha esquecida — o link chega do mesmo jeito)
   ========================================================== */
function renderDefinirSenha(){
  $('app').innerHTML =
   '<div class="centro"><div class="card" style="width:100%;max-width:380px">'+
    '<h1>Defina sua senha</h1>'+
    '<p class="hint">Essa é a única vez que você vai ver essa tela — depois é só entrar normalmente com e-mail e senha.</p>'+
    '<div class="fld"><label>Nova senha</label><input id="dsSenha" type="password" placeholder="mínimo 6 caracteres"></div>'+
    '<div class="fld"><label>Confirmar senha</label><input id="dsSenha2" type="password"></div>'+
    '<button class="btn" style="width:100%" onclick="onDefinirSenha()">Salvar e entrar</button>'+
   '</div></div>';
}
async function onDefinirSenha(){
  var s1 = $('dsSenha').value;
  var s2 = $('dsSenha2').value;
  if(!s1||s1.length<6){ toast('A senha precisa ter ao menos 6 caracteres.'); return; }
  if(s1!==s2){ toast('As senhas não são iguais.'); return; }
  var cli = cliente();
  var { data, error } = await cli.auth.updateUser({ password: s1 });
  if(error){ toast('Não consegui salvar: '+error.message); return; }
  history.replaceState(null, '', window.location.pathname);
  await carregarPessoa(data.user.id);
  TELA = SESSAO.pessoa ? 'app' : 'bootstrap';
  toast('Senha definida — bem-vindo(a)!');
  render();
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
  desligarTodasEscutas();
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
  if(TELA==='definir-senha') return renderDefinirSenha();
  return renderApp();
}

document.addEventListener('DOMContentLoaded', iniciarSessao);
