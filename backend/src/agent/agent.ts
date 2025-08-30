import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatOpenAI } from "@langchain/openai";
import { Document } from "@langchain/core/documents";
import fs from "fs";
import path from "path";
import { searchDocuments } from "../tools/docTool";
import { runBash } from "../tools/bashTool";
import { encode } from "gpt-3-encoder";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { OpenAIEmbeddings } from "@langchain/openai";
import dotenv from 'dotenv';

dotenv.config();

const tokenUsage = {
  input: 0,
  output: 0,
  total: 0,
};

const provider = process.env.LLM_PROVIDER ?? "openai";
const model =
  provider === "gemini"
    ? new ChatGoogleGenerativeAI({
        model: process.env.GOOGLE_MODEL || "gemini-1.5-flash",
        temperature: 0,
      })
    : new ChatOpenAI({ temperature: 0 });

const embeddings =
  provider === "gemini"
    ? new GoogleGenerativeAIEmbeddings({
        model: process.env.GOOGLE_EMBED_MODEL || "text-embedding-004",
      })
    : new OpenAIEmbeddings();

const cachePath = path.join(process.cwd(), "data", "cache.json");

async function invokeModel(prompt: string) {
  const inputTokens = encode(prompt).length;
  tokenUsage.input += inputTokens;

  const response = await model.invoke(prompt);
  const answer = (
    typeof response === "string" ? response : response.content
  ) as string;

  const outputTokens = encode(answer).length;
  tokenUsage.output += outputTokens;
  tokenUsage.total = tokenUsage.input + tokenUsage.output;

  return answer;
}

async function searchTrainingData(question: string) {
  const docResult = await searchDocuments(question, "training");
  if (docResult.startsWith("Nenhum")) {
    return null;
  }

  const prompt =
    `Baseado exclusivamente no texto a seguir, responda à pergunta.
` +
    `Se a resposta não estiver contida no texto, responda EXATAMENTE 'NOT_FOUND'.
` +
    `Texto: ${docResult}
` +
    `Pergunta: ${question}
` +
    `Resposta em português:`;
  const answer = await invokeModel(prompt);

  if (answer.trim() !== "NOT_FOUND") {
    console.log("[LOG] Answer found in training data.");
    return { answer, source: "Treinamento" };
  }
  return null;
}

async function searchLearnedData(question: string) {
  const docResult = await searchDocuments(question, "learned");
  if (docResult.startsWith("Nenhum")) {
    return null;
  }
  console.log("[LOG] Answer found in learned data. Verifying with web search...");
  return { answer: docResult, source: "Learned" };
}

async function searchWeb(query: string) {
  const searchUrl = `https://duckduckgo.com/html/?q=${encodeURIComponent(
    query
  )}`;
  console.log(`[LOG] Searching for "${query}" on DuckDuckGo...`);
  const searchPageContent = await runBash(
    `curl -sL -A 'Mozilla/5.0' "${searchUrl}"`
  );

  const urlRegex = /<a[^>]+class="result__a"[^>]+href="([^"].*?)"/g;
  const matches = [...searchPageContent.matchAll(urlRegex)];
  const urls = matches
    .map((match) => {
      try {
        const url = new URL(match[1], "https://duckduckgo.com");
        return url.searchParams.get("uddg") || url.href;
      } catch (e) {
        return null;
      }
    })
    .filter(Boolean)
    .slice(0, 3);

  if (urls.length === 0) {
    return {
      answer: "Não foram encontrados resultados de pesquisa para a sua pergunta.",
      source: "Web",
    };
  }

  console.log(`[LOG] Found ${urls.length} URLs to process.`);
  let allTextContent = "";
  for (const url of urls) {
    try {
      console.log(`[LOG] Fetching content from ${url}`);
      const pageContent = await runBash(
        `curl -sL -A 'Mozilla/5.0' "${url}" | html2text`
      );
      allTextContent += `

--- Content from ${url} ---
${pageContent}`;
    } catch (error) {
      console.error(`[ERROR] Failed to fetch ${url}:`, error);
    }
  }

  if (allTextContent.trim() === "") {
    return {
      answer: "Não foi possível extrair conteúdo das páginas encontradas.",
      source: "Web",
    };
  }

  const summaryPrompt =
    `Com base nos textos extraídos da web a seguir, forneça uma resposta concisa para a pergunta.

` +
    `Textos Extraídos:
${allTextContent}

` +
    `Pergunta: ${query}

` +
    `Resposta em português:`;

  console.log("[LOG] Summarizing content with LLM...");
  const finalAnswer = await invokeModel(summaryPrompt);

  const filename = query.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase() + ".txt";
  const filepath = path.join(
    process.cwd(),
    "data",
    "documents",
    "learned",
    filename
  );
  try {
    fs.writeFileSync(filepath, finalAnswer);
    console.log(`[LOG] Conhecimento salvo em: ${filepath}`);
  } catch (error) {
    console.error(`[ERROR] Falha ao salvar o arquivo de resumo:`, error);
  }

  return { answer: finalAnswer, source: "Web" };
}

