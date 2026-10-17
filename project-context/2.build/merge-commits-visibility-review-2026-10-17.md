# Revisão — View → Show Merge Commits

Data: 2026-10-17. Baseline: 1.7.5, commit `b5a909a`.
Status: diagnóstico concluído; remoção da opção autorizada posteriormente, com
implementação registrada no [artefato de remoção](features/1.7.5-remove-merge-visibility-option.md).
Os achados sobre os dados de origem continuam separados dessa simplificação da UI.

## Escopo e método

Inspeção do checkbox → mensagem tipada → workflow → reaproveitamento de snapshot
→ carregamento Git → projeção. Graphify orientou a navegação; a consulta ampla
foi truncada e `explain isMajorOperationsCommitVisible` delimitou a regra central.
Fixtures descartáveis com Git 2.55.0 usaram o construtor de argumentos, parser,
modelo e projetor compilados da árvore atual. O checkout Angular não foi acessado.

## M1 — P2: o carregamento elimina merges antes de aplicar a opção

O checkbox envia `showMergeCommits` em
`src/revisionGraph/webview/script/bootstrap.ts:240`; o handler encaminha a opção
e `src/revisionGraph/viewStateWorkflow.ts:36` atualiza o estado e solicita
`projection-only`. Não foi encontrado descarte do booleano nesse percurso.

Entretanto, `src/revisionGraph/source/graphGit.ts:121` sempre inclui
`--simplify-by-decoration`, sem consultar `showMergeCommits`. Os loaders ativo e
compatível leem esse resultado e marcam o grafo como `git-decoration`. O Git pode
omitir merges sem referências e reescrever seus pais. A projeção não recupera
commits que nunca chegaram ao snapshot.

Fixture: base → commits independentes em main/topic → merge `--no-ff` → commit
posterior em main. A branch topic é removida depois do merge.

| Variação | Opção desligada | Opção ligada |
| --- | --- | --- |
| Topic removida, comando atual | 2 nós; merge ausente do snapshot | Os mesmos 2 nós |
| Topic preservada, comando atual | 3 nós; merge ausente do snapshot | Os mesmos 3 nós |
| Referências independentes nos dois pais do merge | 4 nós; merge oculto | 5 nós; merge visível |

Na mesma fixture sem `--simplify-by-decoration`, o merge volta a existir no
snapshot e a opção passa a acrescentá-lo à projeção. Portanto, a funcionalidade
funciona em topologias específicas, mas sua entrada já pode ter perdido os nós
que ela deveria mostrar.

O reaproveitamento em `src/revisionGraphRefresh.ts:101` também ignora essa opção.
Hoje ele reutiliza um histórico igualmente simplificado. Se a consulta passar a
depender de `showMergeCommits`, esse contrato precisa ser ajustado junto; alterar
apenas a consulta não garante recarregamento ao clicar no checkbox.

## M2 — P2: identificação de merge depende dos pais carregados

`src/revisionGraph/projection/graphProjection.ts:276` conta apenas os pais que
pertencem ao conjunto de commits carregados, excluindo fronteiras. Depois define
`isMerge = parentCount > 1`. Um merge real com dois pais pode ser tratado como
linear se um deles estiver fora do limite de histórico/escopo.

Reprodução adicional com Git real: remover a simplificação somente no probe e
limitar a saída a três commits. O merge é carregado com dois pais originais, um
deles fronteira; as duas configurações projetam apenas `after merge` e `topic`.
O commit de merge permanece oculto mesmo com a opção ligada. Um probe mínimo do
modelo confirma o mesmo resultado. A classificação de merge precisa considerar
sua identidade original, separadamente das regras de fronteira/escopo.

## Comportamento estrutural que também reduz a diferença visual

A regra em `graphProjection.ts:290` é aditiva: além dos merges solicitados, mantém
commits com referências visíveis, forks, raízes e pontas não referenciadas. Assim,
um merge com tag/branch/HEAD pode continuar visível com a opção desligada. A fixture
com tag no merge confirmou igualdade nas duas configurações. Isso preserva pontos
de navegação, mas o rótulo atual não explica essas exceções.

## Encaminhamento recomendado

1. Garantir que o snapshot usado com a opção ligada contenha os merges e sua
   informação de parentesco; avaliar a carga e os limites ao alterar a consulta.
2. Alinhar a compatibilidade de snapshots à nova política de carregamento.
3. Classificar merges sem depender de ambos os pais estarem dentro da janela.
4. Manter referências e pontos estruturais acessíveis e esclarecer essa semântica
   na interface; evitar prometer que desligar remove todo commit de merge.
5. Acrescentar regressões com Git real desde o carregamento, incluindo topic
   removida, pais fora do limite e alternância usando snapshot já carregado.

## Verificação e limites

- Sete testes existentes de projeção/workflow/reuso passaram, zero falhas/skips.
  Eles confirmam o booleano e a projeção com grafos preparados, mas não cobrem a
  eliminação de merges pela consulta Git nessas fixtures.
- Evidências: `/tmp/merge-visibility-probe.cjs`, `.log`, `.json`,
  `/tmp/merge-boundary-probe.cjs`, `.log` e
  `/tmp/merge-visibility-existing-tests.log`.
