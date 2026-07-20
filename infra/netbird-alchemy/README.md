# `@yorganci/netbird-alchemy`

Alchemy provider for NetBird management resources, built on `@yorganci/netbird-api`.

## Resources

- `NetBird.Group` — peer groups
- `NetBird.Network` — networks
- `NetBird.SetupKey` — setup keys (secret `key` is `Redacted`)

## Credentials

Stack deploys resolve credentials via Effect `Config` (default provider: environment):

| Config key             | Purpose                                            |
| ---------------------- | -------------------------------------------------- |
| `NETBIRD_API_TOKEN`    | Management API token (required for stack deploy)   |
| `NETBIRD_API_BASE_URL` | Optional; defaults to `https://api.netbird.io`     |
| `DEBUG`                | Optional boolean; enables Debug log level in tests |

Tests use a fixture Layer backed by a bootstrapped PAT (same `Credentials` service as `CredentialsFromConfig`) — no cloud token required.

## Tests

Integration tests use `alchemy/Test/Vitest` with an Alchemy Docker fixture:

1. `beforeAll` deploys `netbirdio/netbird-server:0.74.6` (fresh volume + bind-mounted config)
2. Bootstrap a PAT via `POST /api/setup`
3. Each `test.provider` scratch stack exercises Group / Network / SetupKey against that API
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
