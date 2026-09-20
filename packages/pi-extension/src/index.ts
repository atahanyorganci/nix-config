import { Type } from "@earendil-works/pi-ai";
import { defineTool } from "@earendil-works/pi-coding-agent";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

const hostInfo = defineTool({
	name: "host_info",
	label: "Host Info",
	description: "Report the Nix host this session is running on.",
	parameters: Type.Object({}),
	async execute(_toolCallId, _params, _signal, _onUpdate, _ctx) {
		const { hostname, platform, release } = await import("node:os");
		const text = `${hostname()} (${platform()} ${release()})`;
		return {
			content: [{ type: "text", text }],
			details: { hostname: hostname(), platform: platform(), release: release() },
		};
	},
});

export default function (pi: ExtensionAPI): void {
	pi.registerTool(hostInfo);
}
