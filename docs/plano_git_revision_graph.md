# Especificação Técnica de Implementação: Extensão VS Code - Git Revision Graph

Este documento serve como plano de arquitetura e especificação de engenharia (Prompt de Contexto/Instruções) para o **Codex/Cursor/Copilot** gerar os módulos necessários para clonar o comportamento do "Revision Graph" do TortoiseGit dentro de uma Webview do VS Code.

---

## 1. Visão Geral da Arquitetura
O TortoiseGit Revision Graph difere dos gráficos lineares porque foca na **topologia de referências**, e não no fluxo contínuo de commits. Ele funciona omitindo commits puramente lineares e estruturando o histórico como um Grafo Direcionado Acíclico (DAG) usando um layout hierárquico bidimensional (Algoritmo de Sugiyama).

A arquitetura da extensão consistirá em duas partes:
1. **Extension Host (Backend Node.js):** Executa comandos Git CLI estruturados, filtra a topologia e resolve ancestralidades de merges.
2. **Webview (Frontend TypeScript/HTML):** Consome os dados puramente estruturais e utiliza o motor **Cytoscape.js + Dagre Layout** para calcular posições $X/Y$, evitando cruzamento de arestas.

---

## 2. Pipeline de Dados & Extração do Histórico (Backend)

O backend deve executar o comando abaixo para obter a raiz topológica do repositório:
```bash
git log --all --date-order --pretty=format:"%H|%P|%D"
```
*Onde: `%H` = Hash do Commit, `%P` = Hashes dos Pais (separados por espaço), `%D` = Decorações (Branches/Tags/HEAD).*

### Algoritmo de Simplificação de Grafo (Essencial)
Para imitar o comportamento do TortoiseGit (equivalente ao `--simplify-by-decoration`), implemente a seguinte lógica de redução de nós no TypeScript do Extension Host:

1. **Identificação de Nós Críticos:** Um commit **DEVE** ser mantido no grafo final se preencher pelo menos um destes critérios:
   * Possui decorações (`%D` não está vazio: ex. `HEAD`, `refs/heads/*`, `refs/tags/*`).
   * É um commit de Merge (possui mais de um hash em `%P`).
   * É um commit de Bifurcação (é listado como pai por mais de um commit no log).
   * É o commit inicial do repositório (sem pais).

2. **Compressão de Caminhos Lineares (Ignorar Commits de Histórico):**
   * Todos os commits que não atendem aos critérios acima devem ser marcados para remoção.
   * Ao remover um commit intermediário `I` (onde `A -> I -> B`), a aresta deve ser reconstruída conectando diretamente o filho `A` ao ancestral crítico mais próximo `B`.
   * Repita o processo recursivamente até que todas as arestas apontem exclusivamente para Nós Críticos.

---

## 3. Estrutura de Dados de Saída (JSON do Grafo)
O Backend deve enviar para a Webview uma lista tipada de elementos compatível com a sintaxe do Cytoscape.js:

```typescript
export interface GraphElement {
    data: {
        id: string;          // Hash do commit
        label?: string;      // Nome das branches/tags associadas
        type: 'node' | 'edge';
        source?: string;     // Se for aresta (hash do filho)
        target?: string;     // Se for aresta (hash do pai/ancestral)
        isMerge?: boolean;   // Identificador visual para arestas de merge
    }
}
```

---

## 4. Renderização Visográfica & Layout (Frontend Webview)

A Webview utilizará o **Cytoscape.js** combinado com o algoritmo de layout hierárquico **Dagre** (que implementa as fases do método de Sugiyama: atribuição de camadas, minimização de cruzamentos e alinhamento de nós).

### Configuração do Motor de Layout
Configure o motor do frontend exatamente com estes parâmetros para espelhar a densidade visual do TortoiseGit:

```javascript
import cytoscape from 'cytoscape';
import dagre from 'cytoscape-dagre';

cytoscape.use(dagre);

const cy = cytoscape({
    container: document.getElementById('cy'),
    boxSelectionEnabled: false,
    autounselectify: true,
    layout: {
        name: 'dagre',
        rankDir: 'TB',          // Top to Bottom (Cima para Baixo, padrão TortoiseGit)
        nodeSep: 40,            // Espaçamento horizontal entre colunas/nós vizinhos
        rankSep: 60,            // Espaçamento vertical entre camadas de tempo/versões
        edgeWeight: function(edge) { return edge.data('isMerge') ? 1 : 2; } 
    },
    style: [
        {
            selector: 'node',
            style: {
                'content': 'data(label)',
                'background-color': '#007acc',
                'width': '16px',
                'height': '16px',
                'font-size': '11px',
                'text-wrap': 'wrap',
                'text-max-width': '150px',
                'color': '#ffffff'
            }
        },
        {
            selector: 'edge',
            style: {
                'width': 2,
                'line-color': '#4c4c4c',
                'target-arrow-shape': 'triangle',
                'target-arrow-color': '#4c4c4c',
                'curve-style': 'bezier' // Permite o desenho suave de curvas em merges complexos
            }
        },
        {
            selector: 'edge[isMerge]',
            style: {
                'line-style': 'dashed',
                'line-color': '#d13438', // Destacar linhas de merge em vermelho/tracejado como o Tortoise
                'target-arrow-color': '#d13438'
            }
        }
    ],
    elements: graphDataPassedFromBackend
});
```

---

## 5. Próximos Passos para o Codex
A partir desta especificação, gere os seguintes arquivos baseados no padrão TypeScript padrão de extensões VS Code:

1. `src/gitLogParser.ts`: Módulo backend encarregado de rodar o `git log`, parsear a string e aplicar o algoritmo de filtragem topológica e compressão de caminhos lineares.
2. `src/webviewProvider.ts`: Provedor da Custom Webview Panel injetando os scripts do `cytoscape` e `dagre`.
3. `media/main.js`: Código front-end responsável por receber o payload JSON via `window.addEventListener('message', ...)` e inicializar o gráfico do Cytoscape.js.
