# Restaurant POS API

See the repository root `README.md` for setup and the complete environment-variable guide. Run backend commands from this folder:

```powershell
Copy-Item .env.example .env
# Edit .env with a MongoDB URI and a JWT secret (never commit .env).
npm ci
npm run create-admin
npm run seed:demo
npm run dev
```

Validation commands: `npm test`, `npm run typecheck`, `npm run build`. OpenAPI schema: `../docs/openapi.yaml`.
