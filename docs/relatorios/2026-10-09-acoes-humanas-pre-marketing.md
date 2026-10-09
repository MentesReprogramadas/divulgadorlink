# Ações humanas — pré-marketing

O código não faz estes itens. Sem eles, parte da auditoria continua aberta mesmo com as etapas verdes.

Cada item diz o que fazer, como saber que acabou e o que acontece se você pular.

## 0. Pré-requisito para a prova automatizada

As etapas pedem `npm run test:e2e` em `frontend`. Esse comando exige Docker e as portas 3000, 3333 e 4099 livres. O `global-setup` sobe o Postgres de teste na 5433 e o Redis na 6380.

Se o Docker não estiver rodando, a suíte não confirma nada. Suba o Docker e rode de novo. Não marque a etapa como feita com só o Vitest verde.

## 1. Link VHG

ID: P-05. Decisão de 9 out 2026, de noite: `VHG promo fitness #01` fica no ar. Não é teste. Nenhuma etapa apaga, despublica ou renomeia esse link.

## 2. DNS de www

Você criou o registro. Conferido nesta sessão: `https://www.temlinkaqui.com/` responde 200, o apex também responde 200. Não há redirect de um para o outro.

O que ainda falta, se você quiser um domínio só: na Cloudflare, redirect 301 de `www` para `https://temlinkaqui.com/`. Sem isso, o Google pode tratar os dois hosts como dois sites, porque o canonical usa o host do pedido. Não é bloqueio para o anúncio. É higiene de índice.

## 3. Texto legal

ID: P-03. A etapa 2 publica as páginas. O texto tem de dizer, em privacidade e em termos, que o Tem Link Aqui não controla o site, o grupo ou o perfil aberto depois do clique, e que esse destino está fora da jurisdição da plataforma.

Operador nas duas páginas: CONTAVERA SOLUCOES INTELIGENTES LTDA, CNPJ 66.421.121/0001-15, contato comercial@contavera.com. O endereço da ficha não entra: sem rua, número, bairro, cidade, CEP nem telefone. Sem foro.

Não prometer expurgo de pedido aos 5 anos. Analytics de sessão, a etapa 7 apaga depois de 12 meses.

## 4. Pixel e chave da API de conversões

ID: P-04. O Pixel já existe. O número público é `2981954672158122`. A chave da API de conversões foi colada no chat. Ela não entra em arquivo do repositório, nem neste relatório.

A etapa 3 já lê `META_PIXEL_ID` e `META_CAPI_TOKEN` do ambiente. Sem os dois no Coolify, o pixel fica mudo e a API de conversões não envia nada. O snippet que dispara `PageView` sozinho não foi colado no layout. A request à Meta só sai depois do cookie `tla_consent=marketing`.

A chave que está no chat deve ser tratada como exposta. Se este histórico for compartilhado, gere outra no Gerenciador de Eventos e apague a antiga. Não cole a nova neste chat. Coloque direto no ambiente do Coolify.

## 5. Operação da fila

ID: P-14. A etapa 7 manda e-mail aos usuários `ADMIN` quando abre um caso. Não liga IA.

“Olhar a fila no mesmo dia em que a mídia ligar” não é configuração e não é código. A publicação não acontece sozinha. A pessoa envia o link, ele fica em análise, e só entra no catálogo quando alguém com conta admin abre `/admin/moderacao` e aprova ou recusa.

No dia em que o anúncio começar a gastar, essa análise tem de acontecer nesse mesmo dia. Se ninguém abrir a fila, o anúncio paga visita e cadastro, e o link continua invisível. O dinheiro não vira publicação.

1. Confirme que a conta admin recebe o e-mail de “link para analisar”.
2. No dia da mídia, aprove ou recuse o que entrou antes de encerrar o dia.
3. Não peça para ativar o `moderate-link`. Esse handler não grava `PUBLISHED`.

## 6. O que você não deve pedir em código

- Apagar `Order` e `Payment` com mais de 5 anos. Guarda fiscal pode exigir mais do que o spec de LGPD. Quando um contador disser o prazo, aí sim um job.
- Depoimento, contador de usuários ou nota inventada na landing.
- Campanha, conjunto ou anúncio dentro deste programa.
- Trocar `NICHE_LEAD` para “resolver” a Meta escondendo o catálogo inteiro. A URL do anúncio é que não linka essas facetas.

## 7. Como saber que o programa acabou

As sete etapas estão no branch `feat/pre-marketing-02-legal`, com Vitest e os Playwright citados nos relatórios de cada etapa. O que continua humano: item 5 no dia em que a mídia ligar, o 301 de www se você quiser um host só, e `META_PIXEL_ID` / `META_CAPI_TOKEN` no Coolify. O item 1 está decidido: o VHG fica. O item 2 está no ar como segundo host, sem redirect. O texto de destino fora da jurisdição está nas páginas da etapa 2.
