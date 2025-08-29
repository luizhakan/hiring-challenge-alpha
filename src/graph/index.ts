import { StateGraph, START, END } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { searchDocuments } from "../tools/docTool";
import { buildAgent } from "../agent";

export async function run(question: string) {
  const provider = process.env.LLM_PROVIDER ?? "openai";
  const graph = new StateGraph<any>({ channels: { question: "string", answer: "string" } } as any);

  graph.addNode(
    "checkDocs",
    async (state: any) => {
      const docResult = await searchDocuments(state.question);
      if (!docResult.startsWith("Nenhum")) {
        const model =
          provider === "gemini"
            ? new ChatGoogleGenerativeAI({ model: process.env.GOOGLE_MODEL || "gemini-1.5-flash", temperature: 0 })
            : new ChatOpenAI({ temperature: 0 });
        const prompt =
          `Baseado exclusivamente no texto a seguir, responda à pergunta.\n` +
          `Texto: ${docResult}\n` +
          `Pergunta: ${state.question}\n` +
          `Resposta em português:`;
        const response = await model.invoke(prompt);
        const answer = typeof response === "string" ? response : response.content;
        return { answer };
      }
      return {};
    }
  );

  const agent = await buildAgent();
  graph.addNode(
    "agent",
    async (state: any) => {
      const result = await agent.invoke({ messages: [{ role: "user", content: state.question }] });
      const answer = result.messages[result.messages.length - 1]?.content ?? "";
      return { answer };
    }
  );

  graph.addEdge(START, "checkDocs" as any);
  graph.addConditionalEdges(
    "checkDocs" as any,
    (state: any) => (state.answer ? END : "agent"),
    { agent: "agent" as any, [END]: END }
  );
  graph.addEdge("agent" as any, END);
  const app = graph.compile();
  const finalState = await app.invoke({ question });
  return finalState.answer ?? "";
}
