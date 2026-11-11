# PROMPTS.md

## AI Usage and Development Log

I used ChatGPT as an AI development assistant throughout the LedgerLine project for implementation guidance, debugging, security reviews, testing ideas and documentation.

I reviewed the suggestions, identified issues, made corrections and committed the development work to GitHub.

### 1. November 6, 2026 – Project Setup and Login Interface

**Prompt:** Help me create a professional fintech application with a clean login interface and organised project structure.

**AI Output:** Suggested the initial project structure and React-based login interface.

**Issue Identified:** The login interface needed to work with the actual backend authentication system.

**My Action:** Developed the login interface and connected it with backend authentication.

**Commit:** [Project initialization](https://github.com/Navyamanda25/ledgerline/commit/06adf0a80de1a29633123c3059e32739eac729bd)

**Commit:** [Implement login interface](https://github.com/Navyamanda25/ledgerline/commit/81a1aa18ec36a863b5e2c6f404ee55cb20a4960c)

### 2. November 6, 2026 – Backend Transaction Engine

**Prompt:** Help me implement a backend transaction system with database integration and account balance management.

**AI Output:** Provided guidance for transaction processing and database operations.

**Issue Identified:** Financial transactions require consistent balance updates and protection against partial failures.

**My Action:** Implemented the backend transaction engine and database integration.

**Commit:** [Implement transaction engine and database](https://github.com/Navyamanda25/ledgerline/commit/b56c080c30b5afd144f270dadcbdae2e23f4b905)

### 3. November 6, 2026 – Account Statements and Authorisation

**Prompt:** Help me implement customer account statements and role-based access control.

**AI Output:** Suggested account statement APIs and role-based permission checks.

**Issue Identified:** Frontend restrictions alone cannot prevent unauthorised access. Permissions must also be checked by the backend.

**My Action:** Connected account statements to the backend and worked on access-control tests.

**Commit:** [Add account statements and access-control tests](https://github.com/Navyamanda25/ledgerline/commit/01879c431760c58e0b6e6691b83540f2bdc30aa4)

### 4. November 7, 2026 – Audit Trail and Backend Security

**Prompt:** Help me improve the audit trail, backend security and environment configuration.

**AI Output:** Provided suggestions for audit logging and backend hardening.

**Issue Identified:** Audit information must be protected against unauthorised access and modification. Sensitive environment values must also be kept outside source code.

**My Action:** Worked on the audit trail, backend security improvements and environment configuration.

**Commit:** [Audit trail and backend hardening](https://github.com/Navyamanda25/ledgerline/commit/434a1e26047213945b18a479efe85a3561da21e4)

### 5. November 11, 2026 – Auditor Read-Only Access (Authorisation)

**Prompt:** Allow auditors to view all customer accounts while preventing them from performing financial transactions.

**AI Output:** Suggested role-based access restrictions for auditor operations.

**Issue Identified:** An auditor requires read access to all customer accounts, but must not receive transaction permissions.

**My Action:** Updated the account access-control implementation to support read-only auditor access.

**Commit:** [Allow auditor read-only access](https://github.com/Navyamanda25/ledgerline/commit/a3cdb858a7faeb2390ae538352465473c2ef842d)

### 6. November 11, 2026 – Transaction Amount Validation (Security)

**Prompt:** Review transaction amount validation and prevent unusually large transaction amounts.

**AI Output:** Suggested backend validation and safer error handling.

**Issue Identified:** Amount limits must be enforced on the backend, not just in the frontend. Internal implementation errors should not be exposed to users.

**My Action:** Added a 12-digit paise limit, route-level validation and safer internal error handling.

**Commit:** [Cap transaction amount](https://github.com/Navyamanda25/ledgerline/commit/47757c8d6b206db64b1af927c1e1998134ef6805)

**Commit:** [Validate amount and hide internal errors](https://github.com/Navyamanda25/ledgerline/commit/da0154f2529b640406ed8328ec73cfb6aa42be94)

### 7. November 8, 2026 – User Interface Improvements

**Prompt:** Improve the LedgerLine interface with a professional fintech appearance and premium gold styling.

**AI Output:** Suggested UI styling improvements and colour combinations.

**Issue Identified:** Styling needed to remain consistent with the existing application and Tailwind CSS setup.

**My Action:** Refined the interface and updated the visual styling.

**Commit:** [Update LedgerLine UI](https://github.com/Navyamanda25/ledgerline/commit/7e9b7b4703f8833a9fb0ff836672c7c082169556)

---

## Conclusion

AI tools supported my development process, but I reviewed the suggestions, identified issues and made implementation decisions throughout the project.

I maintained GitHub commits during development to document the progress and changes made to LedgerLine.