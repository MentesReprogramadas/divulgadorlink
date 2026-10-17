# Certificado público do provedor de teste

`external-test-cert.pem` e `external-test-key.pem` são uma identidade TLS autoassinada exclusivamente para o servidor local do harness E2E. A chave é pública por definição e não é credencial de serviço real. Não reutilizar em produção.

Os testes F12 lançam um Chromium separado com resolução de `example.com` para o servidor HTTPS local, na porta `runtime.externalPort`. Só esse contexto de navegador ignora a confiança do certificado autoassinado. Node, API e `safe-fetch` preservam TLS/DNS de produção; o adapter de disponibilidade continua usando a porta externa simulada já existente no harness.

Isso permite navegar pelo redirecionamento real Next → API → Location → HTTPS externo sem interceptar ou substituir as respostas da aplicação. A porta tem offset/checagem próprios e o servidor é encerrado com o harness.
