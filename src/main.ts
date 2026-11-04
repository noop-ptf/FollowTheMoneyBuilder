import {
	Plugin,
	Notice,
	WorkspaceLeaf,
	type App,
	normalizePath,
} from 'obsidian';
import { DEFAULT_SETTINGS, FTMBuilderSettingTab } from './settings';
import type {
	OpenAlephCollection,
	OpenAlephInstanceSettings,
	FTMBuilderPluginSettings,
} from './types';
import { FTMBuilderView, VIEW_TYPE_FTM_BUILDER } from './view';
import {
	getCollections,
	bulkEntityUpload,
	validateEntityUpload,
} from './requests';
import type { Entity } from '@opensanctions/followthemoney';
import { ConfirmNoteModal } from './modals';
import { yamlifyEntity, writeNotes } from './noteExport';

interface ResizableSidebarSplit {
	collapsed: boolean;
	size: number;
	containerEl: HTMLElement;
	setSize(size: number): void;
	expand(): void;
	collapse(): void;
}

export default class FTMBuilderPlugin extends Plugin {
	settings!: FTMBuilderPluginSettings;

	async onload() {
		await this.loadSettings();

		this.addSettingTab(new FTMBuilderSettingTab(this.app, this));

		this.registerView(
			VIEW_TYPE_FTM_BUILDER,
			(leaf) => new FTMBuilderView(leaf, this),
		);

		this.addRibbonIcon('factory', 'Follow the Money Builder', () => {
			this.activateView().catch((err: unknown) => {
				const message =
					err instanceof Error ? err.message : String(err);
				new Notice(message);
			});
		});
	}

	async loadSettings(): Promise<void> {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			(await this.loadData()) as Partial<FTMBuilderPluginSettings>,
		);
	}

	openPluginSettings(): void {
		// This interface is not officially supported by Obsidian, so we have to
		// manually declare it here, to make TypeScript happy.
		interface AppWithSetting extends App {
			setting?: {
				open(): void;
				openTabById(id: string): void;
			};
		}

		const setting = (this.app as Partial<AppWithSetting>).setting;
		if (setting) {
			setting.open();
			setting.openTabById(this.manifest.id);
		} else {
			new Notice('Open settings manually: Ctrl/cmd + ,');
		}
	}

	async activateView(): Promise<void> {
		const { workspace } = this.app;

		let leaf: WorkspaceLeaf | null =
			workspace.getLeavesOfType(VIEW_TYPE_FTM_BUILDER)[0] ?? null;

		if (!leaf) {
			leaf = workspace.getLeftLeaf(false);
			if (!leaf) return;
			await leaf.setViewState({
				type: VIEW_TYPE_FTM_BUILDER,
				active: true,
			});
		}

		const leftSplit =
			workspace.leftSplit as unknown as ResizableSidebarSplit;

		if (leftSplit?.collapsed) {
			leftSplit.expand();
		}

		await workspace.revealLeaf(leaf);
	}

	async loadCollections(): Promise<OpenAlephCollection[]> {
		const collections = await getCollections(this.settings, this.app);
		return collections;
	}

	async bulkEntityUpload(
		entities: Entity[],
		collection: OpenAlephCollection,
	) {
		const instance = this.getInstanceSettings(collection.instanceId);
		const apiKey = this.app.secretStorage.getSecret(instance.apiKeyName);
		if (!apiKey || apiKey.trim() === '') {
			throw new Error(`API key for ${instance.instanceUrl} is empty.`);
		}
		await bulkEntityUpload(
			instance.instanceUrl,
			apiKey,
			entities,
			collection.id,
		);
	}
	async validateEntityUpload(
		entities: Entity[],
		collection: OpenAlephCollection,
	): Promise<string> {
		const instance = this.getInstanceSettings(collection.instanceId);
		const apiKey = this.app.secretStorage.getSecret(instance.apiKeyName);
		if (!apiKey || apiKey.trim() === '') {
			throw new Error(`API key for ${instance.instanceUrl} is empty.`);
		}
		return await validateEntityUpload(
			instance.instanceUrl,
			apiKey,
			entities,
			collection.name,
		);
	}

	confirmSaveEntities(
		entities: Entity[],
		collection: OpenAlephCollection | null,
	) {
		if (entities.length === 0) {
			new Notice('No valid entities found to save to vault');
			return;
		}
		const today = new Date().toISOString().slice(0, 'YYYY-MM-DD'.length);
		const instanceFolder = collection
			? new URL(
					this.getInstanceSettings(collection.instanceId).instanceUrl,
				).hostname
			: 'local_ftm_entities';
		const dataset = collection ? collection.name : today;
		const importPath = normalizePath(
			`${this.settings.importFolder}/${instanceFolder}/${dataset}`,
		);
		let exportPreview = '';
		for (const entity of entities) {
			exportPreview += yamlifyEntity(entity);
		}
		new ConfirmNoteModal(this.app, importPath, exportPreview, async () => {
			try {
				await writeNotes(entities, importPath, this.app.vault);
				// TODO: Improve this message.
				new Notice('Saved entities to vault');
			} catch (err) {
				new Notice(
					`Saving failed: ${err instanceof Error ? err.message : String(err)}`,
				);
			}
		}).open();
	}

	getInstanceSettings(id: string): OpenAlephInstanceSettings {
		// TODO: detect and invalidate stuff (collections, ...) once the settings have changed
		const instanceSettings = this.settings.instances.find(
			(instance) => instance.id === id,
		);
		if (instanceSettings === undefined) {
			throw new Error(
				`No instance settings found for id ${id}. Were they deleted in the meantime?`,
			);
		}
		return instanceSettings;
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	onunload() {
		// This is mostly relevant for hot reloading during development:
		// In order to clean up previous styles we need to actively throw
		// them away, otherwise they just pile up on every CSS change.
		document
			.querySelectorAll('head style[id^="oab-"]')
			.forEach((el) => el.remove());
	}
}
