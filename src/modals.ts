import { App, Modal } from 'obsidian';

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

	onOpen() {
		const { contentEl } = this;

		contentEl.createEl('h2', { text: 'Save entities to vault' });

		contentEl.createEl('p', {
			text: `The entities below will all be saved to your vault as separate notes to ${this.folderPath}`,
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

	onClose() {
		this.contentEl.empty();
	}
}
