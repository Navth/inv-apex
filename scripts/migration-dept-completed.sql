-- Department / Projects: add completed flag
-- Run on existing DB to add the column. Safe to run multiple times.

ALTER TABLE dept
  ADD COLUMN IF NOT EXISTS completed BOOLEAN NOT NULL DEFAULT false;

SELECT 'Dept completed column applied.' AS message;
