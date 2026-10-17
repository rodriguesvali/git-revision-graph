# Análise de fragilidades sistêmicas — 2026-10-17

## Escopo e método

- Pedido: buscar fragilidades sistêmicas usando graphify.
- Baseline: versão 1.7.4, commit `00f97512234a6cc71bc7a44757a233f884f1082f`.
- Grafo consultado: 6.234 nós, 12.704 relações; indexação estrutural atualizada na etapa anterior.
- Critérios: risco ao worktree, isolamento entre repositórios, descarte de trabalho obsoleto e capacidade dos testes de detectar regressões nessas fronteiras.
- O grafo foi usado para localizar dependências; código e execuções determinísticas sustentam os achados. Grau alto, baixa coesão e autoarestas não foram tratados como defeitos por si só.
- Nenhuma alteração em código de produção, dependências ou publicação. Este documento registra o diagnóstico e propostas; não implementa correções.

Consultas iniciais amplas foram truncadas pelo orçamento do graphify. A investigação foi refinada para `executeCompareResultRestorePlan`, `RevisionGraphRenderCoordinator` e `e2e/index.ts`, além de caminhos entre o presenter, o adaptador de workbench e o executor. Não se afirma que toda a base foi auditada.

Vocabulário conferido no grafo para orientar a busca: `mutation`, `coordinator`, `ownership`, `lifecycle`, `authorization`, `validation`, `state`, `async`, `boundary`, `cache`, `protocol`, `repository`.

## Resultado

Foram identificadas duas fragilidades de prioridade alta e duas de prioridade média. A causa transversal é que garantias importantes são aplicadas em alguns pontos, mas não são invariantes de todas as fronteiras: a origem da intenção nem sempre acompanha a mensagem, o cancelamento depende da cooperação de camadas inferiores e o plano de restauração valida seus passos durante a execução destrutiva.

| ID | Prioridade | Achado | Evidência obtida |
| --- | --- | --- | --- |
| S1 | P1 | Restauração pode alterar o worktree antes de descobrir que o plano é inviável | Reproduzido com Git real em diretório temporário |
| S2 | P1 | Mensagens de ação não vinculam uniformemente a intenção ao repositório e à geração de origem | Aceitação pelo dispatcher e colisão de IDs reproduzidas; corrida visual completa não executada |
| S3 | P2 | `cancel()` não garante que um resultado tardio seja descartado | Reproduzido no coordenador com tarefa não cooperativa |
| S4 | P2 | E2E verifica abertura da extensão, sem exercitar as fronteiras de maior risco | Confirmado por inspeção do runner e dos cenários |

## S1 — Restauração executa passos destrutivos antes da validação integral

Fontes:

- [Plano para renomeações](../../src/compareResultRestore.ts:40).
- [Executor compartilhado](../../src/compareResultRestoreExecutor.ts:20), especialmente a exclusão em L51 e a rejeição de fonte ausente em L46.
- [Adaptador usado pelos presenters](../../src/workbenchCompareResultRestore.ts:15).
- [Compare Results](../../src/compareResults/restoreAction.ts:37) e [Show Log](../../src/showLog/fileRestoreAction.ts:37).

O executor valida contenção de caminhos e ancestrais, mas resolve a revisão e verifica a existência da fonte dentro do laço. Um passo pode remover ou sobrescrever um arquivo antes de outro descobrir uma fonte ausente. Não existe compensação dos passos já aplicados. A resolução da mesma referência simbólica também é repetida por passo.

Isso afeta especialmente planos de renomeação, que contêm exclusão seguida de escrita. Uma comparação antiga contra uma branch que mudou pode deixar de descrever os caminhos existentes na revisão atual. Falha posterior de I/O também pode deixar um plano parcialmente aplicado.

Reprodução executada: criar um repositório Git temporário com um commit válido contendo `keep.txt`, criar `renamed.txt` com conteúdo local e executar contra `HEAD`:

```js
[
  { kind: 'delete', targetPath: root + '/renamed.txt' },
  { kind: 'write-ref', refPath: root + '/original.txt', targetPath: root + '/original.txt' }
]
```

Resultado real:

```json
{"error":"The selected revision does not contain original.txt.","localFileStillExists":false}
```

Limite: a reprodução chama o executor compartilhado diretamente; não automatiza a confirmação modal de nenhum presenter. A exclusão é o efeito de um plano autorizado; a fragilidade está em falhar deixando esse efeito parcial sem recuperação.

Correção proposta: resolver a referência uma vez, validar todas as fontes e destinos antes da primeira escrita e preparar recuperação dos arquivos afetados para falhas posteriores. Preservar semântica Git, modos e verificações de symlink já existentes.

Aceitação: fonte ausente no segundo passo ou falha de escrita não pode fazer desaparecer o conteúdo local anterior; todos os passos devem usar o mesmo commit resolvido. Criar testes de falha intermediária no executor e de propagação do resultado aos dois presenters.

## S2 — A origem da ação não é uma garantia uniforme do protocolo

Fontes:

