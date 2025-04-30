import OBR from "@owlbear-rodeo/sdk";
import gear from "../../assets/gear.svg";
import logo from "../../assets/logo.svg";
import {
    TOOL_ID,
    TOOL_SETTINGS_ACTION_ID,
    TOOL_VISIBILITY_MODE_ID,
} from "../constants";
import { openSettings } from "../popoverSettings/openSettings";
import { usePlayerStorage } from "../state/usePlayerStorage";
import { VisibilityMode } from "./VisibilityMode";

export async function startWatchingToolEnabled(): Promise<VoidFunction> {
    if (usePlayerStorage.getState().toolEnabled) {
        await installTool();
    }
    return usePlayerStorage.subscribe(
        (store) => store.toolEnabled,
        async (enabled) => {
            if (enabled) {
                await installTool();
            } else {
                await uninstallTool();
            }
        },
    );
}

async function installTool() {
    await Promise.all([
        OBR.tool.create({
            id: TOOL_ID,
            shortcut: "Shift+V",
            icons: [
                {
                    icon: logo,
                    label: "Check Visibility",
                },
            ],
            defaultMetadata: {},
            defaultMode: TOOL_VISIBILITY_MODE_ID,
        }),
        OBR.tool.createMode(new VisibilityMode()),
        OBR.tool.createAction({
            id: TOOL_SETTINGS_ACTION_ID,
            icons: [
                {
                    icon: gear,
                    filter: {
                        activeTools: [TOOL_ID],
                    },
                    label: "Settings",
                },
            ],
            onClick: openSettings,
        }),
    ]);
}

async function uninstallTool() {
    await OBR.tool.remove(TOOL_ID);
}
