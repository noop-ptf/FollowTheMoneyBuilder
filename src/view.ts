import { ItemView, TextFileView, WorkspaceLeaf } from 'obsidian';
import { mount, unmount } from 'svelte';
import FTMBuilderPlugin from './main';
import EntityCardGrid from './EntityCardGrid.svelte';
import type { Entity } from '@opensanctions/followthemoney';
import type { OpenAlephCollection } from './types';
import FTMNetworkDiagram from './FTMNetworkDiagram.svelte';

export const VIEW_TYPE_FTM_BUILDER_LIST = 'followthemoney-builder-list-view';
export const VIEW_TYPE_FTM_BUILDER_NETWORK =
	'followthemoney-builder-network-view';

export class FTMBuilderView extends ItemView {
	grid: ReturnType<typeof EntityCardGrid> | undefined;
	private plugin: FTMBuilderPlugin;

	constructor(leaf: WorkspaceLeaf, plugin: FTMBuilderPlugin) {
		super(leaf);
		this.plugin = plugin;
	}

	getViewType(): string {
		return VIEW_TYPE_FTM_BUILDER_LIST;
	}

	getDisplayText(): string {
		return 'Follow the Money Builder';
	}

	getIcon(): string {
		return 'factory';
	}

	async onOpen(): Promise<void> {
		this.grid = mount(EntityCardGrid, {
			target: this.contentEl,
			props: {
				loadCollections: () => this.plugin.loadCollections(),
				bulkEntityUpload: (
					entities: Entity[],
					collection: OpenAlephCollection,
				) => this.plugin.bulkEntityUpload(entities, collection),
				validateEntityUpload: (
					entities: Entity[],
					collection: OpenAlephCollection,
				) => this.plugin.validateEntityUpload(entities, collection),
				confirmSaveEntities: (
					entities: Entity[],
					collection: OpenAlephCollection | null,
				) => this.plugin.confirmSaveEntities(entities, collection),
				getInstanceName: (id: string) =>
					this.plugin.settings.instances.find(
						(instance) => instance.id === id,
					)?.name,
				openPluginSettings: () => this.plugin.openPluginSettings(),
			},
		});
	}

	async onClose(): Promise<void> {
		if (this.grid) {
			// Remove the EntityCardGrid from the ItemView.
			await unmount(this.grid);
			this.grid = undefined;
		}
	}
}

export class FTMNetworkView extends TextFileView {
	private network: ReturnType<typeof FTMNetworkDiagram> | undefined;

	constructor(leaf: WorkspaceLeaf) {
		super(leaf);
	}

	getIcon(): string {
		return 'workflow';
	}

	getDisplayText(): string {
		return this.file ? this.file.basename : 'FtM Network';
	}

	getViewData(): string {
		return this.data;
	}

	setViewData(data: string, _clear: boolean): void {
		this.data = data;
	}

	async onOpen(): Promise<void> {
		this.network = mount(FTMNetworkDiagram, {
			target: this.contentEl,
			props: {},
		});
	}

	async onClose(): Promise<void> {
		if (this.network) {
			// Remove the EntityCardGrid from the ItemView.
			await unmount(this.network);
			this.network = undefined;
		}
	}

	clear(): void {
		this.data = '';
	}

	getViewType(): string {
		return VIEW_TYPE_FTM_BUILDER_NETWORK;
	}
}
