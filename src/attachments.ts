import { setIcon } from 'obsidian';
import type { Attachment } from 'svelte/attachments';

export const obsidianIcon =
	(name: string): Attachment<HTMLElement> =>
	(node) => {
		setIcon(node, name);
	};
