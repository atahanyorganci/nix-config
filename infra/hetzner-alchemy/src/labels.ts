/** Hetzner label maps arrive with `string | undefined` values; normalize to plain records. */
export type LabelMap = Record<string, string | undefined>;

export const compactLabels = (labels: LabelMap | undefined): Record<string, string> => {
	const out: Record<string, string> = {};
	for (const [key, value] of Object.entries(labels ?? {})) {
		if (value !== undefined) out[key] = value;
	}
	return out;
};

export const labelsEqual = (a: LabelMap | undefined, b: LabelMap | undefined): boolean => {
	const left = compactLabels(a);
	const right = compactLabels(b);
	const leftKeys = Object.keys(left).sort();
	const rightKeys = Object.keys(right).sort();
	if (leftKeys.length !== rightKeys.length) return false;
	return leftKeys.every((key, index) => key === rightKeys[index] && left[key] === right[key]);
};