- Context7 `/git/htmldocs` confirmou a seleção e reescrita na simplificação;
  [documentação oficial](https://git-scm.com/docs/git-log#_history_simplification).
  A reprodução local, não a documentação isolada, estabelece os achados.
- Jev `jev_verify` (`jev-1.13.0`) apoiou M1 com confiança 0,98 e M2 com 0,61,
  marcando M2 para revisão. M2 foi conferido novamente no cálculo de parentCount
  e no probe Git limitado. A atribuição ao checkout Angular específico não tem
  evidência local e não é afirmada. Uso: 1.779 tokens de entrada / 304 de saída.
- Não houve nova suíte completa, build ou Extension Host: esta etapa modifica
  somente este registro de análise. Não houve alteração de Git, refs ou arquivos
  do repositório de desenvolvimento nos experimentos, nem commit/publicação.

## Avaliação de necessidade — proposta, não implementação

O mantenedor pediu avaliar a retirada da opção. A recomendação é remover o
controle e seu contrato interno, mantendo uma política compacta e automática
próxima do padrão atual. A importância dos merges no histórico não implica que
seja necessário um checkbox para controlá-los.

### Valor e custo

O [artefato original de 1.0.0](../archive/features/1.0.0-show-merge-commits-view-option.md)
documenta um benefício legítimo: alternar detalhe e ruído de merges sem referências.
Não era um filtro absoluto: referências, forks, raízes e pontas continuariam
visíveis. Para auditoria de integrações essa informação pode ser útil, mesmo sem
ser o fluxo dominante de navegação por referências.

O problema de produto é oferecer uma decisão de efeito pouco previsível, cujas
exceções e dependência do histórico carregado não são aparentes. Corrigir o modo
completo exigiria alinhar aquisição Git, fronteiras, cache, projeção e verificações
de desempenho. Há ocorrências em 10 arquivos de produção e 9 de testes, além de
benchmark e documentação; esses números são pontos de contato, não uma estimativa
de esforço ou prova de complexidade desnecessária.

O [precedente 0.0.28](../archive/features/0.0.28-remove-branchings-merges-view-option.md)
retirou uma opção distinta, `Show Branchings & Merges`, por baixo valor para o
grafo de referências e variabilidade no carregamento. Isso informa a decisão,
sem funcionar como aprovação atual ou prova contra toda visualização de merges.

Não há métricas de uso que permitam afirmar que ninguém depende do controle.
A recomendação é um julgamento de produto apoiado no escopo e nas falhas
reproduzidas, não uma conclusão sobre adoção.

### Alternativas

| Alternativa | Benefício | Custo ou perda |
| --- | --- | --- |
| Manter e corrigir | Permite pedir mais detalhes de integração no próprio grafo | Mantém a decisão e exige completar a cadeia de carregamento/projeção |
| Remover e manter política compacta automática — recomendada | Menu mais simples e comportamento próximo do padrão atual | Retira a inspeção opcional dos merges adicionais no grafo |
| Remover e mostrar sempre todos os merges da janela | Integrações explícitas sem alternância | Muda o padrão visual, exige corrigir aquisição e medir volume/layout |

Show Log continua apresentando commits de merge e pode complementar a inspeção,
mas suas consultas de alvo usam primeira-parentalidade por padrão. Ele não é
substituto equivalente para uma visualização completa de toda a DAG.

### Escopo sugerido para eventual remoção

- Retirar checkbox, registro DOM, listeners, sincronização, texto de carregamento
  e resumo de filtros, além do booleano em tipos, defaults, validação e protocolo.
- Consolidar a projeção compacta: manter referências e conectores estruturais
  necessários entre os dados carregados, sem excluir commits apenas por serem
  merges. Evitar substituir o toggle por outra configuração avançada equivalente.
- Preservar ações Git de merge/abort, Show Log, comparação, bisect e foco. A remoção
  não altera dados Git nem deve disparar mutações de repositório.
- Não foi encontrada configuração pública do manifesto nem preferência durável
  desse booleano. O controller reinicializa projeções e a persistência da webview
  trata minimap/offsets. O impacto de migração é principalmente o contrato interno
  host/browser; atualizar ambos e tolerar campos antigos sem restabelecer o modo.
- Substituir testes da opção por invariantes da política fixa; verificar cenários
  Git reais, limites, referências estruturais, UI e benchmark, sem apagar cobertura
  de ancestralidade para obter testes verdes. Documentar a mudança no release.

**Limite importante:** remover o controle não recupera merges/parentesco que o Git
já simplificou. M1 deixa de ser uma promessa quebrada de um modo opcional removido,
mas a fidelidade geral do carregamento e M2 continuam assuntos próprios. Caso a
proposta do produto passe a exigir todos os merges, a aquisição precisa ser
corrigida mesmo sem checkbox.

Jev `jev_decide` (`jev-1.13.0`) favoreceu `remover + compacto` com 0,99 sob critérios
de simplicidade e preservação do padrão (2.263 tokens de entrada / 464 de saída).
Isso não é probabilidade de sucesso nem aprovação. Sua matriz também classificou
`manter e corrigir` como incompatível com preservar o padrão; essa subavaliação
não foi adotada, pois um modo corrigido pode manter o default desligado. A
recomendação final considera as alternativas acima por inspeção e julgamento.

Não foram feitas alterações de implementação nem novos testes nesta avaliação.

## Acompanhamento — implementação autorizada

Após a avaliação, o mantenedor autorizou seguir com a recomendação. A remoção
completa do controle/contrato e a manutenção da política compacta estão no
[artefato de implementação](features/1.7.5-remove-merge-visibility-option.md).
Os experimentos e a avaliação acima descrevem o baseline e a decisão que antecederam
essa autorização, sem afirmar correção de fidelidade do histórico.
