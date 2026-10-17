# Revisão de fragilidades — busca binária de bugs

Data: 2026-10-17. Baseline: pacote 1.7.5, commit `63159a4`.
Status: diagnóstico do baseline concluído; B1, B2 e B3 corrigidos nos acompanhamentos
abaixo.

## Escopo e método

Revisão do fluxo gráfico/Show Log → preparação → seleção nativa Git → checkout →
classificação/undo → persistência/reload → encerramento. Foram inspecionados o
coordenador de mutações, a validação/autorização de mensagens, a composição no
workbench, o estado persistido e os controles/indicadores da webview.

Graphify localizou o núcleo `BugBisectSessions` e seus chamadores. A consulta
ampla inicial foi truncada; `graphify explain BugBisectSessions` e leitura dos
arquivos relacionados delimitaram o escopo. Vocabulário conferido no grafo:
`bisect`, `session`, `ownership`, `control`, `recovery`, `persist`, `checkout`, `log`.
O grafo orienta navegação; código e reproduções determinísticas fundamentam os
achados, sem inferir defeitos a partir de métricas de comunidades.

Todos os experimentos Git usaram fixtures descartáveis, Linux/Git 2.55.0 e os
módulos compilados da árvore atual. Nenhum checkout, ref ou metadado do
repositório de desenvolvimento ou do Angular foi alterado. Não houve mudança de
código de produção, dependência, versão, pacote ou publicação.

## Resultado

| ID | Prioridade | Achado | Verificação |
| --- | --- | --- | --- |
| B1 | P1 — alta | Log idêntico permite assumir e resetar um bisect externo substituto | Reproduzido com Git real |
| B2 | P2 — média | Resposta aplicada antes de persistir o novo log impede retomada após reload | Reproduzido com falha de armazenamento após o comando Git |
| B3 | P2 — média | Perda do tipo da referência pode selecionar uma tag ao clicar na branch homônima | Reproduzido pelo handler real com Git real |

As três falhas envolvem identidade entre fronteiras: identidade da instância
nativa, identidade da transição persistida e identidade da referência escolhida.

## B1 — Log igual não identifica a instância de bisect

Fontes: [verificação de propriedade](../../src/bugBisect/session.ts:288),
[reset condicionado](../../src/bugBisect/session.ts:300) e
[encerramento](../../src/bugBisect/session.ts:262).

`assertOwned` verifica o hash de HEAD, a existência de `BISECT_START` e a igualdade
textual de `git bisect log`. Não compara o conteúdo de `BISECT_START` nem identifica
a instância nativa. Duas sessões iniciadas com os mesmos hashes e opções podem
produzir logs idênticos, embora a segunda tenha sido iniciada externamente.

Reprodução:

1. Criar sete commits lineares; preparar/iniciar pela extensão com limites 6/0.
2. A extensão destaca HEAD no commit indicado para teste.
3. Pelo terminal da fixture, executar reset sem checkout e iniciar outro bisect
   `--no-checkout` com os mesmos limites 6/0.
4. Confirmar que o log é idêntico. O conteúdo de `BISECT_START` mudou de `main`
   para o hash destacado do teste, mas a verificação atual não lê esse conteúdo.
5. Confirmar Stop pela extensão.

Observado: o controle encerra sem erro, retorna a `main`, remove os metadados do
bisect externo e apaga a sessão da extensão. O erro ocorre também sem corrida
entre processos: a substituição externa termina antes de Stop.

Impacto: a proteção declarada de nunca resetar uma sessão externa é violada.
Não foi observado apagamento de arquivos ou movimentação de refs de branches;
o efeito confirmado é a remoção indevida da sessão nativa externa e o checkout.

Correção proposta: definir uma identidade verificável da instância nativa,
capturada e persistida no início e revalidada antes de respostas, checkout e reset.
Incluir o destino inicial e metadados relevantes; somente endpoints/log não
bastam. Distinguir essa identidade da prova de uma transição esperada do log.

