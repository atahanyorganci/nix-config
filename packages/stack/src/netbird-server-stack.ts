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
	admin: {
		email: string;
		password: Redacted.Redacted<string>;
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