- [Autorização do grafo](../../src/revisionGraph/messageAuthorization.ts:89).
- [Mensagens de checkout e demais ações](../../src/revisionGraph/protocol.d.ts:176).
- [Identidade dos itens de comparação](../../src/compareResultsShared.ts:65).
- [Contrato das mensagens de Compare Results](../../src/compareResults/messageValidation.ts:3).
- [Resolução do item no estado atual](../../src/compareResultsView.ts:317).
- [Contrato de Show Log](../../src/showLog/messageValidation.ts:3).

No grafo, `repositoryScoped` confere se o estado atual do host corresponde ao repositório atual. Para checkout, isso não confere o repositório que originou a mensagem, pois ele não está no payload. Em Compare Results, a identidade combina caminho relativo, status e refs, omitindo o repositório e a geração da comparação; o handler resolve esse ID sobre o estado atual. O `comparisonId` de apresentação não é enviado nessas mensagens de ação. Em Show Log, algumas mensagens usam `sourceToken`, mas ações como checkout, reset e restauração não o exigem.

Reproduções executadas:

1. Despachar `{type:'checkout', refName:'feature/shared', refKind:'branch'}` com estado pronto de B, onde a branch existe, e repositório atual B: o handler é chamado. O payload não permite distinguir uma intenção originada em A.
2. Gerar itens de comparação de A e B com `file.ts`, status Modified e refs `main`/`feature`: ambos produzem `file.ts::Modified::main::feature::`.

Impacto: se uma mensagem da interface anterior chegar quando o host já representa outro repositório ou outra comparação com os mesmos identificadores, ela pode ser reinterpretada no novo contexto. O lease de mutação é adquirido para o contexto já escolhido pelo handler e não recupera a origem perdida. Repositórios relacionados também podem compartilhar hashes de commits, tornando apenas o hash insuficiente para isolar ações de Show Log.

Limite: aceitação e colisão estão reproduzidas. Não foi executada uma corrida completa entre a webview real e o Extension Host nem uma mutação de checkout disparada por essa corrida. A ocorrência visual e sua frequência permanecem não medidas.

Correção proposta: tornar obrigatória a identidade de origem nas mensagens com efeitos — repositório e geração do estado/comparação; reutilizar `sourceToken` em Show Log. Validar essa identidade antes de resolver o alvo ou obter o lease. Incluir o repositório no ID do item ajuda, mas não cobre a troca de comparação dentro do mesmo repositório.

Aceitação: mensagens capturadas de A devem ser rejeitadas em B mesmo com refs, hashes e caminhos iguais; mensagens da comparação anterior devem ser rejeitadas na seguinte. Preservar mensagens globais como `ready` quando apropriado.

## S3 — Cancelamento depende da cooperação de quem produz o resultado

Fontes:

- [Cancelamento](../../src/revisionGraph/renderCoordinator.ts:47).
- [Aplicação do resultado](../../src/revisionGraph/renderCoordinator.ts:67).
- [Descarte do controller](../../src/revisionGraph/controller.ts:341).
- [Checagem adicional nos loaders](../../src/revisionGraph/panel/readyMetadata.ts:86).

`cancel()` limpa o trabalho pendente e aborta o sinal, mas não avança a geração. O laço aplica qualquer resultado definido cujo request ID ainda seja o mais recente, sem consultar o sinal abortado. Uma operação que ignora o sinal continua autorizada a chamar `onResult`; um erro tardio comum também pode chegar a `onError`.

Reprodução executada: agendar uma Promise controlada, chamar `cancel()`, resolver a Promise com `cancelled-result` e aguardar `schedule()`.

```json
{"outcome":"applied","applied":["cancelled-result"],"errors":[]}
```

Limite importante: os loaders de produção já fazem checagens de abortamento. O defeito demonstrado é o contrato do coordenador; não foi demonstrada uma atualização visual após fechar o painel no fluxo completo. A proteção atual depende de todos os produtores continuarem cooperativos.

Correção proposta: invalidar a geração no cancelamento e impedir aplicação de resultado ou erro de uma geração cancelada na própria fronteira do coordenador, mantendo o sinal para interromper trabalho quando possível.

Aceitação: tarefa que ignora o sinal e resolve ou rejeita após `cancel()` deve produzir `discarded`, sem `onResult`/`onError`; um agendamento posterior deve funcionar normalmente.

## S4 — A cobertura E2E não exercita a composição das garantias

Fonte: [entrada E2E](../../test/e2e/index.ts:25), com cenários definidos em L55, e [workflow de CI](../../.github/workflows/verify.yml:42).

O E2E atual cobre ativação, descoberta de zero ou um repositório e abertura/reutilização do painel singleton. Não exercita duas raízes simultâneas, despacho de ações da webview, restauração nem fechamento durante uma operação pendente. Há testes unitários e de orquestração relevantes; a lacuna é a integração real entre o contexto visível, a mensagem e o efeito Git.

A suíte atual passou integralmente mesmo com S1–S3 reproduzidos fora dela. Isso demonstra ausência desses casos específicos na suíte, sem invalidar os 1.039 testes existentes.

