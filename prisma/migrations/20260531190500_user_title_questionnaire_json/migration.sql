-- Add columns for Assurance titre digital dossier continuation
ALTER TABLE "User" ADD COLUMN "titleInitialQuestionnaireJson" TEXT;
ALTER TABLE "User" ADD COLUMN "titleEtudeQuestionnaireJson" TEXT;
