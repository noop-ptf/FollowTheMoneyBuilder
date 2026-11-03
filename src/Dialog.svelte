<script lang="ts">
	import type { Snippet } from 'svelte';
	import { Dialog, type WithoutChild } from 'bits-ui';
	import { obsidianIcon } from './attachments';

	type Props = Dialog.RootProps & {
		buttonText: string;
		title: Snippet;
		description: Snippet;
		contentProps?: WithoutChild<Dialog.ContentProps>;
		// ...other component props if you wish to pass them
	};

	let {
		open = $bindable(false),
		children,
		buttonText,
		contentProps,
		title,
		description,
		...restProps
	}: Props = $props();
</script>

<Dialog.Root bind:open {...restProps}>
	<Dialog.Trigger>
		{buttonText}
	</Dialog.Trigger>
	<Dialog.Portal>
		<Dialog.Overlay class="oab-dialog-overlay" />
		<Dialog.Content class="oab-dialog-content" {...contentProps}>
			<Dialog.Title class="oab-dialog-title">
				{@render title()}
			</Dialog.Title>
			<Dialog.Description class="oab-dialog-description">
				{@render description()}
			</Dialog.Description>
			{@render children?.()}
			<Dialog.Close>
				{#snippet child({ props })}
					<button
						{...props}
						class="clickable-icon oab-dialog-close"
						aria-label="Close"
						{@attach obsidianIcon('x')}
					></button>
				{/snippet}
			</Dialog.Close>
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>

<style>
	/* Values mirror Obsidian's native .modal-bg / .modal so the dialog follows
     the active theme. Fallbacks cover themes that don't set the modal vars. */
	:global(.oab-dialog-overlay) {
		position: fixed;
		inset: 0;
		z-index: var(--layer-modal);
		background-color: var(--background-modifier-cover);
	}

	:global(.oab-dialog-content) {
		position: fixed;
		inset: 0;
		z-index: var(--layer-modal);
		margin: auto;
		width: min(60%, 700px);
		height: fit-content;
		max-height: 80%;
		display: flex;
		flex-direction: column;
		gap: var(--size-4-2);
		padding: var(--size-4-4);
		background-color: var(--modal-background, var(--background-primary));
		border: var(--modal-border-width, 1px) solid
			var(--modal-border-color, var(--background-modifier-border));
		border-radius: var(--modal-radius, var(--radius-l));
		box-shadow: var(--shadow-l);
	}

	:global(.oab-dialog-title) {
		margin: 0;
		padding-right: var(--size-4-8); /* keep clear of the close button */
		font-size: var(--font-ui-large);
		font-weight: var(--font-semibold);
	}

	:global(.oab-dialog-description) {
		margin: 0;
		color: var(--text-muted);
		font-size: var(--font-ui-small);
	}

	:global(.oab-dialog-close) {
		position: absolute;
		top: var(--size-4-2);
		right: var(--size-4-2);
	}
</style>
