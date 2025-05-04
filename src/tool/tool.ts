import type { Item, ToolContext } from "@owlbear-rodeo/sdk";
import OBR from "@owlbear-rodeo/sdk";
import broom from "../../assets/broom.svg";
import chatBubble from "../../assets/chat-bubble.svg";
import cog from "../../assets/cog.svg";
import eyeTarget from "../../assets/eye-target.svg";
import thoughtBubble from "../../assets/thought-bubble.svg";

import { getId } from "owlbear-utils";
import {
    ID_TOOL,
    ID_TOOL_ACTION_CLEANUP,
    ID_TOOL_ACTION_SETTINGS,
    ID_TOOL_ACTION_SWITCH_PRIVATE,
    ID_TOOL_MODE_VISIBILITY,
    METADATA_KEY_IS_PEEKABOO_CONTROL,
    METADATA_KEY_TOOL_MEASURE_PRIVATE,
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
            id: ID_TOOL,
            shortcut: "Shift+V",
            icons: [
                {
                    icon: eyeTarget,
                    label: "Check Visibility",
                },
            ],
            defaultMetadata: {},
            defaultMode: ID_TOOL_MODE_VISIBILITY,
        }),
        OBR.tool.createMode(new VisibilityMode()),
        OBR.tool.createAction({
            id: ID_TOOL_ACTION_SWITCH_PRIVATE,
            shortcut: "P",
            icons: [
                {
                    icon: thoughtBubble,
                    label: "Measuring privately - click to switch to public",
                    filter: {
                        activeTools: [ID_TOOL],
                        metadata: [
                            {
                                key: METADATA_KEY_TOOL_MEASURE_PRIVATE,
                                value: true,
                            },
                        ],
                    },
                },
                {
                    icon: chatBubble,
                    label: "Measuring publicly - click to switch to private",
                    filter: {
                        activeTools: [ID_TOOL],
                    },
                },
            ],
            onClick: (context: ToolContext) => {
                const newPrivate =
                    !context.metadata[METADATA_KEY_TOOL_MEASURE_PRIVATE];
                void OBR.tool.setMetadata(ID_TOOL, {
                    [METADATA_KEY_TOOL_MEASURE_PRIVATE]: newPrivate,
                });
            },
        }),
        OBR.tool.createAction({
            id: ID_TOOL_ACTION_CLEANUP,
            shortcut: "X",
            icons: [
                {
                    icon: broom,
                    label: "Clean up measurements",
                    filter: {
                        activeTools: [ID_TOOL],
                        roles: ["GM"],
                    },
                },
            ],
            onClick: async () => {
                const isPeekabooControl = (item: Item) =>
                    !!item.metadata[METADATA_KEY_IS_PEEKABOO_CONTROL];
                await Promise.all([
                    OBR.scene.local
                        .getItems(isPeekabooControl)
                        .then((items) => items.map(getId))
                        .then((ids) => OBR.scene.local.deleteItems(ids)),
                    OBR.scene.items
                        .getItems(isPeekabooControl)
                        .then((items) => items.map(getId))
                        .then((ids) => OBR.scene.items.deleteItems(ids)),
                ]);
            },
        }),
        OBR.tool.createAction({
            id: ID_TOOL_ACTION_SETTINGS,
            icons: [
                {
                    icon: cog,
                    label: "Settings",
                    filter: {
                        activeTools: [ID_TOOL],
                    },
                },
            ],
            onClick: openSettings,
        }),
    ]);
}

async function uninstallTool() {
    await OBR.tool.remove(ID_TOOL);
}
