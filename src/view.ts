import { ItemView, Notice, TextFileView, TFile, WorkspaceLeaf } from 'obsidian';
import { mount, unmount } from 'svelte';
import FTMBuilderPlugin from './main';
import EntityCardGrid from './EntityCardGrid.svelte';
import type { Entity } from '@opensanctions/followthemoney';
import type { OpenAlephCollection } from './types';
import FTMNetworkDiagram from './FTMNetworkDiagram.svelte';
import { NetworkState } from './networkState.svelte';

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

	override getIcon(): string {
		return 'factory';
	}

	override async onOpen(): Promise<void> {
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
				chooseEntityType: () => this.plugin.chooseEntityType(),
				createFTMNetwork: () => this.plugin.createNetwork(),
				openFTMNetwork: () => this.plugin.openNetwork(),
				builderState: this.plugin.builderState,
			},
		});
	}

	override async onClose(): Promise<void> {
		if (this.grid) {
			// Remove the EntityCardGrid from the ItemView.
			await unmount(this.grid);
			this.grid = undefined;
		}
	}
}

export class FTMNetworkView extends TextFileView {
	network: NetworkState = new NetworkState(() => this.requestSave());
	private component: ReturnType<typeof FTMNetworkDiagram> | undefined;
	private plugin: FTMBuilderPlugin;

	constructor(leaf: WorkspaceLeaf, plugin: FTMBuilderPlugin) {
		super(leaf);
		this.plugin = plugin;
	}

	getViewType(): string {
		return VIEW_TYPE_FTM_BUILDER_NETWORK;
	}

	override getIcon(): string {
		return 'workflow';
	}

	override getDisplayText(): string {
		return this.file ? this.file.basename : 'FtM Network';
	}

	// The data to save to the file before closing it
	getViewData(): string {
		return this.network.serialize();
	}

	// Sets the data loaded from the file after opening it
	setViewData(data: string, _clear: boolean): void {
		this.network.load(data);
	}

	override async onOpen(): Promise<void> {
		this.component = mount(FTMNetworkDiagram, {
			target: this.contentEl,
			props: {
				network: this.network,
				onChange: () => this.requestSave(),
				openEntityBuilder: () => {
					this.plugin
						.activateEntityListView()
						.catch((err: unknown) => {
							const message =
								err instanceof Error
									? err.message
									: String(err);
							new Notice(message);
						});
				},
				chooseEntityType: () => this.plugin.chooseEntityType(),
			},
		});
	}

	override async onLoadFile(file: TFile): Promise<void> {
		await super.onLoadFile(file);
		if (!this.plugin.builderState.networkView) {
			this.plugin.builderState.attach(this);
		}
	}

	override async onUnloadFile(file: TFile): Promise<void> {
		await super.onUnloadFile(file);
		this.plugin.builderState.detach(this);
	}

	override async onRename(file: TFile): Promise<void> {
		await super.onRename(file);
		this.plugin.builderState.rename(this);
	}

	override async onClose(): Promise<void> {
		this.plugin.builderState.detach(this);
		if (this.component) {
			await unmount(this.component);
			this.component = undefined;
		}
	}

	clear(): void {
		this.network.load('');
	}
}