Aceitação: substituir por um bisect externo com os mesmos limites deve bloquear
resposta, undo e Stop, preservando checkout/metadados externos. Continuar cobrindo
reload e as transições legítimas da própria extensão, inclusive undo/rebuild.

## B2 — Janela entre mutação e persistência bloqueia recuperação

Fontes: [registro da resposta pendente](../../src/bugBisect/session.ts:167),
[comando e persistência posterior](../../src/bugBisect/session.ts:195),
[verificação antes de retry](../../src/bugBisect/session.ts:79) e
[igualdade estrita do log](../../src/bugBisect/session.ts:294).

O histórico e `pendingAnswer` são persistidos antes do comando nativo. Depois de
aplicar a resposta, `ownCommand` lê o novo log e tenta persistir novamente. Se o
processo não conseguir completar nenhuma gravação posterior antes de reload, o
snapshot durável contém a resposta pendente com o log anterior. Ao recarregar,
`control` rejeita o log novo antes de executar a recuperação de `pendingAnswer`.

Reprodução:

1. Iniciar uma busca normal e manter o primeiro checkout limpo.
2. Persistir a intenção de `good` normalmente.
3. Deixar o Git aplicar `good`, mas fazer `host.save` falhar quando recebe o log
   atualizado e em todas as gravações seguintes até o reload.
4. Recriar o gerenciador a partir do último snapshot durável; restaurar o storage.
5. Executar Retry e depois Stop com id/versão atuais.

Observado: ambos retornam `Git bisect state changed outside this search. No
external session will be reset.` A sessão nativa continua ativa e o repositório
continua reservado. A resposta pendente aparece uma vez no histórico, mas a
retomada não consegue reconciliá-la com sua própria alteração nativa.

Impacto: falha de armazenamento ou interrupção nessa janela exige recuperação
manual/Detach Controls, mesmo sem qualquer interferência externa. O teste atual
de storage falha antes do comando e permite gravações posteriores; por isso não
exercita essa janela. O bloqueio preserva o Git e não prova perda de arquivos.

Correção proposta: registrar uma transição pendente durável e reconciliar, no
reload, tanto a hipótese de comando não aplicado quanto a de comando já aplicado.
Validar a extensão exata esperada do log e a identidade nativa do B1; não aceitar
logs arbitrários nem repetir uma classificação sem verificar seus efeitos.

Aceitação: falhar após o efeito Git e antes do snapshot atualizado deve permitir
retomada ou restauração segura, com uma única resposta no histórico. Acrescentar
casos de início/resposta/rebuild interrompidos e preservar rejeição de substitutos
externos. Uma falha transitória anterior ao comando continua recuperável.

## B3 — Referência perde seu namespace antes da resolução

Fontes: [envio do alvo](../../src/revisionGraph/webview/script/interactions.ts:321),
[handler](../../src/revisionGraph/messageHandler.ts:93),
[preparação](../../src/bugBisect/session.ts:51) e
[resolução Git](../../src/bugBisect/git.ts:23).

A webview envia `revision` e `refKind`; a autorização confirma que a combinação
existe no grafo. Porém o handler passa apenas `revision` para a preparação. O Git
resolve então o nome curto sem conhecer o tipo que o usuário escolheu.

Reprodução: branch `release` no commit 1, tag `release` no commit 4 e HEAD no
commit 6. Enviar ao handler real `{ type: 'start-bug-bisect', revision: 'release',
refKind: 'branch' }`. O endpoint selecionado é o commit 4 da tag, e não o commit 1
da branch clicada. Não depende de refresh obsoleto ou de mensagens inválidas.

Impacto: a busca pode operar em um intervalo diferente do escolhido, produzir um
resultado incorreto para aquele intervalo pretendido ou rejeitar indevidamente
endpoints que parecem distintos no grafo. A confirmação mostra o hash/subject,
mas isso não preserva a escolha original da referência.

