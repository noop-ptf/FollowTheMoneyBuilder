import type { Schema } from '@opensanctions/followthemoney';

export type SchemaCategory = 'person' | 'legalEntity' | 'document' | 'default';

export function getSchemaCategory(schema: Schema): SchemaCategory {
	if (schema.isA('Person')) return 'person';
	if (schema.isA('LegalEntity')) return 'legalEntity';
	if (schema.isDocument()) return 'document';
	return 'default';
}
