import * as IAM from "alchemy/AWS/IAM";
import * as SES from "alchemy/AWS/SES";
import * as Cloudflare from "alchemy/Cloudflare";
import * as Namespace from "alchemy/Namespace";
import * as Output from "alchemy/Output";
import * as Effect from "effect/Effect";
import * as Redacted from "effect/Redacted";
import { createHmac } from "node:crypto";
import type { Input } from "alchemy/Input";

/** Easy DKIM always hands out three tokens, so their records are known while planning. */
const DKIM_TOKEN_COUNT = 3;

/**
 * The SES SMTP password for an IAM secret access key: a SigV4 signature of
 * `SendRawEmail` with a fixed date, prefixed with version byte 0x04.
 * https://docs.aws.amazon.com/ses/latest/dg/smtp-credentials.html
 */
export const smtpPassword = (secretAccessKey: string, region: string) => {
	const sign = (key: Buffer | string, message: string) => createHmac("sha256", key).update(message, "utf8").digest();
	let signature = sign(`AWS4${secretAccessKey}`, "11111111");
	for (const message of [region, "ses", "aws4_request", "SendRawEmail"]) {
		signature = sign(signature, message);
	}
	return Buffer.concat([Buffer.from([0x04]), signature]).toString("base64");
};

export interface SmtpRelayProps {
	/** Domain mail is sent from, e.g. `mail.example.com`. */
	domain: string;
	/** Cloudflare zone holding `domain`. */
	zoneId: Input<string>;
	/** SES region; the SMTP endpoint and password are region-specific. */
	region: string;
	/** Where DMARC aggregate reports go. Left out, none are requested. */
	dmarcReportAddress?: string;
	/**
	 * Addresses the relay may send to while the account is in the SES sandbox,
	 * where sending is authorized against each recipient's identity too. Each
	 * has to be a verified identity of its own (`aws sesv2
	 * create-email-identity`); drop the list once production access is granted.
	 */
	sandboxRecipients?: ReadonlyArray<string>;
}

/**
 * A verified SES domain identity with its DNS records (Easy DKIM, a custom
 * MAIL FROM domain and DMARC) and an IAM user whose only permission is to
 * send as it, with SMTP credentials derived from its access key.
 */
export const smtpRelay = Effect.fn("SesSmtpRelay")(function* ({
	domain,
	zoneId,
	region,
	dmarcReportAddress,
	sandboxRecipients = [],
}: SmtpRelayProps) {
	return yield* Namespace.push(
		"Ses",
		Effect.gen(function* () {
			const mailFromDomain = `bounce.${domain}`;

			const identity = yield* SES.EmailIdentity("Identity", {
				emailIdentity: domain,
				dkimSigningKeyLength: "RSA_2048_BIT",
				mailFromDomain,
				mailFromBehaviorOnMxFailure: "USE_DEFAULT_VALUE",
			});

			for (let i = 0; i < DKIM_TOKEN_COUNT; i++) {
				yield* Cloudflare.DNS.Record(`Dkim${i + 1}`, {
					zoneId,
					name: Output.map(identity.dkimTokens, tokens => `${tokens[i]}._domainkey.${domain}`),
					type: "CNAME",
					content: Output.map(identity.dkimTokens, tokens => `${tokens[i]}.dkim.amazonses.com`),
					proxied: false,
					ttl: "1",
				});
			}

			// Bounces and complaints return to SES through the MAIL FROM domain,
			// which also makes SPF align with the From domain for DMARC.
			yield* Cloudflare.DNS.Record("MailFromMx", {
				zoneId,
				name: mailFromDomain,
				type: "MX",
				content: `feedback-smtp.${region}.amazonses.com`,
				priority: 10,
				ttl: "1",
			});
			yield* Cloudflare.DNS.Record("MailFromSpf", {
				zoneId,
				name: mailFromDomain,
				type: "TXT",
				content: '"v=spf1 include:amazonses.com ~all"',
				ttl: "1",
			});
			yield* Cloudflare.DNS.Record("Dmarc", {
				zoneId,
				name: `_dmarc.${domain}`,
				type: "TXT",
				content: `"v=DMARC1; p=quarantine${dmarcReportAddress ? `; rua=mailto:${dmarcReportAddress}` : ""}"`,
				ttl: "1",
			});

			const user = yield* IAM.User("SmtpUser", {
				inlinePolicies: {
					// The sandbox's recipient identities are resources here too, so the
					// From address is held to `domain` either way.
					SendAsIdentity: Output.map(identity.identityArn, arn => ({
						Version: "2012-10-17" as const,
						Statement: [
							{
								Effect: "Allow" as const,
								Action: ["ses:SendRawEmail"],
								Resource: [
									arn,
									...sandboxRecipients.map(address => arn.replace(/identity\/.*$/, `identity/${address}`)),
								],
								Condition: { StringLike: { "ses:FromAddress": `*@${domain}` } },
							},
						],
					})),
				},
			});
			const key = yield* IAM.AccessKey("SmtpKey", { userName: user.userName });

			const password = Output.map(key.secretAccessKey, secret => {
				if (secret === undefined) {
					throw new Error("the SES SMTP access key has no secret in state; replace SesSmtpKey to mint a new one");
				}
				return Redacted.make(smtpPassword(Redacted.value(secret), region));
			});

			return {
				host: `email-smtp.${region}.amazonaws.com`,
				port: 587,
				username: key.accessKeyId,
				password,
				domain,
				verified: identity.verifiedForSendingStatus,
			};
		}),
	);
});
