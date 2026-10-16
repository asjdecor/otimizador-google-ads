-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "ConexaoGoogle" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "refreshTokenCriptografado" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConexaoGoogle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContaAds" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "moeda" TEXT NOT NULL,
    "ehGerente" BOOLEAN NOT NULL DEFAULT false,
    "selecionada" BOOLEAN NOT NULL DEFAULT false,
    "loginCustomerId" TEXT,
    "conexaoId" TEXT NOT NULL,

    CONSTRAINT "ContaAds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CacheConsulta" (
    "chave" TEXT NOT NULL,
    "json" TEXT NOT NULL,
    "expiraEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CacheConsulta_pkey" PRIMARY KEY ("chave")
);

-- CreateTable
CREATE TABLE "Sugestao" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "anuncioId" TEXT,
    "tipo" TEXT NOT NULL,
    "contextoUsuario" TEXT,
    "resultadoJson" TEXT NOT NULL,
    "modelo" TEXT NOT NULL,
    "tokensEntrada" INTEGER NOT NULL,
    "tokensSaida" INTEGER NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Sugestao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Configuracao" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "limiteDesperdicio" INTEGER NOT NULL DEFAULT 50,
    "periodoPadrao" INTEGER NOT NULL DEFAULT 30,

    CONSTRAINT "Configuracao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ConexaoGoogle_email_key" ON "ConexaoGoogle"("email");

-- CreateIndex
CREATE UNIQUE INDEX "ContaAds_customerId_key" ON "ContaAds"("customerId");

-- CreateIndex
CREATE INDEX "Sugestao_customerId_anuncioId_idx" ON "Sugestao"("customerId", "anuncioId");

-- AddForeignKey
ALTER TABLE "ContaAds" ADD CONSTRAINT "ContaAds_conexaoId_fkey" FOREIGN KEY ("conexaoId") REFERENCES "ConexaoGoogle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

