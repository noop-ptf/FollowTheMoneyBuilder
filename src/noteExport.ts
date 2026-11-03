import { stringifyYaml } from 'obsidian';
import FTMBuilderPlugin from './main';
import type { Entity } from '@opensanctions/followthemoney';
import { valueToString } from './ftm';

export function yamlifyEntity(entity: Entity): string {
	if (!entity.schema) {
	}
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
	plugin: FTMBuilderPlugin,
): Promise<void> {
	for (const entity of entities) {
		if (!entity.id) {
			continue;
		}
		const filePath = `${path}/${entity.id}.md`;
		const fileContent = yamlifyEntity(entity);

		plugin.app.vault.createFolder(path).catch(() => {
			// folder already exists, ignore
		});

		const existingFile = plugin.app.vault.getFileByPath(filePath);
		existingFile
			? await plugin.app.vault
					.modify(existingFile, fileContent)
					.then(() => existingFile)
			: await plugin.app.vault.create(filePath, fileContent);
	}
}
