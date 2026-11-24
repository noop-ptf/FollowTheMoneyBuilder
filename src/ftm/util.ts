import type { Value } from '@opensanctions/followthemoney';

// Entity-typed properties may hold Entity objects rather than strings,
// so reduce them to a string when needed.
export function valueToString(value: Value): string {
	return typeof value === 'string' ? value : value.id;
}
