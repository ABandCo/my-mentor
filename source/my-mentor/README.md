# My Mentor

A private Android app for Arpan and his wife: daily plan, hourly accountability, Communication Lab, practice growth, habits and health, with an honest AI mentor.

**Current status:** Phase 1 (design system + Home). See [docs/PROGRESS.md](docs/PROGRESS.md).

## Docs
[Spec](docs/PRODUCT_SPEC.md) · [Architecture](docs/ARCHITECTURE.md) · [Plan](docs/IMPLEMENTATION_PLAN.md) · [Progress](docs/PROGRESS.md) · [Tests](docs/TEST_REPORT.md) · [Costs](docs/COSTS.md) · [Design](docs/DESIGN_SYSTEM.md) · [Security](docs/SECURITY.md) · [Deployment](docs/DEPLOYMENT.md) · [APIs](docs/API_INTEGRATIONS.md) · [User guide](docs/USER_GUIDE.md)

## Run a preview on this PC
The Windows username contains "&", which breaks npm. Always use the short path:
```powershell
$env:npm_config_cache = "C:\Users\ARPANB~1\AppData\Local\npm-cache"
cd C:\Users\ARPANB~1\<path-to>\my-mentor
npx expo start --web
```
