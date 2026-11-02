import { ItemView, WorkspaceLeaf } from 'obsidian';
import { mount, unmount } from 'svelte';
import FTMBuilderPlugin from './main';
import EntityCardGrid from './EntityCardGrid.svelte';
import type { Entity } from '@opensanctions/followthemoney';
import type { OpenAlephCollection } from './types';

export const VIEW_TYPE_FTM_BUILDER = 'followthemoney-builder-view';

export class FTMBuilderView extends ItemView {
	grid: ReturnType<typeof EntityCardGrid> | undefined;
	private plugin: FTMBuilderPlugin;

	constructor(leaf: WorkspaceLeaf, plugin: FTMBuilderPlugin) {
		super(leaf);
		this.plugin = plugin;
	}

	getViewType(): string {
		return VIEW_TYPE_FTM_BUILDER;
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
				getInstanceSettings: (id: string) =>
					this.plugin.getInstanceSettings(id),
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
