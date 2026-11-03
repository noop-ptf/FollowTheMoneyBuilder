<script
	lang="ts"
	generics="T extends { value: string; label: string; disabled?: boolean }"
>
	import { Combobox, type WithoutChildrenOrChild, mergeProps } from 'bits-ui';
	import { obsidianIcon } from './attachments';
	import { fuzzyFilter } from './fuzzy';
	import type { Snippet } from 'svelte';

	type Props = Omit<
		Combobox.RootProps,
		'items' | 'type' | 'value' | 'onValueChange'
	> & {
		value?: string;
		items?: T[];
		inputProps?: WithoutChildrenOrChild<Combobox.InputProps>;
		contentProps?: WithoutChildrenOrChild<Combobox.ContentProps>;
		onValueChange?: (value: string) => void;
		itemRow: Snippet<[T]>;
		valueIcon?: Snippet<[string | undefined]>;
	};

	let {
		items = [],
		value = $bindable(),
		open = $bindable(false),
		inputProps,
		contentProps,
		itemRow,
		valueIcon,
		...restProps
	}: Props = $props();

	let searchValue = $state('');
	let inputRef: HTMLInputElement | null = $state(null);

	const filteredItems = $derived(fuzzyFilter(items, searchValue));

	// Bits UI's Combobox.Input isn't externally bindable, so we track the
	// typed text ourselves for filtering...
	function handleInput(e: Event & { currentTarget: HTMLInputElement }) {
		searchValue = e.currentTarget.value;
	}

	// Writing this directly is a bit hacky and leads to a stale Bits UI state
	// but updating inputValue properly is much more involved and I didn't
	// want to go down that route.
	function syncDisplayValue() {
		if (inputRef) {
			inputRef.value = items.find((i) => i.value === value)?.label || '';
		}
	}

	// ...and on close without a new pick (e.g. clicking away mid-search) we
	// reset the input's DOM value directly, since that's the only way to
	// restore the display to the current selection rather than leaving the
	// abandoned search term on screen.
	function handleOpenChangeComplete(open: boolean) {
		if (open) return;
		searchValue = '';
		syncDisplayValue();
	}

	// Also sync on mount/whenever value or items change externally (e.g. a
	// sidebar re-mounting this combobox with an already-selected value) —
	// handleOpenChangeComplete alone only covers closing an interactively
	// opened popover, not a fresh mount that starts pre-selected.
	$effect(() => {
		value;
		items;
		syncDisplayValue();
	});

	function handleInputFocus(e: Event & { currentTarget: HTMLInputElement }) {
		e.currentTarget.select();
	}

	function handleInputClick() {
		open = !open;
	}

	const mergedRootProps = $derived(
		mergeProps(restProps, {
			onOpenChangeComplete: handleOpenChangeComplete,
		}),
	);
	const mergedInputProps = $derived(
		mergeProps(inputProps, {
			oninput: handleInput,
			onfocus: handleInputFocus,
			onclick: handleInputClick,
		}),
	);
</script>

<!--
Destructuring (required for bindable) and discriminated unions don't play well together,
so we cast the value to `never` to avoid type errors here. However, on the consumer
side, the component will still be type-checked correctly.
-->
<Combobox.Root
	type="single"
	{items}
	bind:value={value as never}
	bind:open
	{...mergedRootProps}
>
	<div class="control">
		{#if valueIcon}
			{@render valueIcon(value)}
		{/if}
		<Combobox.Input
			class="combobox-input"
			bind:ref={inputRef}
			{...mergedInputProps}
		/>
	</div>
	<Combobox.Portal>
		<!-- align="start" is an option to influence the Floating UI placement. -->
		<Combobox.Content class="options" align="start" {...contentProps}>
			<Combobox.ScrollUpButton>
				<span {@attach obsidianIcon('chevrons-up')}></span>
			</Combobox.ScrollUpButton>
			<Combobox.Viewport>
				{#each filteredItems as item (item.value)}
					<Combobox.Item
						value={item.value}
						label={item.label}
						disabled={item.disabled}
					>
						{#snippet children({ selected })}
							{@render itemRow(item)}
							{#if selected}<span class="check" aria-hidden="true"
									>✓</span
								>{/if}
						{/snippet}
					</Combobox.Item>
				{:else}
					<span> No results found </span>
				{/each}
			</Combobox.Viewport>
			<Combobox.ScrollDownButton>
				<span {@attach obsidianIcon('chevrons-down')}></span>
			</Combobox.ScrollDownButton>
		</Combobox.Content>
	</Combobox.Portal>
</Combobox.Root>

<style>
	.control {
		display: flex;
		align-items: center;
		gap: 0.4em;
		width: 100%;
	}

	.check {
		flex-shrink: 0;
	}

	/* Variables documented in https://bits-ui.com/docs/components/combobox#content */
	:global(.options) {
		width: var(--bits-combobox-anchor-width);
		min-width: var(--bits-combobox-anchor-width);
		max-width: var(--bits-combobox-content-available-width);
		max-height: 320px;
		box-sizing: border-box;
		margin: 0;
		padding: 6px;
		border: var(--border-width) solid var(--background-modifier-border);
		background-color: var(--suggestion-background);
		backdrop-filter: var(--suggestion-backdrop-filter);
		border-radius: var(--radius-m);
	}

	:global(.options [data-combobox-item]) {
		border-radius: var(--radius-s);
		padding: var(--size-2-3) var(--size-4-2) var(--size-2-3) var(--size-4-2);
	}

	:global(.options [data-highlighted]) {
		background-color: var(--background-modifier-hover);
	}

	:global(.combobox-input) {
		all: unset;
		flex: 1;
		min-width: 0;
	}
</style>
