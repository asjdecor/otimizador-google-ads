import { describe, expect, it } from "vitest";
import { listarContasAcessiveis } from "@/api/integracoes/google-ads/contas";
import { criarApiGoogleAdsFalsa } from "../../apoio/google-falso";

describe("listarContasAcessiveis", () => {
  it("conta acessada direto usa ela mesma como login", async () => {
    const { api, consultas } = criarApiGoogleAdsFalsa({ "111": [{ id: 111, nome: "Loja" }] });
    const contas = await listarContasAcessiveis(api, "rt");
    expect(contas).toEqual([
      { customerId: "111", nome: "Loja", moeda: "BRL", ehGerente: false, loginCustomerId: "111" },
    ]);
    expect(consultas[0]).toEqual({ customerId: "111", loginCustomerId: "111", refreshToken: "rt" });
  });

  it("filhas de uma MCC usam a MCC como login", async () => {
    const { api } = criarApiGoogleAdsFalsa({
      "900": [
        { id: 900, nome: "Agência", gerente: true },
        { id: 201, nome: "Cliente B" },
        { id: 202, nome: "Cliente A" },
      ],
    });
    const contas = await listarContasAcessiveis(api, "rt");
    expect(contas.map((c) => [c.customerId, c.ehGerente, c.loginCustomerId])).toEqual([
      ["900", true, "900"],
      ["202", false, "900"],
      ["201", false, "900"],
    ]);
  });

  it("ordena por nome", async () => {
    const { api } = criarApiGoogleAdsFalsa({ "900": [{ id: 900, nome: "Zeta", gerente: true }, { id: 1, nome: "Alfa" }] });
    expect((await listarContasAcessiveis(api, "rt")).map((c) => c.nome)).toEqual(["Alfa", "Zeta"]);
  });

  it("conta que aparece direto E dentro da MCC não duplica e prefere o acesso direto", async () => {
    const { api } = criarApiGoogleAdsFalsa({
      "900": [{ id: 900, nome: "Agência", gerente: true }, { id: 111, nome: "Loja" }],
      "111": [{ id: 111, nome: "Loja" }],
    });
    const contas = await listarContasAcessiveis(api, "rt");
    expect(contas.filter((c) => c.customerId === "111")).toEqual([
      expect.objectContaining({ loginCustomerId: "111" }),
    ]);
  });

  it("com MCC preferida, conta que aparece direto E dentro dela usa a MCC como login", async () => {
    const { api } = criarApiGoogleAdsFalsa({
      "111": [{ id: 111, nome: "Loja" }],
      "900": [{ id: 900, nome: "Agência", gerente: true }, { id: 111, nome: "Loja" }],
    });
    const contas = await listarContasAcessiveis(api, "rt", "900");
    expect(contas.map((c) => [c.customerId, c.loginCustomerId])).toEqual([
      ["900", "900"],
      ["111", "900"],
    ]);
  });

  it("MCC preferida que não está entre as raízes não muda nada", async () => {
    const { api } = criarApiGoogleAdsFalsa({ "111": [{ id: 111, nome: "Loja" }] });
    expect((await listarContasAcessiveis(api, "rt", "900"))[0]?.loginCustomerId).toBe("111");
  });

  it("usa um nome padrão quando a conta não tem nome", async () => {
    const { api } = criarApiGoogleAdsFalsa({ "111": [{ id: 111, nome: "  " }] });
    expect((await listarContasAcessiveis(api, "rt"))[0]?.nome).toBe("Conta 111");
  });

  it("ignora a raiz que falha se outra funcionar", async () => {
    const { api } = criarApiGoogleAdsFalsa({ "111": new Error("CUSTOMER_NOT_ENABLED"), "222": [{ id: 222, nome: "Ok" }] });
    expect((await listarContasAcessiveis(api, "rt")).map((c) => c.customerId)).toEqual(["222"]);
  });

  it("lança o erro se todas as raízes falharem", async () => {
    const { api } = criarApiGoogleAdsFalsa({ "111": new Error("DEVELOPER_TOKEN_NOT_APPROVED") });
    await expect(listarContasAcessiveis(api, "rt")).rejects.toThrow("DEVELOPER_TOKEN_NOT_APPROVED");
  });

  it("devolve lista vazia quando o login não tem contas", async () => {
    const { api } = criarApiGoogleAdsFalsa({});
    expect(await listarContasAcessiveis(api, "rt")).toEqual([]);
  });

  it("ignora linhas em formato inesperado", async () => {
    const api = {
      listarIdsAcessiveis: async () => ["111"],
      gerarIdeiasDePalavras: async () => ({}),
      consultar: async () => [{ outra_coisa: 1 }, { customer_client: { id: 111, descriptive_name: "Loja" } }],
    };
    const contas = await listarContasAcessiveis(api, "rt");
    expect(contas).toEqual([{ customerId: "111", nome: "Loja", moeda: "", ehGerente: false, loginCustomerId: "111" }]);
  });
});
