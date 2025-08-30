import path from "path";
import { readdir, readFile, writeFile } from "fs/promises";
import { Document } from "@langchain/core/documents";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { OpenAIEmbeddings } from "@langchain/openai";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import pdfParser from "pdf-parse";
import { parseEpub as epubParser } from "@gxl/epub-parser";
import fs from "fs";

async function extractTextFromFiles() {
  const trainingDir = path.join(process.cwd(), "data", "documents", "training");

  try {
    const files = await readdir(trainingDir);

    for (const file of files) {
      const filePath = path.join(trainingDir, file);

      if (file.endsWith(".pdf")) {
        const txtPath = filePath.replace(/\.pdf$/, ".txt");
        if (!fs.existsSync(txtPath)) {
          console.log(`[LOG] Found new PDF: ${file}. Extracting text...`);
          const dataBuffer = fs.readFileSync(filePath);
          const data = await pdfParser(dataBuffer);
          await writeFile(txtPath, data.text, "utf-8");
          console.log(`[LOG] Text extracted and saved to ${txtPath}`);
        }
      } else if (file.endsWith(".epub")) {
        const txtPath = filePath.replace(/\.epub$/, ".txt");
        if (!fs.existsSync(txtPath)) {
          console.log(`[LOG] Found new EPUB: ${file}. Extracting text...`);
          const data = await epubParser(filePath, { type: 'path' });
          const sections = data.sections || [];
          const textPromises = sections.map((s: any) => s.toMarkdown());
          const textArray = await Promise.all(textPromises);
          const text = textArray.join("\n");
          await writeFile(txtPath, text, "utf-8");
          console.log(`[LOG] Text extracted and saved to ${txtPath}`);
        }
      }
    }
  } catch (error: any) {
    if (error.code !== 'ENOENT') {
      console.error("[ERROR] Failed to process files:", error);
    }
  }
}

/**
 * Procura conteúdo relevante nos arquivos `.txt` presentes em `data/documents`.
 * O retorno inclui trechos do(s) arquivo(s) mais semelhantes à consulta.
 */
export async function searchDocuments(
  query: string,
  subfolder?: "training" | "learned"
): Promise<string> {
  if (subfolder === 'training') {
    await extractTextFromFiles();
  }

  let docsDir = path.join(process.cwd(), "data", "documents");
  if (subfolder) {
    docsDir = path.join(docsDir, subfolder);
  }

  let files: string[];
  try {
    files = await readdir(docsDir);
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return "Nenhum documento encontrado.";
    }
    throw error;
  }

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