# Restaurant POS & Order Management System

A full-stack restaurant POS assignment built with Next.js/React (TypeScript), Express, MongoDB/Mongoose, and cookie-based JWT authentication. The project supports Admin and Staff roles, menu administration, order creation, server-calculated bills, workflow status updates, payment recording, and an Admin daily-sales report.

> **Security note:** `backend/.env.example` contains placeholders only. Keep real database URIs, passwords, JWT secrets, and deployment secrets in ignored `.env` files or your hosting provider's secret settings. Never commit them.

## Features

- **Authentication:** Admin/Staff login using an HttpOnly JWT cookie; `/api/auth/me` verifies session state and `/api/auth/logout` clears it.
- **Menu:** Create, edit, search/filter by category/name/description, and activate/deactivate items. Only Admin can modify items. Unavailable items cannot be ordered.
- **Orders:** Dine-in/takeaway, multiple menu items, quantity controls, unique human-readable order number, and server-side totals. Menu prices and discounts are validated by the API.
- **Billing:** Configurable tax and discount; subtotal, discount, tax, and total are calculated by the backend. The frontend estimate is only a preview.
- **Workflow:** Pending → Preparing → Ready → Completed, with cancellation before completion. The backend rejects invalid transitions.
- **Payments:** Authenticated Admin or Staff users can record Cash or UPI payment (no gateway integration).
- **Dashboard and reports:** Current metrics, recent orders, and an Admin-only daily sales report with paid sales and method breakdown.
- **Invoice data:** Authenticated invoice-data endpoint at `/api/orders/:id/invoice`.
- **Tests and API docs:** Unit tests for billing/status transitions and OpenAPI documentation in `docs/openapi.yaml`.

## Prerequisites

- Node.js 20+ (Node 22 recommended) and npm.
- A MongoDB Atlas cluster or local MongoDB instance.
- A database user with least-privilege access to the project database.

## Local setup (Windows PowerShell)

### 1. Configure the backend

Open one terminal:

```powershell
cd C:\Users\HP\Desktop\Restaurant-Pos-Order-Management\backend
Copy-Item .env.example .env
notepad .env
```

Replace all placeholder values in `backend/.env`:

- `MONGODB_URI`: your database connection string (do not include it in GitHub or chat).
- `JWT_SECRET`: a random secret with at least 32 characters (the backend rejects the example placeholder). Example generator: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`.
- `ADMIN_NAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`: the local demo Admin to create. Use a unique test account; the password must be at least 12 characters.
- `FRONTEND_ORIGINS=http://localhost:3000` for local use. In production, set this to the exact frontend origin(s), comma-separated if needed.
- `BILLING_TAX_RATE=5` and `MAX_DISCOUNT_PERCENT=10` (adjust to the assignment/demo scenario).

Make sure your MongoDB network access list allows your current IP. Do not use `0.0.0.0/0` as a permanent workaround. Install and initialize:

```powershell
npm ci
npm run create-admin
npm run create-staff
npm run seed:demo
npm run dev
```

Keep this terminal running. The API should start at `http://localhost:5000`; check `http://localhost:5000/api/health`.

`create-admin` and `create-staff` create separate role-specific test accounts and intentionally refuse to overwrite an existing email. If an account already exists, skip its setup command. `seed:demo` adds five sample menu items only when the same name/category is absent; rerunning it is safe.

### 2. Configure the frontend

Open a second terminal:

```powershell
cd C:\Users\HP\Desktop\Restaurant-Pos-Order-Management\frontend
Copy-Item .env.example .env.local
notepad .env.local
npm ci
npm run dev
```

Keep the backend's `BILLING_TAX_RATE` equal to `NEXT_PUBLIC_BILLING_TAX_RATE` and the backend's `MAX_DISCOUNT_PERCENT` equal to `NEXT_PUBLIC_MAX_DISCOUNT_PERCENT`. These public variables affect only the displayed estimate; **the backend remains authoritative for actual billing**.

