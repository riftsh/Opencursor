/* eslint-disable header/header */

import {
	registerAction2,
	Action2,
} from "../../../../platform/actions/common/actions.js";
import { ServicesAccessor } from "../../../../platform/instantiation/common/instantiation.js";
import { IPearOverlayService } from "./openCursorOverlayService.js";
import { KeyCode, KeyMod } from "../../../../base/common/keyCodes.js";
import { IStorageService } from "../../../../platform/storage/common/storage.js";
import { OPENCURSOR_FIRST_LAUNCH_KEY } from "./common.js";
import {
	INotificationService,
	Severity,
} from "../../../../platform/notification/common/notification.js";
import { ICommandService } from "../../../../platform/commands/common/commands.js";
// import { OpenCursorVisibleContext } from "../../../common/contextkeys.js";

export class ClosePearOverlayAction extends Action2 {
	static readonly ID = "workbench.action.closeOpencursor";

	constructor() {
		super({
			id: ClosePearOverlayAction.ID,
			title: { value: "Close OpenCursor Popup", original: "Close OpenCursor Popup" },
			f1: true,
			keybinding: {
				weight: 200,
				primary: KeyCode.Escape,
				// when: OpenCursorVisibleContext.negate(),
			},
		});
	}

	run(accessor: ServicesAccessor): void {
		const opencursorOverlayService = accessor.get(IPearOverlayService);
		opencursorOverlayService.hide();
	}
}

export class TogglePearOverlayAction extends Action2 {
	static readonly ID = "workbench.action.toggleOpencursor";

	constructor() {
		super({
			id: TogglePearOverlayAction.ID,
			title: {
				value: "Toggle OpenCursor Popup",
				original: "Toggle OpenCursor Popup",
			},
			f1: true,
			keybinding: {
				weight: 200,
				primary: KeyMod.CtrlCmd | KeyCode.KeyE,
			},
		});
	}

	run(accessor: ServicesAccessor): void {
		const opencursorOverlayService = accessor.get(IPearOverlayService);
		opencursorOverlayService.toggle();
	}
}

export class MarkOpenCursorFirstLaunchCompleteAction extends Action2 {
	static readonly ID = "workbench.action.markOpenCursorFirstLaunchComplete";

	constructor() {
		super({
			id: MarkOpenCursorFirstLaunchCompleteAction.ID,
			title: {
				value: "Mark OpenCursor First Launch Key Complete",
				original: "Mark OpenCursor First Launch Key Complete",
			},
			f1: true,
		});
	}

	run(accessor: ServicesAccessor): void {
		const storageService = accessor.get(IStorageService);
		storageService.store(OPENCURSOR_FIRST_LAUNCH_KEY, true, 0, 0);
		// const notificationService = accessor.get(INotificationService);
		// const commandService = accessor.get(ICommandService);  // Get command service early
		// notificationService.notify({
		// 	severity: Severity.Info,
		// 	message: 'Successfully marked OpenCursor first launch Key complete',
		// 	actions: {
		// 		primary: [{
		// 			id: 'reloadWindow',
		// 			label: 'Reload Window',
		// 			tooltip: 'Reload Window',
		// 			class: '',
		// 			enabled: true,
		// 			run: () => {
		// 				commandService.executeCommand('workbench.action.reloadWindow');
		// 			}
		// 		}]
		// 	}
		// });
	}
}

export class ResetOpenCursorFirstLaunchKeyAction extends Action2 {
	static readonly ID = "workbench.action.resetOpenCursorFirstLaunchKey";

	constructor() {
		super({
			id: ResetOpenCursorFirstLaunchKeyAction.ID,
			title: {
				value: "Reset OpenCursor First Launch Key",
				original: "Reset OpenCursor First Launch Key",
			},
			f1: true,
		});
	}

	run(accessor: ServicesAccessor): void {
		const storageService = accessor.get(IStorageService);
		const notificationService = accessor.get(INotificationService);
		const commandService = accessor.get(ICommandService); // Get command service early

		storageService.store(OPENCURSOR_FIRST_LAUNCH_KEY, false, 0, 0);
		notificationService.notify({
			severity: Severity.Info,
			message: "Successfully reset OpenCursor first launch Key",
			actions: {
				primary: [
					{
						id: "reloadWindow",
						label: "Reload Window",
						tooltip: "Reload Window",
						class: "",
						enabled: true,
						run: () => {
							commandService.executeCommand("workbench.action.reloadWindow");
						},
					},
				],
			},
		});
	}
}

export class IsOpenCursorFirstLaunchAction extends Action2 {
	static readonly ID = "workbench.action.isOpenCursorFirstLaunch";

	constructor() {
		super({
			id: IsOpenCursorFirstLaunchAction.ID,
			title: {
				value: "Is OpenCursor First Launch",
				original: "Is OpenCursor First Launch",
			},
			f1: true,
		});
	}

	run(accessor: ServicesAccessor): boolean | undefined {
		const storageService = accessor.get(IStorageService);
		return !storageService.getBoolean(OPENCURSOR_FIRST_LAUNCH_KEY, 0);
	}
}

registerAction2(TogglePearOverlayAction);
registerAction2(ClosePearOverlayAction);

registerAction2(MarkOpenCursorFirstLaunchCompleteAction);
registerAction2(ResetOpenCursorFirstLaunchKeyAction);
registerAction2(IsOpenCursorFirstLaunchAction);
