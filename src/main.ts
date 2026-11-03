import { Plugin, Notice, WorkspaceLeaf, type App } from 'obsidian';
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

		this.addCommand({
			id: 'search-openaleph-instances',
			name: 'Open search view',
			callback: () => this.activateView(),
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
		try {
			const collections = await getCollections(this.settings, this.app);
			return collections;
		} catch (err: unknown) {
			const message = err instanceof Error ? err.message : String(err);
			new Notice(message);
		}
		return [];
	}

	async bulkEntityUpload(
		entities: Entity[],
		collection: OpenAlephCollection,
	) {
		await bulkEntityUpload(this.settings, this.app, entities, collection);
	}
	async validateEntityUpload(
		entities: Entity[],
		collection: OpenAlephCollection,
	): Promise<string | undefined> {
		return await validateEntityUpload(
			this.settings,
			this.app,
			entities,
			collection,
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
		let today = new Date().toISOString().slice(0, 'YYYY-MM-DD'.length);
		let instanceFolder = collection
			? new URL(
					this.getInstanceSettings(collection.instanceId).instanceUrl,
				).hostname
			: 'local_ftm_entities';
		let dataset = collection ? collection.name : today;
		let importPath = `${this.settings.importFolder}/${instanceFolder}/${dataset}`;
		let exportPreview = '';
		for (const entity of entities) {
			exportPreview += yamlifyEntity(entity);
		}
		new ConfirmNoteModal(this.app, importPath, exportPreview, () => {
			void writeNotes(entities, importPath, this);
			new Notice('Saved entities to vault');
		}).open();
	}

	getInstanceSettings(id: string): OpenAlephInstanceSettings {
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
