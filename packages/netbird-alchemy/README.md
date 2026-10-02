# `@yorganci/netbird-alchemy`

Alchemy provider for NetBird management resources, built on `@yorganci/netbird-api`.

## Resources

- `NetBird.Setup` — first-admin bootstrap via `POST /api/setup` (`password` + PAT are `Redacted`)
- `NetBird.Group` — peer groups
- `NetBird.Network` — networks
- `NetBird.Peer` — adopt existing mesh peers by `host` identity or stable `peerId` (not created by Alchemy)
- `NetBird.SetupKey` — setup keys (secret `key` is `Redacted`)
- `NetBird.ApiKey` — personal access tokens for management users (secret `token` is `Redacted`)
- `NetBird.User` — management / service users (optional `password` is `Redacted`)
- `NetBird.ReverseProxyDomain` — reverse-proxy domains
- `NetBird.ReverseProxyService` — reverse-proxy services (auth secrets are `Redacted`)
- `NetBird.Policy` — access-control policies (one rule per policy on NetBird 0.75; the dashboard Default policy is adopted and restored on destroy, never deleted)
- `NetBird.PostureCheck` — posture checks (client version, OS version, geolocation, peer network range, process)
- `NetBird.Route` — routes (exit nodes and network prefixes distributed to peer groups)
- `NetBird.NetworkResource` — network resources
- `NetBird.NetworkRouter` — network routers

## Credentials

`providers()` registers a `NetBird` auth provider and resolves credentials the way Alchemy's built-in clouds do. On first use it takes them from the environment when `NB_PAT` is set, which includes a stack's `secrets` (e.g. `Doppler.Secrets`). In CI it reads only the environment. Otherwise it uses the selected Alchemy profile (`alchemy profile edit --add NetBird`).

| Variable            | Purpose                                                                  |
| ------------------- | ------------------------------------------------------------------------ |
| `NB_PAT`            | Personal access token (required for every resource except `Setup`)       |
| `NB_MANAGEMENT_URL` | Optional; management server origin, defaults to `https://api.netbird.io` |
| `DEBUG`             | Optional boolean; enables Debug log level in tests                       |

These are the variables NetBird's Terraform provider reads. `NetBird.Setup` does not use `Credentials` (setup is unauthenticated). After Setup, mint a token in the dashboard and store it as `NB_PAT` for Group, SetupKey, and other API resources.

Tests pass the fixture's bootstrapped PAT to `providers()` as `NB_PAT` / `NB_MANAGEMENT_URL` — no cloud token required.

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

const venus =
	yield *
	NetBird.Peer("Venus", {
		host: "venus",
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
		targets: [
			{
				targetId: venus.peerId,
				targetType: "peer",
				protocol: "http",
				port: 8080,
				enabled: true,
			},
		],
	});
```

## Tests

Integration tests use `alchemy/Test/Vitest` with an Alchemy Docker fixture:

1. `beforeAll` deploys `netbirdio/netbird-server:0.80.0` (fresh volume + bind-mounted config)
2. Bootstrap a PAT via `POST /api/setup`
3. Each `test.provider` scratch stack exercises resources against that API
4. Scratch `destroy()` deletes NetBird API resources; `afterAll` destroys the container/volume

Requires a local Docker daemon. If Docker is unavailable, cases are skipped via `skipIf(!isDockerReady)`.

```bash
pnpm run test
```

If an interrupted run leaves orphans:

```bash
docker container prune
docker volume prune
```
