<script lang="ts">
	import type { Entity } from '@opensanctions/followthemoney';
	import type { CardState } from './cardState.svelte';
	import { valueToString } from '../ftm/util';
	import type { NetworkState } from '../networkState.svelte';
	let {
		card,
		entity,
		network,
	}: {
		card: CardState;
		entity: Entity;
		// TODO: network is just here to get the caption. Simplify?
		network: NetworkState;
	} = $props();
</script>

<ul>
	{#each card.visibleProperties(entity) as property (property.name)}
		{const values = entity.getProperty(property)}
		{#if values.length > 0}
			{#each values as value, i (i)}
				<li class="separated-value">
					<span aria-label={property.label}>
						{#if property.type.values.size > 0}
							{property.type.values.get(valueToString(value))}
						{:else if property.type.name === 'entity'}
							{const entityId = entity
								.getProperty(property)
								.map(valueToString)[0]}
							{#if entityId}
								{network.getCaption(entityId)}
							{:else}
								Unknown reference
							{/if}
						{:else}
							{value}
						{/if}
					</span>
				</li>
			{/each}
		{/if}
	{/each}
</ul>

<style>
	ul,
	ul li {
		margin: 0;
		padding: 0;
		text-indent: 0;
		list-style-type: none;
		display: inline;
	}

	.separated-value:not(:first-of-type)::before {
		margin-left: 8px;
		margin-right: 8px;
		content: '';
		display: inline-block;
		width: 8px;
		height: 8px;
		-moz-border-radius: 4px;
		-webkit-border-radius: 4px;
		border-radius: 4px;
		background-color: var(--background-modifier-hover);
	}
</style>
