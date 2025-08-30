import "dotenv/config";
import { ChatOpenAI } from "@langchain/openai";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { DynamicTool } from "langchain/tools";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { querySQLite } from "../tools/sqliteTool";
import { searchDocuments } from "../tools/docTool";
import { runBash } from "../tools/bashTool";
import dotenv from 'dotenv';

dotenv.config();

export async function buildAgent() {
  const tools = [
    new DynamicTool({
      name: "sqlite",
      description:
        'Execute SQL queries against a SQLite database. Input format: {"dbPath": string, "sql": string}',
      func: async (input: string) => {
        const { dbPath, sql } = JSON.parse(input);
        const rows = await querySQLite(dbPath, sql);
        return JSON.stringify(rows);
      },
    }),
    new DynamicTool({
      name: "documents",
      description:
        "Search for information inside local .txt files located in data/documents. Input: natural language question",
      func: async (query: string) => searchDocuments(query),
    }),
    new DynamicTool({
      name: "bash",
      description:
        "Run a bash command. Use this to search the web using curl. Input: command string",
      func: async (command: string) => runBash(command),
    }),
  ];

  const provider = process.env.LLM_PROVIDER ?? "openai";
  const model =
    provider === "gemini"
      ? new ChatGoogleGenerativeAI({
          model: process.env.GOOGLE_MODEL || "gemini-1.5-flash",
          temperature: 0,
        })
      : new ChatOpenAI({ temperature: 0 });

  return createReactAgent({
    llm: model,
    tools,
  });
}