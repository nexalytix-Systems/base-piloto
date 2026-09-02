/* ==========================================================
   AGENDAMENTOS — promessa de atendimento futuro. Quando concluído,
   gera uma venda (mesmo caminho financeiro do PDV).
   ========================================================== */
var CACHE_AGENDAMENTOS = [];

async function renderAgendamentos(){
  await carregarCatalogo();
  await carregarProfissionais();
  var cli = cliente();
  var hoje = new Date().toISOString().slice(0,10);
  var { data } = await cli.from('agendamentos').select('*')
    .eq('unidade_id', SESSAO.unidadeAtual.id).gte('data', hoje)
    .order('data').order('hora_inicio');
  CACHE_AGENDAMENTOS = data || [];
  desenharAgendamentos();
}
function desenharAgendamentos(){
  ligarEscuta('agendamentos', 'agendamentos', SESSAO.unidadeAtual&&SESSAO.unidadeAtual.id, function(){ renderAgendamentos(); });
  var servicos = CACHE_CATALOGO.filter(function(i){return i.tipo==='servico'});
  var html = '<div class="card">'+
   '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">'+
    '<h2 style="margin:0">Agendamentos</h2>'+
    '<button class="btn" onclick="abrirFormAgendamento()">+ Novo agendamento</button>'+
   '</div>'+
   (!servicos.length?'<p style="color:var(--tx2)">Cadastre um item do tipo Serviço no Catálogo primeiro.</p>':'')+
   '<table><thead><tr><th>Data/Hora</th><th>Cliente</th><th>Serviço</th><th>Profissional</th>'+
    '<th>Situação</th><th></th></tr></thead><tbody>'+
   CACHE_AGENDAMENTOS.map(function(a){
     var serv = CACHE_CATALOGO.find(function(i){return i.id===a.item_catalogo_id});
     var prof = CACHE_PROFISSIONAIS.find(function(p){return p.id===a.profissional_id});
     var podeConcluir = a.situacao!=='concluido' && a.situacao!=='cancelado';
     return '<tr><td>'+E(a.data)+' '+E(a.hora_inicio)+'</td><td>'+E(a.cliente_nome||'—')+'</td>'+
      '<td>'+E(serv?serv.nome:'—')+'</td><td>'+E(prof?prof.nome:'—')+'</td>'+
      '<td><span class="pill '+situacaoCor(a.situacao)+'">'+E(a.situacao)+'</span></td>'+
      '<td>'+(podeConcluir?'<button class="btn2" onclick="concluirAgendamento(\''+a.id+'\')">Concluir</button>':'')+'</td></tr>';
   }).join('')+
   (!CACHE_AGENDAMENTOS.length?'<tr><td colspan="6" style="color:var(--tx2)">Nenhum agendamento futuro.</td></tr>':'')+
   '</tbody></table></div>';
  $('miolo').innerHTML = html;
}
function situacaoCor(s){
  if(s==='concluido') return 'ok';
  if(s==='cancelado') return 'err';
  return 'warn';
}
function abrirFormAgendamento(){
  var servicos = CACHE_CATALOGO.filter(function(i){return i.tipo==='servico'});
  var html = '<div class="modalBg" onclick="if(event.target===this)fecharModal()"><div class="modal">'+
   '<h2>Novo agendamento</h2>'+
   '<div class="fld"><label>Cliente *</label><input id="agCliente" placeholder="Nome do cliente"></div>'+
   '<div class="fld"><label>Serviço *</label><select id="agServico">'+
    servicos.map(function(s){return '<option value="'+s.id+'">'+E(s.nome)+' — R$ '+money(s.preco)+'</option>';}).join('')+
   '</select></div>'+
   '<div class="fld"><label>Profissional</label><select id="agProf">'+
    '<option value="">Sem preferência</option>'+
    CACHE_PROFISSIONAIS.map(function(p){return '<option value="'+p.id+'">'+E(p.nome)+'</option>';}).join('')+
   '</select></div>'+
   '<div class="row2">'+
    '<div class="fld"><label>Data *</label><input id="agData" type="date"></div>'+
    '<div class="fld"><label>Hora *</label><input id="agHora" type="time"></div>'+
   '</div>'+
   '<div class="modalActions">'+
    '<button class="btn2" onclick="fecharModal()">Cancelar</button>'+
    '<button class="btn" onclick="salvarAgendamento()">Agendar</button>'+
   '</div></div></div>';
  document.body.insertAdjacentHTML('beforeend', html);
}
async function salvarAgendamento(){
  var cliente_=$('agCliente').value.trim();
  var servicoId=$('agServico').value;
  var data=$('agData').value;
  var hora=$('agHora').value;
  if(!cliente_){ toast('Informe o cliente.'); return; }
  if(!servicoId){ toast('Selecione o serviço.'); return; }
  if(!data||!hora){ toast('Informe data e hora.'); return; }
  var cli = cliente();
  var r = await cli.from('agendamentos').insert({
    unidade_id: SESSAO.unidadeAtual.id, item_catalogo_id: servicoId,
    profissional_id: $('agProf').value || null, cliente_nome: cliente_,
    data: data, hora_inicio: hora, situacao:'agendado', ref_local: uidLocal('ag')
  });
  if(r.error){ toast('Não consegui agendar: '+r.error.message); return; }
  fecharModal();
  toast('Agendamento criado.');
  renderAgendamentos();
}

/* concluir agendamento gera a venda — o mesmo caminho financeiro do PDV */
async function concluirAgendamento(id){
  var ag = CACHE_AGENDAMENTOS.find(function(a){return a.id===id});
  if(!ag) return;
  var serv = CACHE_CATALOGO.find(function(i){return i.id===ag.item_catalogo_id});
  if(!serv){ toast('Serviço não encontrado.'); return; }
  var cli = cliente();

  var { data: venda, error: e1 } = await cli.from('vendas').insert({
    unidade_id: SESSAO.unidadeAtual.id, origem:'agendamento', agendamento_id: ag.id,
    situacao:'concluida', cliente_nome: ag.cliente_nome, subtotal: serv.preco, total: serv.preco,
    concluida_em: new Date().toISOString(), ref_local: uidLocal('venda')
  }).select().single();
  if(e1){ toast('Não consegui gerar a venda: '+e1.message); return; }

  var { error: e2 } = await cli.from('itens_venda').insert({
    venda_id: venda.id, item_catalogo_id: serv.id, nome: serv.nome,
    quantidade:1, preco_unitario: serv.preco, total: serv.preco, ref_local: uidLocal('iv')
  });
  if(e2){ toast('Venda criada, mas o item falhou: '+e2.message); return; }

  var { error: e3 } = await cli.from('agendamentos')
    .update({ situacao:'concluido', venda_id: venda.id }).eq('id', ag.id);
  if(e3){ toast('Venda criada, mas não marquei o agendamento: '+e3.message); return; }

  toast('Agendamento concluído — venda de R$ '+money(serv.preco)+' registrada.');
  renderAgendamentos();
}
