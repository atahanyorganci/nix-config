import { lookup as dnsLookup } from "node:dns/promises";
import { isIP } from "node:net";

/**
 * Guards outbound fetches against server-side request forgery.
 *
 * The URL passed to `fetch_content` comes from the model, which means it can
 * be steered by anything the model has read: a search result, a page it just
 * fetched, a file in the repository. Treating it as untrusted input is the
 * whole point of this module. Without these checks the tool is a proxy into
 * whatever the host can reach but the network cannot, which on a mesh network
 * is every internal service.
 *
 * Ported from nicobailon/pi-web-access (MIT), keeping its blocklist intact.
 */

/** A parsed CIDR rule: network bytes plus the number of significant bits. */
interface ParsedCidr {
	readonly bytes: Uint8Array;
	readonly prefix: number;
}

export interface ValidateOptions {
	/**
	 * CIDRs exempt from the private-address checks. Needed for ranges that are
	 * private by definition but legitimate here, such as a mesh network's
	 * carrier-grade NAT space.
	 */
	readonly allowRanges?: readonly string[];
	/** Injection point for tests; defaults to a real DNS lookup. */
	readonly lookup?: (hostname: string) => Promise<readonly { address: string }[]>;
}

export interface FetchRemoteOptions extends ValidateOptions {
	readonly maxRedirects?: number;
	/**
	 * Injection point for tests. Narrower than `typeof fetch` on purpose: the
	 * request target is always a validated `URL`, never a `Request`, and a
	 * `Request` carries its own URL that would bypass validation entirely.
	 */
	readonly fetch?: (input: URL, init?: RequestInit) => Promise<Response>;
}

const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);
const DEFAULT_MAX_REDIRECTS = 5;

/** Thrown when a URL is rejected, so callers can tell policy from transport failures. */
export class BlockedUrlError extends Error {
	override readonly name = "BlockedUrlError";
}

const defaultLookup = async (hostname: string) => await dnsLookup(hostname, { all: true, verbatim: true });

/** Lower-case, strip IPv6 brackets, drop the root label's trailing dot. */
function normalizeHostname(hostname: string): string {
	return hostname
		.toLowerCase()
		.replace(/^\[|\]$/g, "")
		.replace(/\.$/, "");
}

/**
 * 198.18.0.0/15 is a benchmarking range that TUN and fake-IP proxies hand out
 * for synthetic addresses, so it earns a more specific hint than the rest.
 */
function isFakeIpProxyAddress(address: string): boolean {
	const [a, b] = address.split(".").map(Number);
	return a === 198 && (b === 18 || b === 19);
}

function isBlockedIPv4(address: string): boolean {
	const parts = address.split(".").map(Number);
	// Anything unparseable is blocked rather than trusted.
	if (parts.length !== 4 || parts.some(part => !Number.isInteger(part) || part < 0 || part > 255)) return true;
	const [a, b] = parts;
	return (
		a === 0 || // "this network"
		a === 10 || // RFC 1918
		a === 127 || // loopback
		(a === 100 && b >= 64 && b <= 127) || // RFC 6598 carrier-grade NAT
		(a === 169 && b === 254) || // link-local, covers cloud metadata at 169.254.169.254
		(a === 172 && b >= 16 && b <= 31) || // RFC 1918
		(a === 192 && b === 168) || // RFC 1918
		isFakeIpProxyAddress(address) ||
		a >= 224 // multicast and reserved
	);
}

function isBlockedIPv6(address: string): boolean {
	const groups = parseIPv6(address);
	if (!groups) return true;

	const first = groups[0]!;
	if (groups.every(group => group === 0)) return true; // ::
	if (groups.slice(0, 7).every(group => group === 0) && groups[7] === 1) return true; // ::1
	if ((first & 0xfe00) === 0xfc00) return true; // fc00::/7 unique local
	if ((first & 0xffc0) === 0xfe80) return true; // fe80::/10 link-local

	// ::ffff:10.0.0.1 reaches the same host as 10.0.0.1, so the v4 rules have to
	// apply through the mapping. Missing this is the classic bypass.
	const isMappedIPv4 = groups.slice(0, 5).every(group => group === 0) && groups[5] === 0xffff;
	if (isMappedIPv4) {
		const ipv4 = [groups[6]! >> 8, groups[6]! & 0xff, groups[7]! >> 8, groups[7]! & 0xff].join(".");
		return isBlockedIPv4(ipv4);
	}

	return false;
}

