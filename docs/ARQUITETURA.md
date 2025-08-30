# Documentação de Arquitetura

Este documento descreve detalhadamente todos os arquivos do projeto, explicando as tecnologias utilizadas e como cada parte se conecta para formar o sistema completo.

## Estrutura Geral

```
/
├── backend    # API Node.js com LangChain/LangGraph
├── frontend   # Interface web React + TypeScript
└── docs       # Documentação adicional
```

O **frontend** consome os endpoints expostos pelo **backend** para autenticação e interação com o agente de IA.

## Backend

### Arquivos de Configuração e Dados
- **package.json** – Define dependências e scripts (compilação, testes, execução).
- **tsconfig.json** – Configura o compilador TypeScript.
- **.env.example** – Modelo de variáveis de ambiente (`LLM_PROVIDER`, chaves de API, `JWT_SECRET`).
- **data/users.db** – Banco SQLite com usuários, sessões e mensagens.
- **data/cache.json** – Armazena em cache perguntas e respostas para consultas futuras.

### src/server.ts
Servidor Express que:
- Carrega variáveis com `dotenv` e valida `JWT_SECRET`.
- Habilita **CORS** com base na lista `src/config/whitelist.ts`.
- Inicializa o banco via `initializeDatabase`.
- Disponibiliza rotas de autenticação (`/api/auth`).
- Protege rotas com middleware JWT.
- Gerencia sessões: criação, listagem, histórico, envio de mensagens e exclusão usando funções de `src/sessions/sessions.ts`.

### src/auth/auth.ts
Router Express responsável por registrar e autenticar usuários:
- Armazena senhas criptografadas com **bcrypt**.
- Gera tokens JWT com tempo de expiração.

### src/db/database.ts
Inicializa o arquivo SQLite `users.db` e garante as tabelas:
- `users` (credenciais), `sessions` (metadados) e `messages` (histórico do chat).

### src/sessions/sessions.ts
Funções utilitárias para manipular sessões:
- **createSession** – cria registro de sessão.
- **getSessionHistory** – busca mensagens e tokens.
- **addMessageToSession** – grava mensagens e atualiza contagem de tokens.
- **getSessionsByUserId** – lista sessões do usuário.
- **handleAgentMessage** – envia pergunta para o agente (`runAgent`) e salva a conversa.
- **deleteSession** – remove sessão e mensagens associadas.

### src/tools
- **bashTool.ts** – Executa comandos do sistema via `child_process.exec`.
- **sqliteTool.ts** – Faz consultas em arquivos SQLite.
- **docTool.ts** – Extrai texto de PDFs/EPUBs, divide em pedaços, gera embeddings e realiza busca semântica usando LangChain.

### src/agent
- **agent.ts** – Cérebro do sistema. Decide a origem da resposta (documentos de treinamento, documentos aprendidos, web ou cache) utilizando LLMs (OpenAI ou Google Gemini) e ferramentas acima.
- **index.ts** – Constrói um agente React de LangGraph com ferramentas dinâmicas (`sqlite`, `documents`, `bash`).

### src/graph/index.ts
Reexporta `run` do agente, servindo como ponto único de execução.

### src/config/whitelist.ts
Lista de origens permitidas para CORS (por padrão `http://localhost:3001`).

## Frontend

### Arquivos de Configuração
- **package.json** – Dependências do React, Material UI e scripts padrão.
- **tsconfig.json** – Regras de TypeScript.
- **public/** – Contém `index.html`, manifest e ícones usados na build.

### src/index.tsx
Ponto de entrada do React:
- Aplica tema escuro futurista com **Material UI**.
- Renderiza `App` dentro do `ThemeProvider`.

### src/App.tsx
Define rotas com **React Router**:
- `/register`, `/login`, `/chat` e `/chat/:sessionId`.
- Rotas desconhecidas redirecionam para `/login`.

### src/pages
- **Login.tsx** – Formulário de login que chama `/api/auth/login` e armazena token no `localStorage`.
- **Register.tsx** – Formulário de registro que envia dados para `/api/auth/register`.
- **Chat.tsx** – Interface de chat que:
  - Lista sessões existentes e permite criação/remoção.
  - Envia mensagens para `/api/sessions/:id/message` e exibe respostas.
  - Controla limite de tokens por sessão e salva histórico.

### Outros Arquivos
- **index.css** – Estilos globais básicos.
- **react-app-env.d.ts** – Declarações de tipos geradas pelo Create React App.

## Fluxo de Funcionamento
1. O usuário registra-se ou autentica-se pelo frontend.
2. O frontend armazena o token JWT e passa a usar as rotas protegidas do backend.
3. Cada mensagem enviada em uma sessão é processada por `handleAgentMessage`, que delega a lógica a `agent.ts`.
4. O agente consulta documentos, banco de dados e web, atualizando o cache e persistindo respostas.
5. O frontend exibe o histórico de mensagens, permitindo múltiplas sessões.

## Tecnologias Envolvidas
- **Node.js / TypeScript**
- **Express**
- **SQLite**
- **LangChain** e **LangGraph**
- **JWT** para autenticação
- **React** com **Material UI**
- **DuckDuckGo + curl** para buscas na web

