# `@yorganci/netbird-alchemy`

Alchemy provider for NetBird management resources, built on `@yorganci/netbird-api`.

## Resources

- `NetBird.Setup` — first-admin bootstrap via `POST /api/setup` (`password` + PAT are `Redacted`)
- `NetBird.Group` — peer groups
- `NetBird.Network` — networks
- `NetBird.Peer` — adopt existing mesh peers by stable ID (not created by Alchemy)
- `NetBird.SetupKey` — setup keys (secret `key` is `Redacted`)
- `NetBird.ApiKey` — personal access tokens for management users (secret `token` is `Redacted`)
- `NetBird.User` — management / service users (optional `password` is `Redacted`)
- `NetBird.ReverseProxyDomain` — reverse-proxy domains
- `NetBird.ReverseProxyService` — reverse-proxy services (auth secrets are `Redacted`)

## Credentials

Stack deploys resolve credentials via Effect `Config` (default provider: environment):

| Config key             | Purpose                                                    |
| ---------------------- | ---------------------------------------------------------- |
| `NETBIRD_API_TOKEN`    | Management API token (optional until hydrated after Setup) |
| `NETBIRD_API_BASE_URL` | Optional; defaults to `https://api.netbird.io`             |
| `DEBUG`                | Optional boolean; enables Debug log level in tests         |

`NetBird.Setup` does not use `Credentials` (setup is unauthenticated). After Setup, the infra stack hydrates `NETBIRD_API_TOKEN` into the process env / `.env.local` for Group, SetupKey, and other API resources.

Tests use a fixture Layer backed by a bootstrapped PAT (same `Credentials` service as `CredentialsFromConfig`) — no cloud token required.

## Examples

```typescript
import * as NetBird from "@yorganci/netbird-alchemy";

const bot =
	yield *
	NetBird.User("CiBot", {
		name: "ci-bot",
		role: "admin",
		isServiceUser: true,
	});

const apiKey =
	yield *
	NetBird.ApiKey("CiBotKey", {
		userId: bot.userId,
		name: "ci-bot-key",
		expiresIn: 365,
	});

const domain =
	yield *
	NetBird.ReverseProxyDomain("AppDomain", {
		domain: "app.example.com",
		targetCluster: "proxy.example.com:443",
	});

const svc =
	yield *
	NetBird.ReverseProxyService("Web", {
		name: "web",
		domain: domain.domain,
		enabled: true,
	});
```

## Tests

Integration tests use `alchemy/Test/Vitest` with an Alchemy Docker fixture:

1. `beforeAll` deploys `netbirdio/netbird-server:0.74.6` (fresh volume + bind-mounted config)
2. Bootstrap a PAT via `POST /api/setup`
3. Each `test.provider` scratch stack exercises resources against that API
4. Scratch `destroy()` deletes NetBird API resources; `afterAll` destroys the container/volume

Requires a local Docker daemon. If Docker is unavailable, cases are skipped via `skipIf(!isDockerReady)`.

```bash
bun run test
```

If an interrupted run leaves orphans:

```bash
docker container prune
docker volume prune
```
