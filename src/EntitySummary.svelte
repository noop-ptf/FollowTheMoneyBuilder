<script lang="ts">
	import { getCards } from './cardsContext';
	import { getCardCaption, type CardState } from './entityCard';
	let {
		card,
	}: {
		card: CardState;
	} = $props();

	const cards = getCards();

	function getCaption(entityId: string) {
		const card = cards.find((c) => c.entity?.id === entityId);
		return card ? getCardCaption(card) : '<unknown entity reference>';
	}
</script>

{#if card.entity}
	<ul>
		{#each card.addedProps as ap (ap.property.name)}
			{#if ap.values.length > 0}
				{#each ap.values as value, i (i)}
					<li class="separated-value">
						<span aria-label={ap.property.label}>
							{#if ap.property.type.values.size > 0}
								{ap.property.type.values.get(value)}
							{:else if ap.property.type.name === 'entity'}
								{getCaption(value)}
							{:else}
								{value}
							{/if}
						</span>
					</li>
				{/each}
			{/if}
		{/each}
	</ul>
{/if}

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
