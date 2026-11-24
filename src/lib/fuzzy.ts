export function fuzzyScore(query: string, target: string): number {
	if (!query) return 0;

	const q = query.toLowerCase();
	const t = target.toLowerCase();

	let score = 0;
	let from = 0;
	let prev = -2;

	for (let i = 0; i < q.length; i++) {
		const c = q.charAt(i);
		const found = t.indexOf(c, from);
		if (found === -1) return -1; // not a match at all

		if (found === prev + 1) score += 8; // consecutive run
		if (found === 0 || /[\s\-_./]/.test(t.charAt(found - 1))) score += 6; // start of a word
		score -= Math.min(found - from, 4); // penalty for skipping ahead

		prev = found;
		from = found + 1;
	}

	return score - t.length * 0.05; // mild preference for shorter names
}

export function fuzzyFilter<T extends { label: string }>(
	items: T[],
	query: string,
): T[] {
	if (!query) return items;
	return items
		.map((item) => ({ item, score: fuzzyScore(query, item.label) }))
		.filter((r) => r.score >= 0)
		.sort((a, b) => b.score - a.score)
		.map((r) => r.item);
}
