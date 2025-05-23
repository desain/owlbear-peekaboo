import type { ToolContext } from "@owlbear-rodeo/sdk";
import OBR from "@owlbear-rodeo/sdk";
import broom from "../../assets/broom.svg";
import chatBubble from "../../assets/chat-bubble.svg";
import cog from "../../assets/cog.svg";
import eyeTarget from "../../assets/eye-target.svg";
import thoughtBubble from "../../assets/thought-bubble.svg";

import {
    ID_TOOL,
    ID_TOOL_ACTION_CLEANUP,
    ID_TOOL_ACTION_SETTINGS,
    ID_TOOL_ACTION_SWITCH_PRIVATE,
    ID_TOOL_MODE_VISIBILITY,
    METADATA_KEY_TOOL_MEASURE_PRIVATE,
} from "../constants";
import { openSettings } from "../popoverSettings/openSettings";
import { usePlayerStorage } from "../state/usePlayerStorage";
import { DrawCoverMode } from "./DrawCoverMode";
import { PartialCoverMode } from "./PartialCoverMode";
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
    const visibilityMode = new VisibilityMode();
    const drawCoverMode = new DrawCoverMode();
    await Promise.all([
        OBR.tool.create({
            id: ID_TOOL,
            shortcut: "Shift+V",
            icons: [
                {
                    icon: eyeTarget,
                    label: "Check Visibility",
                    filter: {
                        permissions: [
                            "POINTER_CREATE",
                            "POINTER_UPDATE",
                            "POINTER_DELETE",
                            "RULER_CREATE",
                            "RULER_UPDATE",
                            "RULER_DELETE",
                        ],
                    },
                },
            ],
            defaultMetadata: {},
            defaultMode: ID_TOOL_MODE_VISIBILITY,
        }),
        OBR.tool.createMode(visibilityMode),
        OBR.tool.createMode(
            new PartialCoverMode((clickPosition) =>
                drawCoverMode.activate(clickPosition),
            ),
        ),
        OBR.tool.createMode(drawCoverMode),
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
            onClick: () => visibilityMode.clear(false),
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