Correção proposta: manter o alvo tipado até a resolução no host e qualificar
branch/tag/remoto no respectivo namespace, ou resolver o hash da referência
host-validada. HEAD e commits já identificados exigem sua semântica própria.

Aceitação: branch e tag homônimas em commits distintos devem selecionar cada
uma seu próprio commit. Cobrir também colisão com remoto e a entrada pelo Show
Log, que já transmite o hash completo. As regras de desambiguação estão na
[documentação oficial do Git](https://git-scm.com/docs/gitrevisions#_specifying_revisions):
tags precedem branches na resolução de nomes curtos. Context7 `/git/htmldocs`
também retornou essa ordem; o comportamento foi confirmado localmente.

## Verificação e limites

- Os cinco arquivos de testes de bisect existentes passaram: **35 testes**,
  zero falhas/skips. Incluem história linear/merge/divergência, skips, worktrees,
  limpeza, mensagens antigas/duplicadas, undo, reload e recuperação já coberta.
- O recorte de bisect de `revisionGraphWebview.test` passou: **7 testes**,
  zero falhas/skips. Inclui controles compactos, foco, bloqueio de duplicatas,
  conclusão e visibilidade do marcador. Total do recorte: **42 testes**.
- As três novas reproduções passaram como verificações dos defeitos existentes,
  com asserts explícitos e sem alterar produção. Não são correções nem novos
  testes de regressão incorporados à suíte.
- Evidência temporária: `/tmp/bisect-review-baseline.log`,
  `/tmp/bisect-review-webview.log`, `/tmp/bisect-review-probe.cjs`,
  `/tmp/bisect-review-probe.log`, `/tmp/bisect-start-identity.cjs`.
- Não houve nova execução da suíte completa, build, benchmark ou Extension Host;
  esta etapa é uma revisão sem mudanças de código. Os testes com Git usam checkout
  real injetado no adaptador e não comprovam prompts nativos do VS Code.

Jev foi usado somente para conferir o suporte das conclusões às evidências,
conforme a skill TypeSafe e seu cookbook de verificação. `jev_verify`, modelo
`jev-1.13.0`: B1 e B3 verificados com confiança 0,98; B2 verificado com confiança
0,73 e marcado para revisão. B2 foi então conferido novamente por inspeção do
fluxo e reprodução determinística de Retry **e** Stop bloqueados após reload.
Essas execuções, e não a avaliação probabilística, sustentam o achado. Consumo
reportado pelo serviço: 2.001 tokens de entrada / 402 de saída.

Ordem recomendada: B1 (propriedade), B2 (reconciliação durável apoiada nessa
identidade), B3 (preservação do alvo tipado, independente dos dois primeiros).

## Acompanhamento — B1

O mantenedor autorizou tratar B1 em 2026-10-17. A correção e suas verificações
estão no [artefato de propriedade nativa](features/1.7.5-bisect-native-ownership.md).
Os achados e reproduções acima descrevem o baseline `63159a4`; B2 e B3 continuam
pendentes e não fazem parte dessa implementação.

## Acompanhamento — B2

O mantenedor autorizou B2 após o commit de B1. A retomada de respostas aplicadas
com persistência interrompida, suas duas janelas de falha e o replay ordenado do
Undo estão no [artefato de recuperação](features/1.7.5-bisect-answer-recovery.md).
B3 permanece pendente; a descrição original de B2 acima é evidência do baseline.

## Acompanhamento — B3

O mantenedor autorizou B3 após o commit de B2. O tipo da referência agora atravessa
handler, controller e preparação até a consulta exata no namespace Git escolhido.
A entrada pelo Show Log identifica explicitamente o hash como commit. A correção,
os testes com nomes homônimos e as verificações pelo Extension Host estão no
[artefato de identidade do alvo](features/1.7.5-bisect-target-identity.md).
Os três achados originais acima continuam como diagnóstico histórico do baseline.
