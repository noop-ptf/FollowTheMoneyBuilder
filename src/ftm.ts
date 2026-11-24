import { Model, defaultModel } from '@opensanctions/followthemoney';
import type { Value } from '@opensanctions/followthemoney';
import LinkType from './ftm/LinkType';

export const model = new Model(defaultModel);
export const linkTypes = LinkType.getAll(model);

// Entity-typed properties may hold Entity objects rather than strings,
// so reduce them to a string when needed.
export function valueToString(value: Value): string {
	return typeof value === 'string' ? value : value.id;
}

export function listEntitySchemata() {
	return model
		.getSchemata()
		.filter((s) => !s.generated && !s.abstract && s.isA('Thing'))
		.sort((a, b) => a.label.localeCompare(b.label));
}