Correção proposta: acrescentar cenários de fronteira em fixtures descartáveis, começando por troca A→B com ações antigas, falha intermediária de restauração e fechamento/reabertura com trabalho pendente. Combinar testes determinísticos de contratos com um número pequeno de testes reais da integração webview/host.

Aceitação: provar tanto o efeito permitido no repositório correto quanto a ausência de efeito no repositório de origem ou em um contexto obsoleto. Antes das correções, os casos específicos devem detectar as violações reproduzidas.

## Verificação executada

- `npm test`: build de produção/webview e compilação de testes concluídos; **1.039 testes aprovados, 0 falhas, 0 ignorados**.
- `node scripts/check-code-quality.mjs --report`: aprovado; **294 arquivos, 2.786 funções**.
- Quatro observações determinísticas adicionais: plano de restauração parcial, aceitação de checkout sem origem, colisão de IDs entre raízes e resultado aplicado após cancelamento.
- Operações Git da reprodução de restauração restritas a diretório temporário, removido ao final.
- Não executados: E2E em VS Code, reprodução visual das corridas, matriz Windows/macOS e auditoria de dependências. Nenhuma alegação de segurança de dependências é feita.
- Logs desta sessão: `/tmp/git-revision-graph-systemic-tests.log` e `/tmp/git-revision-graph-systemic-quality.log` (temporários).

## Avaliação complementar com Jev

Foi aplicada a skill `typesafe-ai`, consultando o índice vivo em <https://docs.typesafe.ai/llms.txt>. Os fetches das duas páginas específicas em Markdown falharam; o índice e o contrato disponível de `jev_verify` orientaram o uso limitado à conferência de afirmações.

`jev_verify`, modelo `jev-1.13.0`, recebeu trechos delimitados das fontes e as observações das reproduções. Não recebeu segredos. Resultado: quatro afirmações classificadas como sustentadas, nenhuma contradita ou sem suporte. S2 teve confiança 0,72 e foi marcado para revisão; S1, S3 e S4 tiveram confiança 1,00, 0,95 e 0,98. Tokens informados pelo serviço: 4.555 de entrada e 436 de saída.

Essa avaliação é evidência auxiliar, não prova de funcionamento nem aprovação. A confiança menor em S2 exige manter explícita a distinção entre aceitação/colisão reproduzidas e corrida visual não executada. Os fatos deste relatório se apoiam nas fontes e execuções descritas; não se infere um defeito novo apenas da avaliação do modelo.

## Ordem proposta

1. Corrigir S1 para preservar conteúdo local diante de falhas parciais.
2. Corrigir S2 com identidade de origem obrigatória nas ações com efeitos.
3. Corrigir S3 reforçando o contrato do coordenador.
4. Ampliar S4 junto de cada correção, mantendo os cenários determinísticos e cobrindo a integração real.

Não é necessário substituir a arquitetura publicada: presenters, executor, validador/autorizador e coordenadores existentes já oferecem as fronteiras apropriadas para essas correções.

## Acompanhamento — S1 na versão 1.7.5

Em 2026-10-17, o mantenedor autorizou os ajustes do primeiro achado. A correção,
as regressões e os limites de recuperação estão registrados no
[artefato de restauração segura](features/1.7.5-safe-file-restore.md). As evidências
acima descrevem o baseline anterior à correção. Naquele momento, S2–S4 permaneciam fora do escopo aprovado.


## Acompanhamento — S2 na versão 1.7.5

Em 2026-10-17, o mantenedor autorizou tratar o achado 2. O
[artefato de origem das ações](features/1.7.5-webview-action-origin.md) registra
as mudanças no protocolo das três superfícies, a rejeição anterior aos efeitos,
as regressões de troca de contexto e a verificação em Chromium. Naquele momento, S3 e a ampliação
E2E de S4 permaneciam pendentes; os novos testes de fronteira não encerram S4.


## Acompanhamento — S3 na versão 1.7.5

Em 2026-10-17, o mantenedor autorizou tratar o achado 3. O
[artefato de cancelamento de render](features/1.7.5-render-cancellation.md)
registra a invalidação de geração antes do abortamento, o descarte de resultados
ou erros tardios e a retomada de agendamentos após o cancelamento. Os testes com
Promises controladas reproduzem as duas violações do contrato no baseline e
verificam a correção sem depender da cooperação do produtor. Naquele momento, S4 permanecia pendente.

## Acompanhamento — S4 na versão 1.7.5

Em 2026-10-17, o mantenedor autorizou tratar o achado 4. O
[artefato de integração real](features/1.7.5-extension-host-safety-regressions.md)
registra a ampliação para duas raízes, transporte real das webviews, efeitos Git,
falha parcial de restauração e fechamento/reabertura com carga pendente. A execução
também revelou o campo Git ausente no VS Code mínimo e a colisão do emissor de S2
com `window.postMessage`; ambos receberam correções e regressões. Os resultados
por versão e os limites de aceitação manual estão no artefato e na entrega.
