import { exec } from "child_process";

export async function runBash(command: string): Promise<string> {
  return new Promise((resolve, reject) => {
    exec(command, (err, stdout, stderr) => {
      if (err) {
        reject(stderr || err.message);
        return;
      }
      resolve(stdout);
    });
  });
}
