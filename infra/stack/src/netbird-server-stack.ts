import * as Alchemy from "alchemy";
import type * as Redacted from "effect/Redacted";

/** Persisted outputs from the NetbirdServer stack (`stack/netbird-server.ts`). */
export interface NetbirdServerStackOutputs {
	zone: string;
	serverIp: string;
	apiBaseUrl: string;
	admin: {
		email: string;
		password: Redacted.Redacted<string>;
	};
}

export class NetbirdServerStack extends Alchemy.Stack<NetbirdServerStack, NetbirdServerStackOutputs>()(
	"NetbirdServer",
) {}
