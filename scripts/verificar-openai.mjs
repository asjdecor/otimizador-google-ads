// Verifica chave e acesso ao modelo sem gerar texto (não consome tokens de geração).
//   npm run verificar-openai
const chave = process.env.OPENAI_API_KEY?.trim();
const modelo = process.env.OPENAI_MODEL?.trim() || "gpt-4.1-mini";

if (!chave) {
  console.error("✕ OPENAI_API_KEY está vazia no .env. Crie uma chave em platform.openai.com/api-keys e salve no .env.");
  process.exit(1);
}

try {
  const resposta = await fetch(`https://api.openai.com/v1/models/${encodeURIComponent(modelo)}`, {
    headers: { Authorization: `Bearer ${chave}` },
    signal: AbortSignal.timeout(15_000),
  });

  if (resposta.status === 401 || resposta.status === 403) {
    console.error("✕ Chave da OpenAI inválida ou sem permissão. Confira OPENAI_API_KEY e o projeto associado.");
    process.exit(1);
  }
  if (resposta.status === 404) {
    console.error(`✕ Modelo "${modelo}" não está disponível para esta chave. Confira OPENAI_MODEL e as permissões do projeto.`);
    process.exit(1);
  }
  if (!resposta.ok) {
    console.error(`✕ A OpenAI respondeu com status HTTP ${resposta.status}. Confira o projeto e tente novamente.`);
    process.exit(1);
  }

  const modeloDisponivel = await resposta.json();
  console.log(`✓ Chave da OpenAI OK. Modelo disponível: ${modeloDisponivel.id ?? modelo}.`);
  console.log("  A análise premium está pronta para usar OpenAI.");
} catch (erro) {
  if (erro instanceof TypeError || erro instanceof DOMException) {
    console.error("✕ Não foi possível conectar à OpenAI. Verifique a rede e tente novamente.");
  } else {
    console.error("✕ Falha ao verificar a chave da OpenAI.");
  }
  process.exit(1);
}
