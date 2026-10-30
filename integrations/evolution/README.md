# Aprovação de entrada — extensão Evolution 2.3.7

Patch separado, **não instalado e não publicado**. Não conecta nem reinicia instâncias. O aplicativo permanece `UNSUPPORTED / admission_extension_required` até a extensão estar instalada e a conexão já estar aberta.

Fontes verificadas em 30/10/2026:

- [Router oficial 2.3.7](https://github.com/evolution-foundation/evolution-api/blob/2.3.7/src/api/routes/group.router.ts): não expõe aprovação de entrada.
- [Serviço oficial 2.3.7](https://github.com/evolution-foundation/evolution-api/blob/2.3.7/src/api/integrations/channel/whatsapp/whatsapp.baileys.service.ts): mensagens temporárias usam `groupToggleEphemeral` e retornam `{success:true}`.
- [package.json 2.3.7](https://github.com/evolution-foundation/evolution-api/blob/2.3.7/package.json): Baileys `7.0.0-rc.9`.
- [Baileys dessa versão](https://github.com/WhiskeySockets/Baileys/blob/v7.0.0-rc.9/src/Socket/groups.ts): oferece `groupJoinApprovalMode`, `groupRequestParticipantsList` e `groupRequestParticipantsUpdate`.

O patch adiciona quatro endpoints ao router existente, usando seus mesmos guards de autenticação/instância e validação. Não acessa arquivos, credenciais ou sessões fora do serviço Evolution.

| Método | Rota | Contrato |
| --- | --- | --- |
| GET | `/group/admissionCapabilities/:instance` | `{version:1,joinApproval:boolean}` |
| POST | `/group/joinApprovalMode/:instance?groupJid=…` | body `{enabled:boolean}`; resposta `{success:true}` |
| GET | `/group/requestParticipants/:instance?groupJid=…` | `{participants:string[]}`; JIDs PN e LID preservados |
| POST | `/group/updateRequestParticipants/:instance?groupJid=…` | `{action:"approve"|"reject",participants:string[]}`; resposta `{participants:[{jid,status}]}` |

A aplicação exige status `200` e identidade exata do participante. Timeout, confirmação incompleta e erro por participante tornam o pedido `UNCERTAIN`, sem retry automático. A listagem reconciliada retira pedidos cancelados. Prazo de 120 segundos começa na primeira observação persistida; pedidos preexistentes também aguardam o prazo completo. Polling ocorre a cada 30 segundos, com limite por lote; o tempo pode ser maior durante fila, indisponibilidade ou pausas. JIDs ficam criptografados, são removidos após confirmação/retirada/incerteza e expiram em sete dias. Hashes de pedidos incertos permanecem até sua ausência ser confirmada, evitando que a retenção gere um retry silencioso.

## Validação e instalação posterior

Na raiz deste repositório:

```powershell
node integrations/evolution/verify-group-admission.cjs
node integrations/evolution/verify-group-admission-http.cjs output/evolution-admission-build
```

Na cópia isolada e autorizada do source Evolution **2.3.7**, conferir e aplicar:

```powershell
git apply --check /caminho/2.3.7-group-admission.patch
git apply /caminho/2.3.7-group-admission.patch
```

Validação concluída em checkout oficial isolado da tag 2.3.7, commit `cd800f2976e1e5b682fbf86a01ee4d85ae61f370`: dependências instaladas pelo lockfile com `npm ci --ignore-scripts --no-audit --no-fund --allow-git=all`, geração Prisma com URL de fixture inacessível, lint dos cinco arquivos alterados e build completo `tsc --noEmit && tsup` aprovados. O flag Git foi limitado ao comando porque o lockfile depende da revisão fixa pública de libsignal; nenhuma configuração global foi alterada. Nenhum modelo ou runtime externo foi instalado.

O teste HTTP executa router, controller, guards de autenticação/instância e schemas reais com repositório/cliente simulados. Os métodos de admissão do serviço são extraídos por AST para uma fixture sem inicializar o restante do provider. Passaram 16 cenários, incluindo credencial ausente/incorreta/de outra instância, instância inexistente/fechada, schemas inválidos, JIDs LID, ações bem-sucedidas e tentativa de trocar a instância via query. A rota de capacidades usa `groupNoValidate` para manter a instância autenticada nos parâmetros, sem o merge de query feito por `dataValidate`.

O self-check adicional cobre sintaxe dos trechos, regexes, presença dos quatro guards, LIDs e conexão fechada. Essa validação não comprova execução em socket real do WhatsApp. Instalar somente em janela autorizada, com conta de teste apta. Não testar a conta Principal 01 enquanto estiver fechada/em análise.

Reversão do provider: remover a extensão/reimplantar imagem anterior. Reversão operacional da aplicação: desativar a política pela API/painel; isso pausa futuras sincronizações/aprovações e **não** desfaz configurações já aplicadas no WhatsApp. Migrar banco antes de iniciar API/worker novos. Todas as segmentações existentes e novas começam com política desativada; ativar somente as segmentações autorizadas, incluindo Pets se confirmado. Nenhum backfill global de tenants.
