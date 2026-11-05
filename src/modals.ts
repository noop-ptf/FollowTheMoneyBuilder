import { App, Modal } from 'obsidian';

export class ConfirmNoteModal extends Modal {
	private notePath: string;
	private noteText: string;
	private onConfirm: () => Promise<void>;

	constructor(
		app: App,
		notePath: string,
		noteText: string,
		onConfirm: () => Promise<void>,
	) {
		super(app);
		this.notePath = notePath;
		this.noteText = noteText;
		this.onConfirm = onConfirm;
	}

	onOpen() {
		const { contentEl } = this;

		contentEl.createEl('h2', { text: 'Confirm entity import' });

		contentEl.createEl('p', {
			text: `The entities below will all be saved to your vault as a note to ${this.notePath}`,
		});

		const notePreview = contentEl.createDiv({
			cls: 'ftmbuilder-note-preview-container',
		});

		const preview =
			this.noteText.length > 300
				? this.noteText.slice(0, 300) + '…'
				: this.noteText;

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
