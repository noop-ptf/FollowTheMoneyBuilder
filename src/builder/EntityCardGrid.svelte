<script lang="ts">
	import { Notice } from 'obsidian';
	import type { Entity } from '@opensanctions/followthemoney';
	import { obsidianIcon } from '../lib/attachments';
	import type { OpenAlephCollection } from '../types';
	import type { BuilderState } from './builderState.svelte';
	import EntityCard from './EntityCard.svelte';
	import CollectionSelector from './CollectionSelector.svelte';

	let {
		loadCollections,
		bulkEntityUpload,
		validateEntityUpload,
		confirmSaveEntities,
		getInstanceName,
		openPluginSettings,
		chooseEntityType,
		createFTMNetwork,
		openFTMNetwork,
		builderState,
	}: {
		loadCollections: () => Promise<OpenAlephCollection[]>;
		bulkEntityUpload: (
			entities: Entity[],
			collection: OpenAlephCollection,
		) => Promise<void>;
		validateEntityUpload: (
			entities: Entity[],
			collection: OpenAlephCollection,
		) => Promise<string>;
		confirmSaveEntities: (
			entities: Entity[],
			collection: OpenAlephCollection | null,
		) => void;
		getInstanceName: (id: string) => string | undefined;
		openPluginSettings: () => void;
		chooseEntityType: () => Promise<string | undefined>;
		createFTMNetwork: () => Promise<void>;
		openFTMNetwork: () => void;
		builderState: BuilderState;
	} = $props();

	const entities = $derived(builderState.network?.entities);
	const cards = $derived(builderState.cards);

	async function addCard() {
		const type = await chooseEntityType();
		if (type === undefined) return;
		const network = builderState.network;
		if (network === undefined) return;
		const entityId = await network.addEntityByType(type);
		if (builderState.ui) {
			builderState.ui.focusedEntity = entityId;
		}
	}

	function removeEntity(id: string) {
		builderState.network?.removeEntity(id);
		builderState.ui?.forget(id);
	}

	let selectedCollection: OpenAlephCollection | null = $state(null);

	async function postEntitiesToSelectedCollection() {
		// Copy to prevent a race condition if these reactive
		// values are changing during a (longer running) upload.
		const collection = selectedCollection;
		if (entities === undefined) return;
		const entitiesToUpload = entities;
		const numEntities = entitiesToUpload?.length || 0;
		const numEntitiesLabel = `${numEntities} ${numEntities > 1 ? 'entities' : 'entity'}`;
		if (!collection || uploadRunning) {
			return;
		}
		uploadRunning = true;
		try {
			new Notice(`Uploading ${numEntitiesLabel} to ${collection.label}`);
			await bulkEntityUpload(entitiesToUpload, collection);
			new Notice(`Uploaded ${numEntitiesLabel} to ${collection.label}`);
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err);
			new Notice(`Upload failed: ${message}`);
		} finally {
			uploadRunning = false;
		}
	}

	function saveEntitiesToVault() {
		if (entities) confirmSaveEntities(entities, selectedCollection);
	}

	let validationReport = $derived.by((): string | undefined => {
		entities;
		selectedCollection;
		// Unset this value as stale, whenever entities or selectedCollection changes
		return undefined;
	});
	async function validateUploadSelectedCollection() {
		// Copy to prevent a race condition if these reactive
		// values are changing during a (longer running) validation.
		const collection = selectedCollection;
		if (entities === undefined) return;
		const entitiesToValidate = entities;
		if (!collection || validationRunning) {
			return;
		}
		validationRunning = true;
		try {
			new Notice(`Validating entities in ${collection.label}`);
			validationReport = await validateEntityUpload(
				entitiesToValidate,
				collection,
			);
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err);
			const note = `Validation failed: ${message}`;
			new Notice(note);
			validationReport = note;
		} finally {
			validationRunning = false;
		}
	}

	let uploadRunning = $state(false);
	let validationRunning = $state(false);
</script>

<h3>
	Entities<span
		class="info-hover"
		aria-label="Edit the entity details of the currently active FtM Network here"
		{@attach obsidianIcon('info')}
	></span>
</h3>
{#if builderState.network && builderState.ui}
	<p>Showing entities for {builderState.networkFilename}</p>
	<div class="entities">
		{#each cards as card (card.entityId)}
			<EntityCard
				{card}
				entity={builderState.network.getEntity(card.entityId)}
				network={builderState.network}
				ui={builderState.ui}
				onRemove={() => removeEntity(card.entityId)}
			/>
		{/each}

		<button
			type="button"
			class="card ghost"
			onclick={addCard}
			aria-label="Add entity"
		>
			<span class="plus" aria-hidden="true">+</span>
			<span>Add entity</span>
		</button>
	</div>
{:else}
	<button class="mod-cta" onclick={createFTMNetwork}
		>Create FtM Network</button
	>
	<button onclick={openFTMNetwork}>Open FtM Network</button>
{/if}
<h3>
	Investigation<span
		class="info-hover"
		aria-label="Select to which OpenAleph investigation the entities will go"
		{@attach obsidianIcon('info')}
	></span>
</h3>
<CollectionSelector
	{loadCollections}
	{getInstanceName}
	{openPluginSettings}
	bind:selectedCollection
/>
<h3>
	Save or upload<span
		class="info-hover"
		aria-label="Save the entities to your vault or upload them to OpenAleph"
		{@attach obsidianIcon('info')}
	></span>
</h3>
{#if !entities?.length}
	<p>Create an entity to upload or save.</p>
{:else}
	<div class="actions">
		<button class="mod-cta" onclick={saveEntitiesToVault}
			>Save {entities?.length || 0}
			{entities?.length === 1 ? 'entity' : 'entities'} to this vault</button
		>
		{#if !selectedCollection}
			<p>Select an investigation to upload entities.</p>
		{:else}
			<button
				class="mod-cta"
				onclick={postEntitiesToSelectedCollection}
				disabled={uploadRunning}
				>Upload {entities?.length || 0}
				{entities?.length === 1 ? 'entity' : 'entities'} to OpenAleph</button
			>
			<button
				onclick={validateUploadSelectedCollection}
				disabled={validationRunning}>Validate upload</button
			>
			{#if validationReport}
				<pre class="report">{validationReport}</pre>
			{/if}
		{/if}
	</div>
{/if}

<style>
	h3:not(:first-child) {
		margin-top: 48px;
	}
	.entities {
		display: flex;
		flex-direction: column;
		justify-items: stretch;
		gap: 12px;
		margin-block: 12px;
	}

	.card.ghost {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		min-height: 120px;
		gap: 0.3em;
		border-radius: 8px;
		border: 2px dashed rgba(127, 127, 127, 0.4);
		background: transparent;
		box-shadow: none;
		opacity: 0.6;
		margin-inline: 0;
	}

	.card.ghost:hover,
	.card.ghost:focus-visible {
		opacity: 1;
		border-color: var(--text-muted);
	}

	.card.ghost .plus {
		font-size: 1.8em;
		line-height: 1;
	}
	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}
	.report {
		white-space: pre-wrap; /* keep newlines and indentation, but wrap long lines */
		overflow-wrap: anywhere; /* break very long tokens like IDs or URLs */
		max-width: 100%;
		margin: 16px;
	}
	.info-hover {
		padding-left: 8px;
		color: var(--icon-color);
	}
</style>
