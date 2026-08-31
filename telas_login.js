/* ==========================================================
   TELA — Login
   ========================================================== */
function renderLogin(){
  $('app').innerHTML =
   '<div class="centro"><div class="card" style="width:100%;max-width:380px">'+
    '<h1>Entrar</h1><p class="hint">Acesse com seu e-mail e senha.</p>'+
    '<div class="fld"><label>E-mail</label><input id="lgEmail" type="email"></div>'+
    '<div class="fld"><label>Senha</label><input id="lgSenha" type="password"></div>'+
    '<button class="btn" style="width:100%" onclick="onClickLogin()">Entrar</button>'+
    '<p class="hint" style="margin-top:16px">Sem conta ainda? Peça pro administrador da sua organização '+
    'te cadastrar em Usuários, ou crie a conta pelo painel do Supabase (Authentication → Users) e depois '+
    'entre aqui pra montar a organização.</p>'+
   '</div></div>';
  $('lgSenha').addEventListener('keydown', function(e){ if(e.key==='Enter') onClickLogin(); });
}
function onClickLogin(){
  var email = $('lgEmail').value.trim();
  var senha = $('lgSenha').value;
  if(!email||!senha){ toast('Preencha e-mail e senha.'); return; }
  fazerLogin(email, senha);
}

/* ==========================================================
   TELA — Bootstrap (usuário logado, mas sem organização ainda)
   Isso só acontece uma vez: a pessoa que acabou de criar a conta
   de acesso no Supabase Auth e está entrando pela primeira vez.
   ========================================================== */
function renderBootstrap(){
  $('app').innerHTML =
   '<div class="centro"><div class="card" style="width:100%;max-width:460px">'+
    '<h1>Criar sua organização</h1>'+
    '<p class="hint">Isso só acontece uma vez. Sua organização é o topo — pode ser uma empresa com filiais, '+
    'ou uma franqueadora com franquias. Você vira o administrador dela.</p>'+
    '<div class="fld"><label>Nome da organização *</label><input id="bsNome" placeholder="Ex.: Doce Aroma"></div>'+
    '<div class="row2">'+
     '<div class="fld"><label>Tipo *</label><select id="bsTipoRelacao">'+
      '<option value="matriz">Matriz (rede própria)</option>'+
      '<option value="franqueadora">Franqueadora</option>'+
     '</select></div>'+
     '<div class="fld"><label>Segmento *</label><select id="bsSegmento">'+
      '<option value="alimentos">Alimentos (restaurante, cafeteria...)</option>'+
      '<option value="saude">Saúde (clínica, consultório...)</option>'+
      '<option value="beleza">Beleza (barbearia, salão...)</option>'+
      '<option value="varejo">Varejo / outros</option>'+
     '</select></div>'+
    '</div>'+
    '<div class="fld"><label>Tipo de negócio (livre) *</label>'+
     '<input id="bsTipoNegocio" placeholder="Ex.: cafeteria, clínica odontológica, barbearia"></div>'+
    '<div class="fld"><label>Nome da primeira unidade *</label>'+
     '<input id="bsUnidade" placeholder="Ex.: Matriz, Unidade Centro"></div>'+
    '<button class="btn" style="width:100%" onclick="onCriarOrganizacao()">Criar e entrar</button>'+
   '</div></div>';
}
async function onCriarOrganizacao(){
  var nome=$('bsNome').value.trim();
  var unidadeNome=$('bsUnidade').value.trim();
  var tipoNegocio=$('bsTipoNegocio').value.trim();
  if(!nome){ toast('Informe o nome da organização.'); return; }
  if(!unidadeNome){ toast('Informe o nome da primeira unidade.'); return; }
  if(!tipoNegocio){ toast('Informe o tipo de negócio.'); return; }
  var cli = cliente();
  var { data: sessao } = await cli.auth.getSession();
  var userId = sessao.session.user.id;

  var { data: org, error: e1 } = await cli.from('organizacoes').insert({
    nome:nome, tipo_relacao:$('bsTipoRelacao').value, segmento:$('bsSegmento').value,
    tipo_negocio:tipoNegocio, modulos_contratados:['pdv','agendamento']
  }).select().single();
  if(e1){ toast('Não consegui criar a organização: '+e1.message); return; }

  var { data: unidade, error: e2 } = await cli.from('unidades').insert({
    organizacao_id:org.id, tipo_vinculo:'filial', nome:unidadeNome, pendente_admin:false
  }).select().single();
  if(e2){ toast('Organização criada, mas a unidade falhou: '+e2.message); return; }

  var { error: e3 } = await cli.from('pessoas').insert({
    id:userId, organizacao_id:org.id, unidade_id:null, nome:'Administrador', cargo:'admin_organizacao'
  });
  if(e3){ toast('Não consegui vincular seu usuário: '+e3.message); return; }

  await carregarPessoa(userId);
  TELA='app'; ABA_MOD='pdv';
  toast('Organização criada — bem-vindo(a).');
  render();
}
