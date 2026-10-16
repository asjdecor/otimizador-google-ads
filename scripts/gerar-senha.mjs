// Gera os valores de login para o .env / Vercel.
//   npm run gerar-senha -- "sua senha forte"
import { randomBytes, scrypt } from "node:crypto";

const senha = process.argv[2];
if (!senha || senha.length < 12) {
  console.error('Uso: npm run gerar-senha -- "uma senha com pelo menos 12 caracteres"');
  process.exit(1);
}

const salt = randomBytes(16);
scrypt(senha.normalize("NFKC"), salt, 32, { N: 16384, r: 8, p: 1 }, (erro, chave) => {
  if (erro) throw erro;
  console.log("Copie estas duas linhas para o .env (ou para as variáveis da Vercel):\n");
  console.log(`APP_SENHA_HASH="scrypt:${salt.toString("base64")}:${chave.toString("base64")}"`);
  console.log(`APP_SESSAO_SEGREDO="${randomBytes(32).toString("base64url")}"`);
});
