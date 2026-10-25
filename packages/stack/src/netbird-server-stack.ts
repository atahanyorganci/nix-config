import * as Alchemy from "alchemy";
import type * as Redacted from "effect/Redacted";

/** Persisted outputs from the NetbirdServer stack (`stack/netbird-server.ts`). */
export interface NetbirdServerStackOutputs {
	zone: string;
	mars: {
		ip: string;
		serverId: string;
	};
	jupiter: {
		ip: string;
		serverId: string;
	};
	saturn: {
		ip: string;
		instanceId: string;
	};
	apiBaseUrl: string;
	/** NetBird's owner, the stack's admin; its password is in nix-secrets. */
	admin: {
		email: string;
		/**
		 * The service user setup created on a new server, and its key, which
		 * `just netbird-token` copies into Doppler as `NB_PAT`. Absent on an
		 * installation set up before setup made one.
		 */
		automation?: {
			userId: string;
			name: string;
			tokenId: string;
			tokenName: string;
			token: Redacted.Redacted<string>;
			expirationDate: string;
		};
	};
	/** SES's SMTP relay for mail from `infra.mailDomain` (STARTTLS on `port`). */
	smtp: {
		host: string;
		port: number;
		username: string;
		password: Redacted.Redacted<string>;
		domain: string;
		verified: boolean;
	};
}

export class NetbirdServerStack extends Alchemy.Stack<NetbirdServerStack, NetbirdServerStackOutputs>()(
	"NetbirdServer",
) {}
