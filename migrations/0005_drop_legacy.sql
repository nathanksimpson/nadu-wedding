-- Removes the pre-plans tables (docs, history) that 0002 copied into plan 1. They hold a second copy of
-- personal data. Run only after a backup and after checking plan 1 on that database (README → Release).
DROP TABLE IF EXISTS docs;
DROP TABLE IF EXISTS history;
