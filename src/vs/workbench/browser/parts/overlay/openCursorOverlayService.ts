/* eslint-disable header/header */

import {
	registerSingleton,
	InstantiationType,
} from "../../../../platform/instantiation/common/extensions.js";
import { Disposable, IDisposable } from "../../../../base/common/lifecycle.js";
import { OpenCursorOverlayPart } from "./openCursorOverlayPart.js";
import {
	createDecorator,
	IInstantiationService,
} from "../../../../platform/instantiation/common/instantiation.js";
import { IEditorService } from "../../../../workbench/services/editor/common/editorService.js";
import { ITerminalService } from "../../../../workbench/contrib/terminal/browser/terminal.js";
import { CommandsRegistry } from "../../../../platform/commands/common/commands.js";

export const IPearOverlayService = createDecorator<IPearOverlayService>(
	"opencursorOverlayService",
);

export interface IPearOverlayService extends IDisposable {
	readonly _serviceBrand: undefined;

	/**
	 * Returns the OpenCursorOverlayPart instance.
	 */
	readonly openCursorOverlayPart: OpenCursorOverlayPart;

	/**
	 * Shows the OpenCursor popup.
	 */
	show(): void;

	/**
	 * Hides the OpenCursor popup.
	 */
	hide(): void;

	/**
	 * Toggles the visibility of the OpenCursor popup.
	 */
	toggle(): void;

	/**
	 * Returns true if the OpenCursor popup is visible.
	 */
	isVisible(): boolean;

	/**
	 * Locks the OpenCursor popup.
	 */
	lock(): void;

	/**
	 * Unlocks the OpenCursor popup.
	 */
	unlock(): void;

	/**
	 * Returns true if the OpenCursor popup is locked.
	 */
	isLocked(): boolean;

	/**
	 * Hides the loading overlay message.
	 */
	hideOverlayLoadingMessage(): void;

	postMessageToWebview(msg: any): Promise<boolean>;
}

export class OpenCursorOverlayService
	extends Disposable
	implements IPearOverlayService
{
	declare readonly _serviceBrand: undefined;

	private readonly _pearOverlayPart: OpenCursorOverlayPart;

	constructor(
		@IInstantiationService
		private readonly instantiationService: IInstantiationService,
		@IEditorService private readonly _editorService: IEditorService,
		@ITerminalService private readonly _terminalService: ITerminalService,
		// @ICommandService private readonly commandService: ICommandService,
	) {
		super();
		this._pearOverlayPart =
			this.instantiationService.createInstance(OpenCursorOverlayPart);
		this.registerListeners();
		this.registerCommands();
	}

	private registerListeners(): void {
		this._register(
			this._editorService.onDidActiveEditorChange(() => {
				this.hide();
			}),
		);

		this._register(
			this._terminalService.onDidFocusInstance(() => {
				this.hide();
			}),
		);
	}

	private registerCommands(): void {
		// Register commands for external use e.g. in opencursor submodule
		CommandsRegistry.registerCommand("opencursor.isOverlayVisible", (accessor) => {
			const overlayService = accessor.get(IPearOverlayService);
			return overlayService.isVisible();
		});

		CommandsRegistry.registerCommand("opencursor.showOverlay", (accessor) => {
			const overlayService = accessor.get(IPearOverlayService);
			overlayService.show();
		});

		CommandsRegistry.registerCommand("opencursor.showOverlay.feedback", (accessor) => {
			const overlayService = accessor.get(IPearOverlayService);
			overlayService.show();
			overlayService.postMessageToWebview({
				destination: "settings",
				messageType: "tab",
				messageId: "1",
				payload: {
					tab: "creator-feedback"
				}
			});
		});

		CommandsRegistry.registerCommand("opencursor.hideOverlay", (accessor) => {
			const overlayService = accessor.get(IPearOverlayService);
			overlayService.hide();
		});

		CommandsRegistry.registerCommand("opencursor.toggleOverlay", (accessor) => {
			const overlayService = accessor.get(IPearOverlayService);
			overlayService.toggle();
		});

		CommandsRegistry.registerCommand("opencursor.lockOverlay", (accessor) => {
			const overlayService = accessor.get(IPearOverlayService);
			overlayService.lock();
		});

		CommandsRegistry.registerCommand("opencursor.unlockOverlay", (accessor) => {
			const overlayService = accessor.get(IPearOverlayService);
			overlayService.unlock();
		});

		CommandsRegistry.registerCommand("opencursor.isOverlayLocked", (accessor) => {
			const overlayService = accessor.get(IPearOverlayService);
			return overlayService.isLocked();
		});

		CommandsRegistry.registerCommand("opencursor.hideOverlayLoadingMessage", (accessor) => {
			const overlayService = accessor.get(IPearOverlayService);
			overlayService.hideOverlayLoadingMessage();
		});
	}

	get openCursorOverlayPart(): OpenCursorOverlayPart {
		return this._pearOverlayPart;
	}

	show(): void {
		this._pearOverlayPart.show();
	}

	hide(): void {
		this._pearOverlayPart.hide();
	}

	hideOverlayLoadingMessage(): void {
		this._pearOverlayPart.hideOverlayLoadingMessage();
	}

	toggle(): void {
		this._pearOverlayPart.toggle();
	}

	lock(): void {
		this._pearOverlayPart.lock();
	}

	unlock(): void {
		this._pearOverlayPart.unlock();
	}

	isLocked(): boolean {
		return this._pearOverlayPart.isLocked;
	}

	override dispose(): void {
		super.dispose();
		this._pearOverlayPart.dispose();
	}

	isVisible(): boolean {
		return this._pearOverlayPart.isVisible();
	}

	postMessageToWebview(msg: { messageType: string, payload: any, messageId?: string}): Promise<boolean> {
		return this._pearOverlayPart.postMessageToWebview(msg);
	}
}

registerSingleton(
	IPearOverlayService,
	OpenCursorOverlayService,
	InstantiationType.Eager,
);
