# LedgerLine – Secure FinTech Transaction System

LedgerLine is a web-based financial transaction management application designed to manage customer accounts, process transactions and maintain an audit trail.

The application focuses on secure authentication, role-based access control, transaction validation and financial data integrity.

## Project Information

- **Project Name:** LedgerLine
- **Category:** FinTech / Web Application
- **Developer:** Navya Manda
- **GitHub:** [Navyamanda25/ledgerline](https://github.com/Navyamanda25/ledgerline)

## Technology Stack

| Technology | Purpose |
|---|---|
| React | Frontend development |
| Vite | Frontend build tool |
| Tailwind CSS | User interface styling |
| Node.js | Backend runtime |
| Express.js | Backend API |
| PostgreSQL | Database |
| JWT | Authentication |
| Git and GitHub | Version control |

## Main Features

1. User login and authentication.
2. Role-based access control.
3. Customer account management.
4. Dashboard with account balances.
5. Account statements and transaction history.
6. Backend transaction processing.
7. Transaction amount validation.
8. Audit trail functionality.
9. Read-only auditor access.
10. Backend error handling and security improvements.

## User Roles and Permissions

| Role | Permissions |
|---|---|
| Admin | View customer accounts, access audit information and perform authorised administrative operations. |
| Account Holder | View permitted accounts and perform authorised transactions. |
| Auditor | View all customer accounts and audit information without modifying financial data. |

Permissions are enforced through backend authorisation rather than relying only on frontend visibility.

## Security Features

- JWT-based authentication.
- Role-based access control.
- Account-level permission checks.
- Transaction amount validation.
- Idempotency handling to prevent duplicate processing.
- Database transaction handling.
- Audit trail protection.
- Safer API error responses.

Refer to [THREATS.md](THREATS.md) for the security threat model and known limitations.

## Project Structure

```text
ledgerline/
│
├── frontend/
│   ├── src/
│   └── package.json
│
├── backend/
│   ├── src/
│   ├── tests/
│   └── package.json
│
├── database/
│
├── docs/
│
├── README.md
├── PROMPTS.md
└── THREATS.md
```

## Local Setup

### Prerequisites

- Node.js
- npm
- PostgreSQL
- Git

### 1. Clone the repository

```bash
git clone https://github.com/Navyamanda25/ledgerline.git
cd ledgerline
```

### 2. Start the backend

```bash
cd backend
npm install
```

Configure the required environment variables using `.env.example`.

Start the backend:

```bash
npm run dev
```

### 3. Start the frontend

Open another terminal:

```bash
cd frontend
npm install
```

Configure the frontend environment variables and start:

```bash
npm run dev
```

Configure the PostgreSQL database using the schema and seed files provided in the database directory.

## Testing

Run the backend tests:

```bash
cd backend
npm test
```

**Important:** Run database-modifying tests only against a dedicated local test database.

## Deployment

- **GitHub Repository:** https://github.com/Navyamanda25/ledgerline
- **Live Application:** To be added after deployment.
- **Backend API:** To be added after deployment.

## AI Assistance

ChatGPT was used for development guidance, debugging, security review and documentation support.

The prompts, identified issues and development decisions are documented in [PROMPTS.md](PROMPTS.md).

## Limitations

LedgerLine is an academic demonstration project and is not intended for processing real financial transactions.

Advanced banking features and certain production-level security controls are outside the current implementation scope.

Refer to [THREATS.md](THREATS.md) for identified risks and limitations.