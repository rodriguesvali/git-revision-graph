# Git Refs Explorer

MVP de extensao para VS Code focada em navegar referencias Git e executar operacoes comuns a partir de uma arvore dedicada.

## Escopo atual

- Visualizacao de `branches`, `tags` e `remote branches`
- Compare entre duas referencias
- Compare de uma referencia com a worktree
- Checkout com tratamento guiado para `remote branches`
- Merge da referencia selecionada na branch atual

## Estrutura da UX

- Activity Bar: `Git Refs`
- View principal: `References`
- Menu de contexto em cada referencia com as acoes principais
- Command Palette com os mesmos comandos

## Limites conhecidos do MVP

- Compare abre a lista de arquivos alterados em um `Quick Pick`, nao uma arvore de diff persistente
- Merge delega resolucao de conflitos para a experiencia nativa de SCM do VS Code
- Conteudo binario e casos exoticos de encoding podem aparecer como vazio no diff

## Desenvolvimento

```bash
npm install
npm run build
```

Depois, abra o projeto no VS Code e rode a extensao com `F5`.