/** Expand an IPv6 address (including `::` and trailing IPv4) into eight groups. */
function parseIPv6(address: string): number[] | null {
	let text = address;
	if (text.includes(".")) {
		const lastColon = text.lastIndexOf(":");
		const ipv4 = text.slice(lastColon + 1);
		if (isIP(ipv4) !== 4) return null;
		const octets = ipv4.split(".").map(Number);
		const high = ((octets[0]! << 8) | octets[1]!).toString(16);
		const low = ((octets[2]! << 8) | octets[3]!).toString(16);
		text = `${text.slice(0, lastColon)}:${high}:${low}`;
	}

	const pieces = text.split("::");
	if (pieces.length > 2) return null;

	const left = pieces[0] ? pieces[0].split(":") : [];
	const right = pieces.length === 2 && pieces[1] ? pieces[1].split(":") : [];
	const missing = 8 - left.length - right.length;
	if (pieces.length === 1 && missing !== 0) return null;
	if (pieces.length === 2 && missing < 0) return null;

	const groups = [...left, ...(Array(missing).fill("0") as string[]), ...right].map(part =>
		/^[0-9a-f]{1,4}$/i.test(part) ? parseInt(part, 16) : -1,
	);
	return groups.length === 8 && groups.every(group => group >= 0 && group <= 0xffff) ? groups : null;
}

function ipv4ToBytes(address: string): Uint8Array | null {
	const parts = address.split(".");
	if (parts.length !== 4) return null;
	const bytes = new Uint8Array(4);
	for (let i = 0; i < 4; i++) {
		const octet = Number(parts[i]);
		if (!Number.isInteger(octet) || octet < 0 || octet > 255) return null;
		bytes[i] = octet;
	}
	return bytes;
}

function ipv6GroupsToBytes(groups: readonly number[]): Uint8Array {
	const bytes = new Uint8Array(16);
	for (let i = 0; i < 8; i++) {
		bytes[i * 2] = groups[i]! >> 8;
		bytes[i * 2 + 1] = groups[i]! & 0xff;
	}
	return bytes;
}

function ipToBytes(address: string, version: number): Uint8Array | null {
	if (version === 4) return ipv4ToBytes(address);
	if (version === 6) {
		const groups = parseIPv6(address);
		return groups ? ipv6GroupsToBytes(groups) : null;
	}
	return null;
}

/** Parse `["10.0.0.0/8", "1.2.3.4"]` into rules, throwing on anything malformed. */
export function parseAllowRanges(input: readonly string[] | undefined): ParsedCidr[] {
	if (!input) return [];
	return input.map(entry => {
		const rule = parseCidr(entry.trim());
		if (!rule) throw new BlockedUrlError(`Invalid CIDR notation in allowRanges: "${entry}"`);
		return rule;
	});
}

function parseCidr(raw: string): ParsedCidr | null {
	if (!raw) return null;
	const slash = raw.lastIndexOf("/");
	const addrPart = slash >= 0 ? raw.slice(0, slash) : raw;
	const prefixPart = slash >= 0 ? raw.slice(slash + 1) : null;
	// A slash must be followed by digits: Number("") is 0, which would silently
	// turn "10.0.0.0/" into /0 and exempt the entire address space.
	if (prefixPart !== null && !/^\d+$/.test(prefixPart)) return null;

	const version = isIP(addrPart);
	if (version === 4) {
		const bytes = ipv4ToBytes(addrPart);
		if (!bytes) return null;
		const prefix = prefixPart === null ? 32 : Number(prefixPart);
		if (!Number.isInteger(prefix) || prefix < 1 || prefix > 32) return null;
		return { bytes, prefix };
	}
	if (version === 6) {
		const groups = parseIPv6(addrPart);
		if (!groups) return null;
		const prefix = prefixPart === null ? 128 : Number(prefixPart);
		if (!Number.isInteger(prefix) || prefix < 1 || prefix > 128) return null;
		return { bytes: ipv6GroupsToBytes(groups), prefix };
	}
	return null;
}

/** Compare the leading `prefix` bits of two equal-length byte arrays. */
function bytesMatchPrefix(addr: Uint8Array, network: Uint8Array, prefix: number): boolean {
	const fullBytes = prefix >> 3;
	const remBits = prefix & 7;
	for (let i = 0; i < fullBytes; i++) {
		if (addr[i] !== network[i]) return false;
	}
	if (remBits > 0 && fullBytes < addr.length) {
		const mask = (0xff << (8 - remBits)) & 0xff;
		if ((addr[fullBytes]! & mask) !== (network[fullBytes]! & mask)) return false;
	}
	return true;
}

function isInAllowedRange(address: string, ipVersion: number, allowRanges: readonly ParsedCidr[]): boolean {
	if (allowRanges.length === 0) return false;
	const addrBytes = ipToBytes(address, ipVersion);
	if (!addrBytes) return false;
	// Only same-family rules can match: 4-byte IPv4 against 16-byte IPv6 never does.
	return allowRanges.some(
		rule => rule.bytes.length === addrBytes.length && bytesMatchPrefix(addrBytes, rule.bytes, rule.prefix),
	);
}

