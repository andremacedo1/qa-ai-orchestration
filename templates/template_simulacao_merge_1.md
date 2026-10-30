**No projeto:** `[nome_do_projeto]`
- Simulacao de merge `[origem]` into `[destino]`
<!-- Se N = 0, informar que o merge nao e necessario e encerrar aqui, sem preencher o restante do template -->
- Diferenca encontrada: [N] commit(s) em `[origem]` que ainda nao estao em `[destino]`
- Arquivos alterados: [N] arquivo(s)
<!-- Se N = 0, trocar a linha abaixo por "- Nenhum conflito previsto" -->
- :warning: Conflitos previstos em [N] arquivo(s): `[arquivo1]`, `[arquivo2]`
- [:green_circle: / :yellow_circle: / :red_circle:] Nivel de seguranca estimado: [Baixo/Medio/Alto] ([criterio(s) que determinaram o nivel])

<!-- Bloco condicional: incluir somente quando ha conflito previsto. -->
`[mensagem de commit que seria usada, incluindo a linha #Conflicts prevista]`

> Autor do commit conflitante: [nome do autor]

---

Ha alguma duvida em relacao a esse merge?
Deseja prosseguir com esse merge? (em caso afirmativo e o destino nao for producao, prossigo conforme o Protocolo 1 a partir da branch de backup)
