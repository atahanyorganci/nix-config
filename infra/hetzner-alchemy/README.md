# `@yorganci/hetzner-alchemy`

Alchemy provider for Hetzner Cloud resources, built on `@yorganci/hetzner-api`.

## Resources

- `Hetzner.SshKey` — SSH public keys (`publicKey` changes replace the key)
- `Hetzner.Firewall` — firewalls and rules (attachments managed via `Server.firewalls`)
- `Hetzner.PrimaryIp` — stable public IPs (default `autoDelete: false`)
- `Hetzner.Server` — VMs; attach SSH keys, firewalls, and a Primary IPv4 at create

Resource attributes intentionally omit temporal fields (`created`, action progress, traffic counters, etc.).

## Credentials

Stack deploys resolve credentials via Effect `Config` (default provider: environment):

| Config key             | Purpose                                              |
| ---------------------- | ---------------------------------------------------- |
| `HETZNER_API_TOKEN`    | Cloud API token (required for stack deploy)          |
| `HETZNER_API_BASE_URL` | Optional; defaults to `https://api.hetzner.cloud/v1` |
| `DEBUG`                | Optional boolean; enables Debug log level in tests   |

## Examples

Create order for SSH with a stable IPv4:

```typescript
import * as Hetzner from "@yorganci/hetzner-alchemy";

const key =
	yield *
	Hetzner.SshKey("BootstrapKey", {
		name: "bootstrap",
		publicKey: "ssh-ed25519 AAAA... user@host",
	});

const firewall =
	yield *
	Hetzner.Firewall("SshFirewall", {
		name: "ssh",
		rules: [
			{
				direction: "in",
				protocol: "tcp",
				port: "22",
				sourceIps: ["0.0.0.0/0", "::/0"],
			},
		],
	});

const ip =
	yield *
	Hetzner.PrimaryIp("StableIpv4", {
		name: "stable-ipv4",
		type: "ipv4",
		location: "nbg1",
		autoDelete: false,
	});

const server =
	yield *
	Hetzner.Server("App", {
		name: "app",
		serverType: "cpx12",
		image: "ubuntu-24.04",
		location: "nbg1",
		sshKeys: [key.name],
		firewalls: [firewall.firewallId],
		primaryIpv4Id: ip.primaryIpId,
	});

// server.ipv4 === ip.ip
```

Wire providers into a stack with `Hetzner.providers()`.

## Tests

Live integration tests hit the real Hetzner Cloud API and always run. They load
config via Effect `Config` / `ConfigProvider` (process env, falling back to
`.env.local`). Missing `HETZNER_API_TOKEN` fails the suite.

| Config key                 | Default        |
| -------------------------- | -------------- |
| `HETZNER_API_TOKEN`        | (required)     |
| `HETZNER_TEST_LOCATION`    | `nbg1`         |
| `HETZNER_TEST_SERVER_TYPE` | `cpx12`        |
| `HETZNER_TEST_IMAGE`       | `ubuntu-24.04` |

```bash
bun run test
```

Tests create billable resources briefly, then destroy them. Interrupted runs may leave orphans in the Hetzner project — clean them up in the console or via the API.
