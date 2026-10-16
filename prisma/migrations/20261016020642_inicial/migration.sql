-- CreateTable
CREATE TABLE "ConexaoGoogle" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "refreshTokenCriptografado" TEXT NOT NULL,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "ContaAds" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "customerId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "moeda" TEXT NOT NULL,
    "ehGerente" BOOLEAN NOT NULL DEFAULT false,
    "selecionada" BOOLEAN NOT NULL DEFAULT false,
    "conexaoId" TEXT NOT NULL,
    CONSTRAINT "ContaAds_conexaoId_fkey" FOREIGN KEY ("conexaoId") REFERENCES "ConexaoGoogle" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CacheConsulta" (
    "chave" TEXT NOT NULL PRIMARY KEY,
    "json" TEXT NOT NULL,
    "expiraEm" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Sugestao" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "customerId" TEXT NOT NULL,
    "anuncioId" TEXT,
    "tipo" TEXT NOT NULL,
    "contextoUsuario" TEXT,
    "resultadoJson" TEXT NOT NULL,
    "modelo" TEXT NOT NULL,
    "tokensEntrada" INTEGER NOT NULL,
    "tokensSaida" INTEGER NOT NULL,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Configuracao" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "limiteDesperdicio" INTEGER NOT NULL DEFAULT 50,
    "periodoPadrao" INTEGER NOT NULL DEFAULT 30
);

-- CreateIndex
CREATE UNIQUE INDEX "ConexaoGoogle_email_key" ON "ConexaoGoogle"("email");

-- CreateIndex
CREATE UNIQUE INDEX "ContaAds_customerId_key" ON "ContaAds"("customerId");

-- CreateIndex
CREATE INDEX "Sugestao_customerId_anuncioId_idx" ON "Sugestao"("customerId", "anuncioId");
