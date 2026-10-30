File name: [NUMERO_DA_ATIVIDADE]_prompt.md
Language: 
## Prompts para Automacao de Testes - [Titulo da Atividade]

---

### Informacoes Gerais

| Campo               | Descricao                                                                 |
|---------------------|---------------------------------------------------------------------------|
| Titulo da Atividade | [Titulo da atividade]                                                     |
| Locais              | [Modulo > Submódulo > Funcionalidade (`identificador_tecnico`)]           |
|                     | [Modulo > Submódulo > Funcionalidade (`identificador_tecnico`)]           |
| Tipo                | [Correcao de Bug / Melhoria / Nova Funcionalidade]                        |

---

#### Bug [NN] - [Titulo descritivo do bug]

---

##### Cenario [NN] - [Titulo do cenario] ([validacao do erro corrigido / regressao - descricao])

[Instrucao de papel do agente: indicar que se trata de um agente de testes automatizados,
o modulo onde o cenario sera executado e seu identificador tecnico,
e se o cenario e de regressao ou de validacao do erro corrigido]

**Pre-condicoes:**

[Descrever o estado inicial necessario para que o cenario possa ser executado com sucesso:
- Quais registros devem existir no sistema antes da execucao
- Quais campos e valores devem estar preenchidos nesses registros
- Qual deve ser o estado atual do objeto de teste no momento da execucao
- Quais condicoes nao devem estar presentes (ex: ausencia de pagamentos anteriores)]

**Passos:**

[Descrever de forma sequencial e atomica as acoes que o agente deve executar:
- Qual modulo ou tela deve ser acessado
- Como localizar o objeto de teste
- Quais acoes devem ser realizadas sobre ele
- Quais campos devem ser preenchidos e com quais valores literais
- Como confirmar ou salvar a operacao ao final]

**Validacoes esperadas:**

[Descrever os resultados que o agente deve verificar apos a execucao dos passos:
- Presenca ou ausencia de alertas ou mensagens do sistema
- Registro da operacao no historico do titulo
- Atualizacao do estado do objeto de teste (ex: situacao do titulo)
- Atualizacao de valores calculados (ex: Valor Pendente), incluindo a formula com valores
  literais e a regra de negocio que justifica o resultado esperado
- Para cenarios de validacao do erro corrigido: indicar explicitamente o resultado incorreto
  que caracterizava o bug, para que o agente confirme que esse comportamento nao ocorre mais]

**Resultado esperado:**

[Indicar o criterio de aprovacao ou reprovacao do cenario:
- Condicao de APROVADO: todas as validacoes foram atendidas
- Condicao de REPROVADO: ao menos uma validacao falhou, com registro da falha e captura de evidencia]

---

[Repetir o bloco de cenario para cada cenario]