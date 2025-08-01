import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

export function ask(question) {
  return new Promise(resolve => rl.question(question, ans => resolve(ans.trim())));
}

export function closeInput() {
  rl.close();
}