async function updateCache(question: string, answer: string) {
  const cache = JSON.parse(fs.readFileSync(cachePath, "utf-8"));
  cache.push({ question, answer });
  fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2));
}

export async function run(question: string) {
  // 0. Check cache
  const cache = JSON.parse(fs.readFileSync(cachePath, "utf-8"));
  if (cache.length > 0) {
    const cachedDocs = cache.map(
      (entry: any) =>
        new Document({ pageContent: entry.question, metadata: { answer: entry.answer } })
    );
    const vectorStore = await MemoryVectorStore.fromDocuments(
      cachedDocs,
      embeddings
    );
    const searchResult = await vectorStore.similaritySearchWithScore(
      question,
      1
    );
    if (searchResult.length > 0 && searchResult[0][1] > 0.9) {
      console.log("[LOG] Answer found in cache.");
      return {
        answer: searchResult[0][0].metadata.answer,
        source: "Cache",
        tokenUsage,
      };
    }
  }

  // 1. Search in training data
  const trainingResult = await searchTrainingData(question);
  if (trainingResult) {
    await updateCache(question, trainingResult.answer);
    return { ...trainingResult, tokenUsage };
  }

  // 2. Search in learned data
  const learnedResult = await searchLearnedData(question);
  const webResult = await searchWeb(question);

  if (learnedResult) {
    // Compare learned and web results
    const comparisonPrompt =
      `Você é um assistente de verificação de fatos. Compare a informação da "Base de Dados Local" com a da "Busca na Web" para a pergunta: "${question}".

` +
      `Base de Dados Local: "${learnedResult.answer}"
` +
      `Busca na Web: "${webResult.answer}"

` +
      `Analise as duas fontes. Se elas forem consistentes ou a busca na web não for conclusiva, responda com a informação da Base de Dados Local. Se a Busca na Web tiver uma informação claramente mais atualizada ou correta, responda com a informação da Busca na Web. Seja conciso e direto na sua resposta final em português.`;

    const finalAnswer = await invokeModel(comparisonPrompt);

    // Silently update learned data if web result is better
    if (finalAnswer !== learnedResult.answer) {
      console.log("[LOG] Web search provided new information. Updating learned data.");
      const filename = question.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase() + ".txt";
      const filepath = path.join(
        process.cwd(),
        "data",
        "documents",
        "learned",
        filename
      );
      try {
        fs.writeFileSync(filepath, webResult.answer);
        console.log(`[LOG] Conhecimento atualizado em: ${filepath}`);
      } catch (error) {
        console.error(
          `[ERROR] Falha ao atualizar o arquivo de conhecimento:`, error
        );
      }
    }
    await updateCache(question, finalAnswer);
    return { answer: finalAnswer, source: "Comparado", tokenUsage };
  }

  // 3. If nothing found, return web result
  console.log("[LOG] No local answer found. Returning web results.");
  await updateCache(question, webResult.answer);
  return { ...webResult, tokenUsage };
}
