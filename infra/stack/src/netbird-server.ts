import * as Hetzner from "@yorganci/hetzner-alchemy";
import * as Effect from "effect/Effect";
import type * as Output from "alchemy/Output";

export interface NetbirdServerStackProps {
	name: string;
	location: string;
	image: string;
	serverType: string;
	sshKey: string | Output.Output<string>;
}

export const stack = Effect.fn("NetbirdServerStack")(function* ({
	name,
	location,
	image,
	serverType,
	sshKey,
}: NetbirdServerStackProps) {
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
	});

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
		firewalls: [firewall.firewallId],
		primaryIpv4Id: ipv4.primaryIpId,
		enableIpv6: false,
	});

	return {
		firewall,
		ipv4,
		server,
	};
});
