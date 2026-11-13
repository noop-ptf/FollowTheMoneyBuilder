import {
	Plugin,
	Notice,
	WorkspaceLeaf,
	TFile,
	type App,
	normalizePath,
} from 'obsidian';
import { DEFAULT_SETTINGS, FTMBuilderSettingTab } from './settings';
import type {
	OpenAlephCollection,
	OpenAlephInstanceSettings,
	FTMBuilderPluginSettings,
} from './types';
import {
	FTMBuilderView,
	FTMNetworkView,
	VIEW_TYPE_FTM_BUILDER_NETWORK,
	VIEW_TYPE_FTM_BUILDER_LIST,
} from './view';
import {
	getCollections,
	bulkEntityUpload,
	validateEntityUpload,
} from './requests';
import type { Entity } from '@opensanctions/followthemoney';
import { ConfirmSaveModal } from './modals';
import { entityToFrontmatter, saveEntityNotes } from './noteExport';

interface ResizableSidebarSplit {
	collapsed: boolean;
	size: number;
	containerEl: HTMLElement;
	setSize(size: number): void;
	expand(): void;
	collapse(): void;
}

const FTM_NETWORK_EXTENSIONS = ['ftm-network'];

export default class FTMBuilderPlugin extends Plugin {
	settings!: FTMBuilderPluginSettings;

	async onload() {
		await this.loadSettings();

		this.addSettingTab(new FTMBuilderSettingTab(this.app, this));

		this.registerView(
			VIEW_TYPE_FTM_BUILDER_LIST,
			(leaf) => new FTMBuilderView(leaf, this),
		);
		this.registerView(
			VIEW_TYPE_FTM_BUILDER_NETWORK,
			(leaf) => new FTMNetworkView(leaf),
		);

		this.registerExtensions(
			FTM_NETWORK_EXTENSIONS,
			VIEW_TYPE_FTM_BUILDER_NETWORK,
		);

		this.addRibbonIcon('factory', 'Follow the Money Builder', () => {
			this.activateEntityListView().catch((err: unknown) => {
				const message =
					err instanceof Error ? err.message : String(err);
				new Notice(message);
			});
		});

		this.addRibbonIcon('workflow', 'Create new FtM Network', () => {
			this.createNetworkView().catch((err: unknown) => {
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

	async activateEntityListView(): Promise<void> {
		const { workspace } = this.app;

		let leaf: WorkspaceLeaf | null =
			workspace.getLeavesOfType(VIEW_TYPE_FTM_BUILDER_LIST)[0] ?? null;

		if (!leaf) {
			leaf = workspace.getLeftLeaf(false);
			if (!leaf) return;
			await leaf.setViewState({
				type: VIEW_TYPE_FTM_BUILDER_LIST,
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

	// Creates a new ftm-network file, similarly to "Create new canvas"
	async createNetworkView(): Promise<void> {
		const file = await this.createUntitledFile();
		if (!file) {
			return;
		}
		const leaf = this.app.workspace.getLeaf(false);
		await leaf.setViewState({
			type: VIEW_TYPE_FTM_BUILDER_NETWORK,
			active: true,
			state: { file: file.path },
		});
	}

	async createUntitledFile(): Promise<TFile | null> {
		try {
			let path = normalizePath(`Untitled.${FTM_NETWORK_EXTENSIONS[0]}`);
			for (let n = 2; this.app.vault.getAbstractFileByPath(path); n++)
				path = normalizePath(
					`Untitled ${n}.${FTM_NETWORK_EXTENSIONS[0]}`,
				);
			const initialContent = '';
			return await this.app.vault.create(path, initialContent);
		} catch (e) {
			new Notice(
				`FtM Builder: could not create the FtM network (${(e as Error).message})`,
			);
			return null;
		}
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
			: 'local_entities';
		const dataset = collection ? collection.name : today;
		const targetPath = normalizePath(
			`${this.settings.entityFolder}/${instanceFolder}/${dataset}`,
		);
		let notesPreview = '';
		for (const entity of entities) {
			notesPreview += entityToFrontmatter(entity);
		}
		new ConfirmSaveModal(this.app, targetPath, notesPreview, async () => {
			try {
				await saveEntityNotes(entities, targetPath, this.app.vault);
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
			.querySelectorAll('head style[id^="ftmbuilder-"]')
			.forEach((el) => el.remove());
	}
}
