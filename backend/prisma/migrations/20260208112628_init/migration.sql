-- CreateTable
CREATE TABLE "Profile" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "terminologyText" TEXT NOT NULL DEFAULT '',
    "styleText" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "DesignJob" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "profileId" INTEGER NOT NULL,
    "suiteName" TEXT NOT NULL,
    "coverageLevel" TEXT NOT NULL,
    "elementStepsText" TEXT NOT NULL,
    "specText" TEXT NOT NULL DEFAULT '',
    "rulesSnapshotText" TEXT NOT NULL DEFAULT '',
    "llmModelName" TEXT NOT NULL DEFAULT '',
    "llmRequestJson" TEXT NOT NULL DEFAULT '',
    "llmResponseJson" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'success',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DesignJob_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "IrVersion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "designId" TEXT NOT NULL,
    "versionNo" INTEGER NOT NULL DEFAULT 1,
    "irJson" TEXT NOT NULL,
    "editedBy" TEXT NOT NULL DEFAULT 'user',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "IrVersion_designId_fkey" FOREIGN KEY ("designId") REFERENCES "DesignJob" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
