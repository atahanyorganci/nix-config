import base from "@yorganci/config/oxlint";
import { defineConfig } from "oxlint";

export default defineConfig({
	extends: [base],
	ignorePatterns: ["test/**"],
});
