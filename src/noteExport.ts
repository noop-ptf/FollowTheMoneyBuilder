import { stringifyYaml, Vault } from 'obsidian';
import type { Entity } from '@opensanctions/followthemoney';
import { valueToString } from './ftm';

export function yamlifyEntity(entity: Entity): string {
	const flatEntity: Record<string, string | string[]> = {
		schema: entity.schema.name,
		id: entity.id,
	};
	for (const property of entity.getProperties()) {
		const strings = entity.getProperty(property).map(valueToString);
		flatEntity[property.name] =
			strings.length === 1 ? (strings[0] ?? '') : strings;
	}
	return `---\n${stringifyYaml(flatEntity)}---\n`;
}

export async function writeNotes(
	entities: Entity[],
	path: string,
	vault: Vault,
): Promise<void> {
	if (!vault.getFolderByPath(path)) {
		await vault.createFolder(path);
	}
	for (const entity of entities) {
		if (!entity.id) {
			continue;
		}
		const filePath = `${path}/${entity.id}.md`;
		const fileContent = yamlifyEntity(entity);

		const existingFile = vault.getFileByPath(filePath);
		if (existingFile) {
			await vault.modify(existingFile, fileContent);
		} else {
			await vault.create(filePath, fileContent);
		}
	}
}
