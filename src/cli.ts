import inquirer from "inquirer";
import { run } from "./graph";

async function main() {
  while (true) {
    const { question } = await inquirer.prompt<{ question: string}>([
      { type: "input", name: "question", message: "Pergunta:" },
    ]);
    const answer = await run(question);
    console.log(answer);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
