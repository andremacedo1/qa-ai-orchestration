# 🚀 QA & AI Orchestration Architecture

Este repositório é um *Showcase* de Arquitetura de Testes focada em sistemas de alta complexidade logística e industrial. 

O mercado de Quality Assurance tradicional parou no tempo, apostando apenas em testes manuais ou scripts de automação isolados. O objetivo desta arquitetura é transformar o QA em um orquestrador: **o Engenheiro (humano) define as regras de negócio, limites e critérios estritos, e uma rede de agentes de IA executa o trabalho bruto de cobertura e codificação.**

## 💡 O Problema que esta arquitetura resolve
Em ecossistemas complexos (como ERPs, malha viária e automação fiscal), um bug em produção paralisa caminhões em barreiras fiscais. O gargalo clássico envolve:
- Lentidão na criação de cenários BDD a partir de tarefas vagas.
- Falta de padronização nas entregas do time.
- Risco alto durante o processo de *Merge* e CI/CD.

## 🛠️ A Solução Construída
Desenvolvi uma esteira de Qualidade Aumentada (orquestrada por IA) que atua diretamente no ciclo de vida do desenvolvimento.

### Principais Pilares:
1. **Model Context Protocol (MCP):** Agentes conectados diretamente ao Issue Tracker (e.g. Redmine/Jira), monitorando o board e atuando preventivamente.
2. **Templates Estritos:** A IA não tem liberdade criativa. Ela é forçada a formatar saídas baseadas em templates `.md` definidos pela Engenharia de QA.
3. **Git Merge Guard:** Interceptação real via Git Hooks, bloqueando *Pull Requests* que não atendem aos critérios de SLA de teste estabelecidos.
4. **Playwright E2E:** Geração automática da casca de testes *Page Object Model* (POM) baseada nos cenários BDD validados.

---

## 📊 Arquitetura do Ecossistema

### 1. Visão Macro: Orquestração de Agentes
```mermaid
graph TD
    classDef ai fill:#2a0a4a,stroke:#9d4edd,stroke-width:2px,color:#fff;
    classDef tools fill:#003f5c,stroke:#2f4b7c,stroke-width:2px,color:#fff;
    classDef core fill:#bc5090,stroke:#ff6361,stroke-width:2px,color:#fff;

    subgraph Tracker [Gestão e Contexto]
        IT[Issue Tracker / Kanban]:::tools
        MCP[Model Context Protocol - Local Watcher]:::core
    end

    subgraph AIAgents [Ecossistema de Agentes IA]
        Coord[Agente: Coordenador QA]:::ai
        Analyst[Agente: Analista QA - Gera BDD]:::ai
        Reviewer[Agente: Git Merge Guard]:::ai
    end

    subgraph Automation [Automação e Execução]
        PW[Playwright E2E Framework]:::tools
    end

    IT <-->|Atualizações| MCP
    MCP -->|Injeta Contexto| Coord
    Coord -->|Delega Tarefa| Analyst
    Analyst -->|Gera Gherkin/Specs| PW
    Reviewer -->|Audita Code Quality| IT