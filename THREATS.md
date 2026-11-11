# THREATS.md

# LedgerLine – Security Threat Model

## 1. Introduction

LedgerLine handles customer accounts and financial transactions. Security is important to prevent unauthorised access, protect financial information and maintain transaction integrity.

This document identifies potential threats, the protections implemented and areas requiring further improvement.

## 2. Identified Threats and Mitigations

| No. | Security Threat | Mitigation |
|---|---|---|
| 1 | Unauthorised login | JWT authentication and password hashing. |
| 2 | Accessing another customer's account | Backend account permission checks. |
| 3 | Auditor performing transactions | Auditor has read-only access. |
| 4 | Unauthorised administrative operations | Backend role-based authorisation. |
| 5 | Duplicate transaction requests | Idempotency key handling. |
| 6 | Negative or zero transaction amounts | Backend amount validation. |
| 7 | Extremely large transaction amounts | 12-digit paise limit. |
| 8 | Concurrent withdrawals | Database row locking and transaction handling. |
| 9 | Partial transaction failure | Database rollback mechanism. |
| 10 | SQL injection | Parameterised database queries. |
| 11 | Exposure of internal errors | Generic API error responses. |
| 12 | Unauthorised audit trail access | Role-based access restrictions. |
| 13 | Modification of audit records | Database-level protections for audit records. |
| 14 | Password guessing | Login rate limiting and password hashing. |
| 15 | Stolen authentication token | Token expiry and authentication checks. |
| 16 | Incorrect account balance | Ledger and account balance consistency checks. |

## 3. Important Security Areas

### 3.1 Authentication

Users must authenticate before accessing protected resources.

JWT authentication is used to identify authenticated users and protect application endpoints.

### 3.2 Role-Based Authorisation

The application supports different user roles.

- Admin: Access to authorised administrative operations.
- Account Holder: Access to permitted customer accounts and transactions.
- Auditor: Read-only access to customer accounts and audit information.

The backend must verify permissions for every protected operation.

### 3.3 Transaction Integrity

Financial transactions must maintain consistent account balances.

Database transactions and account locking are used to protect against concurrent transaction problems.

### 3.4 Duplicate Transaction Prevention

Idempotency handling is used to prevent the same transaction request from being processed multiple times.

### 3.5 Amount Validation

Transaction amounts are validated at the backend.

The application restricts transaction amounts to a maximum of 12 digits of paise.

### 3.6 Audit Trail Protection

Audit records help trace financial activities.

Unauthorised users must not be able to access or modify protected audit information.

### 3.7 Error Handling

API responses should not expose database errors, internal file paths, secrets or implementation details.

## 4. Security Testing Scenarios

The following scenarios should be tested before final evaluation.

| No. | Test Scenario | Expected Result |
|---|---|---|
| 1 | Login with incorrect credentials | Login rejected |
| 2 | Account holder accesses another customer's account | Access denied |
| 3 | Auditor views customer accounts | Read-only access allowed |
| 4 | Auditor attempts a transaction | Access denied |
| 5 | Unauthorised user accesses audit information | Access denied |
| 6 | Negative transaction amount | Request rejected |
| 7 | Zero transaction amount | Request rejected |
| 8 | Transaction exceeds amount limit | Request rejected |
| 9 | Same transaction request is submitted twice | Duplicate processing prevented |
| 10 | Two withdrawals occur simultaneously | Invalid overdraft prevented |
| 11 | Database transaction fails midway | Changes rolled back |
| 12 | User attempts to modify audit records | Modification rejected |

**Testing status:** These are required test scenarios, not a declaration that every test has passed. Record actual results after execution.

## 5. Known Risks and Limitations

The following areas require further security improvements or verification.

| No. | Risk | Improvement |
|---|---|---|
| 1 | Stolen JWT token | Stronger session management and token revocation. |
| 2 | Database credential compromise | Separate database roles with minimum privileges. |
| 3 | Database connection security | Verify SSL certificates. |
| 4 | Failed login attempts not audited | Add authentication event logging. |
| 5 | Advanced attack attempts | Perform additional security testing. |
| 6 | Data loss | Implement backup and recovery procedures. |
| 7 | Ledger and account balance mismatch | Perform automated reconciliation checks. |
| 8 | Denial-of-service attacks | Add stronger traffic monitoring and protection. |

## 6. Risk Classification

| Status | Meaning |
|---|---|
| Implemented | Protection is present in the application. |
| Requires Testing | Protection needs additional verification. |
| Accepted | Known limitation that has not yet been resolved. |

A security control should not be considered fully effective until it has been tested.

## 7. Conclusion

LedgerLine incorporates authentication, role-based authorisation, transaction validation and audit trail protections.

The threat model helps identify possible attacks and understand the security limitations of the application.

Further testing, monitoring and security improvements are necessary before using the system in a real financial environment.