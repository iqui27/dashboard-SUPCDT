# Context — Phase 04: Full Product Polish & Production UX

## Por que esta fase existe
As fases anteriores resolveram fundação, monitoramento operacional e o módulo Wi‑Fi Social. O produto agora já cobre o que precisa funcionalmente, mas ainda tem dois problemas de adoção real:

- o carregamento web ainda está pesado
- a experiência ainda precisa de acabamento global, consistência de interação e sensação de produto maduro

## Sinais atuais
- build web acima de 1 MB no bundle principal
- carregamento inicial ainda puxa módulos pesados mesmo quando o usuário não acessa todas as áreas
- loaders e estados de transição ainda estão espalhados
- a navegação principal está funcional, mas ainda pode comunicar melhor contexto e manter consistência entre módulos

## Decisão de abordagem
- Primeiro atacar peso e carregamento percebido com code splitting e loaders consistentes
- Depois consolidar acabamento visual, microinterações, estados vazios e responsividade final
- Evitar grandes refactors estruturais no fim do ciclo; foco em ganhos de percepção e robustez

## Resultado esperado ao fim da fase
- app shell mais leve e com carregamento progressivo por módulo
- transições e estados de espera consistentes em todo o produto
- módulos principais com padrão visual mais homogêneo
- produto pronto para adoção institucional com melhor sensação de performance
