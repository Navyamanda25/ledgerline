# LedgerLine – Threat Model

## 1. Purpose

This document identifies security and financial-integrity threats in LedgerLine and records the mitigations and verification tests.

## 2. Threats and Planned Mitigations

| Threat | Planned Mitigation | Verification |
|---|---|---|
| Unauthorized account access | Server-side account ownership and permission checks | Cross-user access tests |
| Auditor performing money operations | Read-only auditor permissions | Role restriction tests |
| Negative account balance | Atomic balance checks and database transactions | Concurrent withdrawal tests |
| Duplicate transfer requests | Idempotency keys and unique constraints | Retry tests |
| Concurrent withdrawals | PostgreSQL transactions and row locking | Simultaneous request tests |
| Ledger modification | Append-only ledger design and restricted database permissions | Ledger tampering tests |
| Incorrect money calculations | Store amounts as integer paise | Money conservation tests |
| Failed financial operation | Transaction rollback and refusal audit records | Failure-path tests |

## 3. Authorization Model

The application will have three roles:

- Administrator
- Account Holder
- Auditor (read-only)

Exact permissions will be documented and enforced by the backend.

## 4. Accepted Risks

Risks that cannot be fully eliminated will be documented here with their impact and justification.

## 5. Security Test Results

Actual automated test results, including failures and fixes, will be recorded here as implementation progresses.

## 6. Limitations

Features that are incomplete or not implemented will be explicitly documented before submission.