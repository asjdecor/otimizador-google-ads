-- CreateTable
CREATE TABLE "PesquisaMercado" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "etapa" TEXT NOT NULL,
    "pontoDePartidaJson" TEXT NOT NULL,
    "concorrentesJson" TEXT,
    "sitesJson" TEXT,
    "volumesJson" TEXT,
    "recomendacaoJson" TEXT,
    "erroEtapa" TEXT,
    "emExecucao" BOOLEAN NOT NULL DEFAULT false,
    "custoDolares" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PesquisaMercado_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PesquisaMercado_customerId_idx" ON "PesquisaMercado"("customerId");