Open `http://localhost:3000`. Sign in using the Admin email/password you configured in `backend/.env`.

## Useful URLs

- Dashboard: `http://localhost:3000/`
- Login: `http://localhost:3000/login`
- Menu: `http://localhost:3000/menu`
- Create order: `http://localhost:3000/new-order`
- Orders: `http://localhost:3000/orders`
- Daily sales report (Admin): `http://localhost:3000/reports/daily-sales`
- API health: `http://localhost:5000/api/health`
- OpenAPI: `docs/openapi.yaml`

## Tests and production build

Backend (from `backend`):

```powershell
npm test
npm run typecheck
npm run build
```

Frontend (from `frontend`):

```powershell
npm run lint
npm run build
```

## Environment variables

| Variable | Component | Purpose |
|---|---|---|
| `PORT` | Backend | API port; defaults to `5000` |
| `MONGODB_URI` | Backend | MongoDB connection string |
| `JWT_SECRET` | Backend | Secret used to sign/verify JWTs (32+ characters) |
| `FRONTEND_ORIGINS` | Backend | Exact CORS origins, comma-separated |
| `BILLING_TAX_RATE` | Backend | Tax percentage calculated by the server |
| `MAX_DISCOUNT_PERCENT` | Backend | Maximum allowed discount percentage |
| `ADMIN_NAME` | Setup script | Name for the local Admin account |
| `ADMIN_EMAIL` | Setup script | Email for the local Admin account |
| `ADMIN_PASSWORD` | Setup script | Password for the local Admin account; never commit it |
| `STAFF_NAME`, `STAFF_EMAIL`, `STAFF_PASSWORD` | Setup script | Values for a local Staff test account; never commit passwords |
| `NEXT_PUBLIC_API_URL` | Frontend | Backend origin; local default is `http://localhost:5000` |
| `NEXT_PUBLIC_BILLING_TAX_RATE` | Frontend | Estimate display only; keep aligned with backend |
| `NEXT_PUBLIC_MAX_DISCOUNT_PERCENT` | Frontend | UI validation/display only; backend still validates |

## API documentation

Open `docs/openapi.yaml` in Swagger Editor or import it into a compatible API client. All protected endpoints require the `accessToken` HttpOnly cookie, set by `/api/auth/login`. The UI must use `credentials: "include"` for browser fetch requests.

## Deployment checklist

No public deployment URLs are included in the supplied ZIP, so deployment is not claimed as completed. Before submitting:

1. Deploy the API and set all backend environment variables using the host's secret settings.
2. Set `FRONTEND_ORIGINS` to your exact deployed frontend origin. When frontend and API are on different sites, production cookies use `SameSite=None; Secure`; verify cookie behavior and add/verify CSRF protections appropriate to the selected hosting topology.
3. Deploy `frontend` as a Next.js app and set `NEXT_PUBLIC_API_URL` to the public API origin. Set the matching public tax/discount estimate variables.
4. Verify login, cookie persistence, menu CRUD, unavailable-item rejection, create order, correct bill totals, status transitions, payment, report, and logout on the public URLs.
5. Create a **dedicated test-only reviewer account** and share its credentials in the submission email/README only after the deployment is configured. Never share a real account or production secret.
6. Push the source to a public GitHub repository after checking `git status` and secret scanning. Do not commit `.env`, `.env.local`, credentials, customer data, or build output.
7. Include both task deployment URLs and both public repository URLs in the email to `task.hr@urstechsolution.in` by the assignment deadline.

## Known limitations / design decisions

- Daily sales interprets `date` as a UTC calendar day: order counts use `createdAt`, while paid sales are counted by the payment timestamp (`paidAt`). Legacy paid orders created before `paidAt` was introduced are not included in historical paid-sales totals.
- Payment recording is a simulated record only, with no payment gateway.
- Orders created before the `orderNumber` field was introduced receive a generated fallback label in responses; newly created orders receive unique indexed numbers.
- Legacy `served` orders are displayed as `completed` to align with the requested workflow.
