// Confere se a ANTHROPIC_API_KEY do .env funciona e se o modelo está disponível — sem gerar texto (não gasta créditos).
//   npm run verificar-ia
import Anthropic from "@anthropic-ai/sdk";

const chave = process.env.ANTHROPIC_API_KEY?.trim();
const modelo = process.env.CLAUDE_MODEL?.trim() || "claude-opus-5-5";

if (!chave) {
  console.error("✕ ANTHROPIC_API_KEY está vazia no .env. Crie em console.anthropic.com → API Keys e cole no arquivo .env.");
  process.exit(1);
}

try {
  const info = await new Anthropic({ apiKey: chave }).models.retrieve(modelo);
  console.log(`✓ Chave da Anthropic OK. Modelo disponível: ${info.display_name ?? info.id} (${info.id}).`);
  console.log("  A IA do app está pronta. Para ver com a loja de exemplo: npm run demo:ia-real");
} catch (erro) {
  if (erro instanceof Anthropic.AuthenticationError) console.error("✕ Chave inválida. Confira se copiou a chave inteira (começa com sk-ant-).");
  else if (erro instanceof Anthropic.PermissionDeniedError) console.error("✕ A chave não tem permissão. Confira a organização/workspace no console da Anthropic.");
  else if (erro instanceof Anthropic.NotFoundError) console.error(`✕ O modelo "${modelo}" não está disponível para esta chave. Confira CLAUDE_MODEL no .env.`);
  else if (erro instanceof Anthropic.APIConnectionError) console.error("✕ Sem conexão com a Anthropic. Confira a internet.");
  else console.error("✕ Erro ao falar com a Anthropic:", erro instanceof Error ? erro.message : erro);
  process.exit(1);
}
