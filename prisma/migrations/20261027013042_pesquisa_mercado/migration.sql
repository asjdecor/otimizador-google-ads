-- CreateTable
CREATE TABLE "PesquisaMercado" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "customerId" TEXT NOT NULL,
    "etapa" TEXT NOT NULL,
    "pontoDePartidaJson" TEXT NOT NULL,
    "concorrentesJson" TEXT,
    "sitesJson" TEXT,
    "volumesJson" TEXT,
    "recomendacaoJson" TEXT,
    "erroEtapa" TEXT,
    "emExecucao" BOOLEAN NOT NULL DEFAULT false,
    "custoDolares" REAL NOT NULL DEFAULT 0,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "PesquisaMercado_customerId_idx" ON "PesquisaMercado"("customerId");
