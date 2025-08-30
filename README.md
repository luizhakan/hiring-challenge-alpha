# Multi-Source AI Agent Challenge

## Visão Geral
Este repositório reúne uma aplicação completa composta por **backend** e **frontend** para o desafio *Multi-Source AI Agent*. O objetivo é construir um agente inteligente capaz de responder perguntas utilizando diversas fontes de dados (SQLite, documentos e comandos externos) por meio de uma interface web.

## Estrutura do Projeto
```
/
├── backend   # API em Node.js/TypeScript com LangChain e LangGraph
└── frontend  # Interface web em React + TypeScript
```

## Documentação Detalhada
Para uma visão completa de cada arquivo e como as partes se conectam, consulte [docs/ARQUITETURA.md](docs/ARQUITETURA.md).

## Tecnologias Principais
- **Node.js** e **TypeScript**
- **LangChain** e **LangGraph** para orquestrar o agente
- **Express** para a API
- **SQLite** para armazenamento
- **React** com **Material UI** no frontend

## Pré-requisitos
- Node.js 18 ou superior
- npm
- Chave de API do provedor LLM (OpenAI ou Google Gemini)

## Configuração
1. Clone o repositório:
   ```bash
   git clone <url-do-repositorio>
   cd hiring-challenge-alpha
   ```

2. Configuração do **backend**:
   ```bash
   cd backend
   npm install
   cp .env.example .env
   ```
   Edite o arquivo `.env` e defina:
   - `LLM_PROVIDER` (`openai` ou `gemini`)
   - `OPENAI_API_KEY` ou `GOOGLE_API_KEY`
   - Opcional: `GOOGLE_MODEL` e `GOOGLE_EMBED_MODEL`

   Para desenvolvimento:
   ```bash
   npm run dev
   ```
   Para produção:
   ```bash
   npm run build
   npm start
   ```

3. Configuração do **frontend**:
   ```bash
   cd ../frontend
   npm install
   npm start
   ```
   A aplicação estará disponível em `http://localhost:3000`.

## Testes
- **Backend**: `npm test` (compila o TypeScript)
- **Frontend**: `npm test` (executa testes do React; utilize `--watchAll=false` para rodar uma vez)

## Como Funciona
O backend expõe endpoints para autenticação e interação com o agente. O agente decide de forma inteligente qual fonte de dados utilizar:
- Consulta bancos SQLite em `backend/data/sqlite`
- Pesquisa documentos em `backend/data/documents`
- Executa comandos externos (mediante aprovação) para buscar informação adicional

O frontend consome a API para oferecer uma experiência amigável de conversa com o agente.

## Licença
Este projeto é distribuído sob a licença MIT. Veja o arquivo `LICENSE` em cada subprojeto para mais detalhes.

