/**
 * Stand-in for cobalt's `@imput/version-info` workspace package.
 *
 * `@imput/cobalt-api` declares `"@imput/version-info": "workspace:^"`, which
 * only resolves inside cobalt's own monorepo. The package is not published, and
 * `pnpm.overrides` cannot redirect it: pnpm rejects the `workspace:` protocol
 * before overrides are applied. Providing a workspace member under that name is
 * what the protocol actually asks for, so installation succeeds.
 *
 * Upstream derives these by reading `.git` and `package.json` from the current
 * working directory, which is meaningless for a consumer. Cobalt only uses the
 * result to build its outgoing user-agent string.
 */

const VERSION = "library";

export const getVersion = async () => VERSION;
export const getCommit = async () => "unknown";
export const getBranch = async () => "unknown";
export const getRemote = async () => "imputnet/cobalt";
