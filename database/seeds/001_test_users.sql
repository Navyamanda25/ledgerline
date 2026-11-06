-- ============================================
-- LEDGERLINE - TEST USERS
-- Development seed data only
-- ============================================

INSERT INTO users (full_name, email, password_hash, role)
VALUES
(
    'LedgerLine Admin',
    'admin@ledgerline.local',
    '$2b$12$JytzHwu5uOuL1E8jdvnGtuEul05Bzo15cer6YtC1Ib18iRFyT7bb2',
    'admin'
),
(
    'Test Account Holder',
    'holder@ledgerline.local',
    '$2b$12$u/m9OBnVf5plmNywUVAQCexTive5HDuLzrXPqn8gDL5iyqbCvlL7e',
    'account_holder'
),
(
    'Test Auditor',
    'auditor@ledgerline.local',
    '$2b$12$2shvtjD4AwCj1xImnltAR.HlH0Z/2SdVQPENaeYJIqeKPoqEMuMYK',
    'auditor'
)
ON CONFLICT (email) DO NOTHING;