function assertPublicAddress(address: string, hostname: string, allowRanges: readonly ParsedCidr[]): void {
	const normalized = normalizeHostname(address);
	const ipVersion = isIP(normalized);
	if (ipVersion === 0) throw new BlockedUrlError(`Resolved non-IP address for ${hostname}: ${address}`);
	if (isInAllowedRange(normalized, ipVersion, allowRanges)) return;

	if (ipVersion === 4 && isBlockedIPv4(normalized)) {
		const hint = isFakeIpProxyAddress(normalized)
			? ". This address is in 198.18.0.0/15, commonly used by TUN/fake-IP proxies; add it to allowRanges if that matches your setup."
			: "";
		throw new BlockedUrlError(`Blocked internal address for ${hostname}: ${normalized}${hint}`);
	}
	if (ipVersion === 6 && isBlockedIPv6(normalized)) {
		throw new BlockedUrlError(`Blocked internal address for ${hostname}: ${normalized}`);
	}
}

/**
 * Resolve and vet a URL, returning it when every address it maps to is public.
 *
 * Literal IPs are checked directly. Hostnames are resolved and *every* returned
 * address is checked, because a name that answers with one public and one
 * private address would otherwise be reachable on the private one.
 */
export async function validateRemoteUrl(rawUrl: string | URL, options: ValidateOptions = {}): Promise<URL> {
	const url = rawUrl instanceof URL ? rawUrl : new URL(rawUrl);
	if (url.protocol !== "http:" && url.protocol !== "https:") {
		throw new BlockedUrlError("Only HTTP and HTTPS URLs can be fetched");
	}

	const hostname = normalizeHostname(url.hostname);
	if (!hostname) throw new BlockedUrlError("URL must include a hostname");
	// Blocked by name as well as by address: the name resolves to loopback, but
	// rejecting it here gives a clearer error than "blocked internal address".
	if (hostname === "localhost" || hostname.endsWith(".localhost")) {
		throw new BlockedUrlError(`Blocked internal hostname: ${hostname}`);
	}

	const allowRanges = parseAllowRanges(options.allowRanges);

	if (isIP(hostname)) {
		assertPublicAddress(hostname, hostname, allowRanges);
		return url;
	}

	let addresses: readonly { address: string }[];
	try {
		addresses = await (options.lookup ?? defaultLookup)(hostname);
	} catch (cause) {
		const message = cause instanceof Error ? cause.message : String(cause);
		throw new BlockedUrlError(`Failed to resolve ${hostname}: ${message}`);
	}

	if (addresses.length === 0) throw new BlockedUrlError(`Failed to resolve ${hostname}: no addresses returned`);
	for (const { address } of addresses) {
		assertPublicAddress(address, hostname, allowRanges);
	}
	return url;
}

/**
 * Fetch a URL, validating the target before every hop.
 *
 * Redirects are followed manually because the platform's automatic handling
 * would jump to the new location without giving us a chance to vet it. A
 * public URL redirecting to 169.254.169.254 is the standard SSRF trick, and it
 * only fails if each hop is re-validated.
 */
export async function fetchRemoteUrl(
	url: string | URL,
	init: RequestInit = {},
	options: FetchRemoteOptions = {},
): Promise<Response> {
	const fetchImpl = options.fetch ?? fetch;
	const maxRedirects = options.maxRedirects ?? DEFAULT_MAX_REDIRECTS;
	let current = await validateRemoteUrl(url, options);
	let requestInit = init;

	for (let redirects = 0; redirects <= maxRedirects; redirects++) {
		const response = await fetchImpl(current, { ...requestInit, redirect: "manual" });
		if (!REDIRECT_STATUSES.has(response.status)) return response;

		const location = response.headers.get("location");
		// A redirect status without a Location header is the server's problem;
		// hand it back rather than inventing a target.
		if (!location) return response;
		if (redirects === maxRedirects) throw new BlockedUrlError(`Too many redirects fetching ${current.toString()}`);

		current = await validateRemoteUrl(new URL(location, current), options);
		// 303 always becomes GET; 301/302 do too for POST, per RFC 9110.
		if (
			response.status === 303 ||
			((response.status === 301 || response.status === 302) && requestInit.method?.toUpperCase() === "POST")
		) {
			const { body: _body, ...rest } = requestInit;
			requestInit = { ...rest, method: "GET" };
		}
	}

	throw new BlockedUrlError(`Too many redirects fetching ${current.toString()}`);
}
