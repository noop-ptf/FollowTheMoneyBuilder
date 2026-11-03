import { setIcon } from 'obsidian';
import type { Attachment } from 'svelte/attachments';

export function obsidianIcon(name: string): Attachment<HTMLElement> {
	return (node) => {
		setIcon(node, name);
	};
}

export function focusOnMount(
	value: string | undefined,
): Attachment<HTMLElement> {
	return (node) => {
		if (value) return;
		node.focus();
	};
}
