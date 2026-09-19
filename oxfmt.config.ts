import base from "@yorganci/config/oxfmt";
import { defineConfig } from "oxfmt";

export default defineConfig({
	...base,
	ignorePatterns: ["infra/**", "modules/**", "vendor/**"],
});
