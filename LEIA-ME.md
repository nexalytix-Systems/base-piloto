# Piloto — instalação do zero

Sistema novo, código próprio, zero relação com o sistema anterior. Cobre
PDV (venda) e Agendamento (com profissionais), na mesma fundação
multi-vertical testada com cafeteria e clínica.

## 1 — Criar o projeto Supabase (novo, separado do NexaFlow)

Painel do Supabase → New project. Guarde a senha do banco.

## 2 — Rodar o schema, nesta ordem exata

No SQL Editor, cole e rode um de cada vez:
1. `schema/01_hierarquia.sql`
2. `schema/02_catalogo.sql`
3. `schema/03_operacao.sql`

## 3 — Pegar URL e chave

Project Settings → API → copie a Project URL e a chave **anon/publishable**
(nunca a `service_role`).

## 4 — Configurar o app

Abra `app/app.js`, ache `var CFG = {` no topo, preencha:
```js
var CFG = {
  url: 'https://SEU-PROJETO.supabase.co',
  chave: 'sua-chave-anon-aqui'
};
```

## 5 — Criar seu primeiro usuário (só este, manual)

Painel do Supabase → Authentication → Users → Add user → e-mail + senha,
marque "Auto Confirm User". Esse é o único cadastro manual — depois disso,
tudo passa pela tela do sistema.

## 6 — Publicar

Suba a pasta `app/` (o `index.html` e os `.js` juntos, mesma pasta) num
repositório GitHub novo, ative o Pages (Settings → Pages → Source →
Deploy from a branch → `main` → `/`, já que aqui não tem workflow do
GitHub Actions ainda — é publicação estática direta).

## 7 — Testar

1. Abra o link publicado, entre com o e-mail/senha do passo 5.
2. Como é a primeira vez, vai cair na tela "Criar sua organização" —
   preencha e confirme. Você vira administrador dela na hora.
3. Vá em **Catálogo** → cadastre um item tipo Produto (ex.: Café) e um
   tipo Serviço (ex.: Corte de cabelo).
4. Teste o **PDV**: clique no produto, finalize a venda.
5. Teste **Profissionais**: cadastre alguém.
6. Teste **Agendamentos**: agende o serviço, depois clique em Concluir —
   isso gera uma venda automaticamente.

## O que já foi testado por mim, no banco, antes de te entregar

- Bootstrap (criar organização) — funciona.
- Um segundo usuário tentando se vincular a uma organização já
  reivindicada por outra pessoa — **bloqueado** (achei e corrigi essa
  brecha durante o teste, antes de chegar até você).
- Venda completa no piloto cafeteria (produto).
- Agendamento virando venda no piloto clínica (serviço + profissional).
- Isolamento entre dois setores completamente diferentes rodando ao
  mesmo tempo no mesmo banco — nenhum vê nada do outro.

## O que ainda não existe nesta versão (próximos passos)

- Financeiro (contas, lançamentos, DRE) — camada 4, ainda não construída.
- Tela de "vincular administrador" numa unidade nova (hoje toda unidade
  nasce sem essa trava — é o comportamento do MVP, não o desenho final
  que discutimos).
- Emissão de recibo/comprovante da venda.
- Nenhuma máscara de campo (CNPJ, telefone, CEP) ainda.
