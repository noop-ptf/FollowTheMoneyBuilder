import { Model, defaultModel } from '@opensanctions/followthemoney';
import LinkType from './LinkType';

export const model = new Model(defaultModel);
export const linkTypes = LinkType.getAll(model);

export function listEntitySchemata() {
	return model
		.getSchemata()
		.filter((s) => !s.generated && !s.abstract && s.isA('Thing'))
		.sort((a, b) => a.label.localeCompare(b.label));
}
