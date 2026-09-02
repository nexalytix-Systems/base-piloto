/* ==========================================================
   SYNC_REALTIME — avisa a tela sozinha quando outro aparelho muda
   algo relevante (pedido chegou, mesa mudou, agendamento foi
   criado). Usa o Supabase Realtime, que já respeita a mesma
   política de segurança (RLS) de sempre — só chega evento de
   linha que a pessoa já teria permissão de ver de qualquer jeito.

   Uso: cada tela liga um "escutador" quando entra, e desliga
   quando sai (senão fica ouvindo mudança de uma tela que a pessoa
   já não está mais vendo — desperdício, e pode até duplicar aviso
   se a mesma tela for aberta de novo).
   ========================================================== */
var _canaisAtivos = {};

function ligarEscuta(nomeCanal, tabela, unidadeId, aoMudar){
  desligarEscuta(nomeCanal); // nunca deixa dois escutadores da mesma tela ativos ao mesmo tempo
  if(!unidadeId) return;
  var cli = cliente();
  var canal = cli.channel(nomeCanal)
    .on('postgres_changes',
      { event: '*', schema: 'public', table: tabela, filter: 'unidade_id=eq.'+unidadeId },
      function(payload){ aoMudar(payload); }
    )
    .subscribe();
  _canaisAtivos[nomeCanal] = canal;
}
function desligarEscuta(nomeCanal){
  if(_canaisAtivos[nomeCanal]){
    cliente().removeChannel(_canaisAtivos[nomeCanal]);
    delete _canaisAtivos[nomeCanal];
  }
}
function desligarTodasEscutas(){
  Object.keys(_canaisAtivos).forEach(desligarEscuta);
}
