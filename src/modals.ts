import { App, Modal } from 'obsidian';
import { mount, unmount } from 'svelte';
import EntityTypeSelectModal from './EntityTypeSelectModal.svelte';

export class ConfirmSaveModal extends Modal {
	private folderPath: string;
	private preview: string;
	private onConfirm: () => Promise<void>;

	constructor(
		app: App,
		folderPath: string,
		preview: string,
		onConfirm: () => Promise<void>,
	) {
		super(app);
		this.folderPath = folderPath;
		this.preview = preview;
		this.onConfirm = onConfirm;
	}

	override onOpen() {
		const { contentEl } = this;

		contentEl.createEl('h2', { text: 'Save entities to vault' });

		contentEl.createEl('p', {
			text: `The entities below will all be saved to your vault as separate notes in ${this.folderPath}`,
		});

		const notePreview = contentEl.createDiv({
			cls: 'ftmbuilder-note-preview-container',
		});

		const preview =
			this.preview.length > 300
				? this.preview.slice(0, 300) + '…'
				: this.preview;

		notePreview.createEl('pre', {
			text: preview,
			cls: 'ftmbuilder-note-preview',
		});

		const buttonContainer = contentEl.createDiv({
			cls: 'modal-button-container',
		});

		const confirmButton = buttonContainer.createEl('button', {
			text: 'Confirm',
			cls: 'mod-cta',
		});
		confirmButton.addEventListener('click', () => {
			this.close();
			void this.onConfirm(); // onConfirm must handle its own errors.
		});

		const cancelButton = buttonContainer.createEl('button', {
			text: 'Cancel',
		});
		cancelButton.addEventListener('click', () => {
			this.close();
		});
	}

	override onClose() {
		this.contentEl.empty();
	}
}

export class ChooseEntityTypeModal extends Modal {
	private onConfirm: (entityType?: string) => Promise<void>;
	private result: string | undefined;
	modal: ReturnType<typeof EntityTypeSelectModal> | undefined;

	constructor(app: App, onConfirm: (entityType?: string) => Promise<void>) {
		super(app);
		this.onConfirm = onConfirm;
	}

	override onOpen() {
		this.result = undefined;
		this.modal = mount(EntityTypeSelectModal, {
			target: this.contentEl,
			props: {
				onConfirm: (entityType: string) => {
					this.result = entityType;
					this.close();
				},
				onCancel: () => {
					this.close();
				},
			},
		});
	}

	override onClose() {
		if (this.modal) {
			void unmount(this.modal);
			this.modal = undefined;
		}
		if (this.result !== undefined) {
			this.onConfirm(this.result).catch((e) => console.error(e));
		}
	}
}
