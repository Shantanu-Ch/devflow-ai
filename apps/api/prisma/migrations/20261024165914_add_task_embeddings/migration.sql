-- CreateTable
CREATE TABLE "TaskEmbedding" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "vector" vector(768),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaskEmbedding_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TaskEmbedding_taskId_key" ON "TaskEmbedding"("taskId");

-- AddForeignKey
ALTER TABLE "TaskEmbedding" ADD CONSTRAINT "TaskEmbedding_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
