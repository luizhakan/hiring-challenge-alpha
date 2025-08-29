import path from "path";
import { readdir, readFile } from "fs/promises";
import { Document } from "@langchain/core/documents";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { OpenAIEmbeddings } from "@langchain/openai";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";

/**
 * Procura conteúdo relevante nos arquivos `.txt` presentes em `data/documents`.
 * O retorno inclui trechos do(s) arquivo(s) mais semelhantes à consulta.
 */
export async function searchDocuments(query: string): Promise<string> {
  const docsDir = path.join(process.cwd(), "data", "documents");
  const files = await readdir(docsDir);
  const documents: Document[] = [];

  for (const file of files) {
    if (!file.endsWith(".txt")) continue;
    const content = await readFile(path.join(docsDir, file), "utf-8");
    documents.push(new Document({ pageContent: content, metadata: { source: file } }));
  }

  if (documents.length === 0) {
    return "Nenhum documento encontrado.";
  }

  const splitter = new RecursiveCharacterTextSplitter({ chunkSize: 500, chunkOverlap: 50 });
  const splitDocs = await splitter.splitDocuments(documents);

  const provider = process.env.LLM_PROVIDER ?? "openai";
  const embeddings =
    provider === "gemini"
      ? new GoogleGenerativeAIEmbeddings({ model: process.env.GOOGLE_EMBED_MODEL || "text-embedding-004" })
      : new OpenAIEmbeddings();

  const store = await MemoryVectorStore.fromDocuments(splitDocs, embeddings);
  const results = await store.similaritySearch(query, 1);
  if (results.length === 0) {
    return "Nenhum documento relevante encontrado.";
  }
  return results.map((r) => `${r.metadata.source}: ${r.pageContent}`).join("\n");
}

// Export antigo mantido para compatibilidade, caso necessário.
export async function loadDocument(filePath: string): Promise<string> {
  return readFile(filePath, "utf-8");
}
