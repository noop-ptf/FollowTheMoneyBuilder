import { ItemView, Notice, TextFileView, WorkspaceLeaf } from 'obsidian';
import { mount, unmount } from 'svelte';
import FTMBuilderPlugin from './main';
import EntityCardGrid from './EntityCardGrid.svelte';
import type { Entity } from '@opensanctions/followthemoney';
import type { OpenAlephCollection } from './types';
import FTMNetworkDiagram from './FTMNetworkDiagram.svelte';
import { NetworkState, type PersistedCard } from './networkState.svelte';
import type { CardState } from './entityCard';

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
				addToNetwork: (card: CardState) => this.addToNetwork(card),
			},
		});
	}

	async addToNetwork(card: CardState) {
		const leaf = this.app.workspace.getLeavesOfType(
			VIEW_TYPE_FTM_BUILDER_NETWORK,
		)[0];
		// TODO: Maybe instead call revealLeaf? https://docs.obsidian.md/plugins/guides/defer-views
		await leaf?.loadIfDeferred();
		const view = leaf?.view;
		if (view && view instanceof FTMNetworkView) {
			// TODO: where to actually put the serialization?
			// Or should we rather send the plain Entity?
			const persistedCard = {
				key: card.key,
				entity: card.entity?.toJSON(),
			};
			view.addCardFromExternal(persistedCard);
		} else {
			new Notice('No FtM Network found to transfer the entity to');
		}
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
	private component: ReturnType<typeof FTMNetworkDiagram> | undefined;
	private network: NetworkState = new NetworkState();

	constructor(leaf: WorkspaceLeaf) {
		super(leaf);
	}

	getIcon(): string {
		return 'workflow';
	}

	getDisplayText(): string {
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

	addCardFromExternal(persistedCard: PersistedCard) {
		this.network.addCardFromExternal(persistedCard);
	}

	async onOpen(): Promise<void> {
		this.component = mount(FTMNetworkDiagram, {
			target: this.contentEl,
			props: {
				network: this.network,
				onChange: () => this.requestSave(),
			},
		});
	}

	async onClose(): Promise<void> {
		if (this.component) {
			await unmount(this.component);
			this.component = undefined;
		}
	}

	clear(): void {
		this.network.load('');
	}

	getViewType(): string {
		return VIEW_TYPE_FTM_BUILDER_NETWORK;
	}
}
