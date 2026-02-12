-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Profile" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "terminologyText" TEXT NOT NULL DEFAULT '',
    "styleText" TEXT NOT NULL DEFAULT '',
    "customSystemPrompt" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Profile" ("createdAt", "id", "name", "styleText", "terminologyText", "updatedAt") SELECT "createdAt", "id", "name", "styleText", "terminologyText", "updatedAt" FROM "Profile";
DROP TABLE "Profile";
ALTER TABLE "new_Profile" RENAME TO "Profile";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
