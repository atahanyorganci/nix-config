import * as Effect from "effect/Effect";
import * as Hetzner from "./hetzner.ts";

export interface NetbirdServerStackProps {
	name: string;
	location: string;
	image: string;
	serverType: string;
	sshKey: Hetzner.SshKey;
}

export const stack = Effect.fn("NetbirdServerStack")(function* ({
	name,
	location,
	image,
	serverType,
	sshKey,
}: NetbirdServerStackProps) {
	// Alchemy's Server cannot bind a pre-created Primary IP at create time, so
	// this address only stays attached to the current server generation. After
	// a server replacement, assign it to the new server by hand (power off,
	// assign, power on) so DNS and the deploy commands point at the right host.
	const ipv4 = yield* Hetzner.PrimaryIp("NetbirdIpv4", {
		name: `${name}-ipv4`,
		type: "ipv4",
		location,
		autoDelete: false,
	});

	const server = yield* Hetzner.Server("NetbirdServer", {
		name,
		serverType,
		image,
		location,
		sshKeys: [sshKey],
		enableIpv6: false,
	});

	// The firewall owns its attachments: Alchemy converges `applied_to` to
	// `applyTo` on every firewall reconcile, so the server must not list it too.
	const firewall = yield* Hetzner.Firewall("NetbirdServerFirewall", {
		name,
		rules: [
			{
				direction: "in",
				protocol: "tcp",
				port: "22",
				sourceIps: ["0.0.0.0/0", "::/0"],
				description: "SSH",
			},
			{
				direction: "in",
				protocol: "tcp",
				port: "80",
				sourceIps: ["0.0.0.0/0", "::/0"],
				description: "HTTP ACME",
			},
			{
				direction: "in",
				protocol: "tcp",
				port: "443",
				sourceIps: ["0.0.0.0/0", "::/0"],
				description: "HTTPS",
			},
			{
				direction: "in",
				protocol: "udp",
				port: "3478",
				sourceIps: ["0.0.0.0/0", "::/0"],
				description: "NetBird STUN",
			},
			{
				direction: "in",
				protocol: "udp",
				port: "51820",
				sourceIps: ["0.0.0.0/0", "::/0"],
				description: "WireGuard",
			},
		],
		applyTo: [server],
	});

	return {
		firewall,
		ipv4,
		server,
	};
});
