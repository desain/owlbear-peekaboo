import type { Metadata } from "@owlbear-rodeo/sdk";

const PLUGIN_ID = "com.desain.peekaboo";

export const DEFAULT_SOLIDITY = 0.5;
export const SOLIDITY_NO_COVER = 0;
export const SOLIDITY_FULL_COVER = 1;

// Colors
export const COLOR_BACKUP = "#ff00ff"; // should never see this

// State
export const LOCAL_STORAGE_STORE_NAME = `${PLUGIN_ID}/localStorage`;

// Tool
export const ID_TOOL = `${PLUGIN_ID}/tool`;
export const ID_TOOL_MODE_VISIBILITY = `${PLUGIN_ID}/toolModeVisibility`;
export const ID_TOOL_MODE_PARTIAL_COVER = `${PLUGIN_ID}/partialCover`;
export const ID_TOOL_MODE_PEN = `${PLUGIN_ID}/coverPen`;
export const ID_TOOL_ACTION_SETTINGS = `${PLUGIN_ID}/toolActionSettings`;
export const ID_TOOL_ACTION_CLEANUP = `${PLUGIN_ID}/toolActionCleanup`;
export const ID_TOOL_ACTION_SWITCH_PRIVATE = `${PLUGIN_ID}/toolActionSwitchPrivate`;
export const METADATA_KEY_TOOL_PEN_ENABLED = `${PLUGIN_ID}/penEnabled`;

// Metadata
export const METADATA_KEY_TOOL_MEASURE_PRIVATE = `${PLUGIN_ID}/measurePrivate`;
export const METADATA_KEY_IS_CONTROL = `${PLUGIN_ID}/isControl`;
export const METADATA_KEY_SOLIDITY = `${PLUGIN_ID}/coverSolidity`;
export const METADATA_KEY_ROOM_METADATA = `${PLUGIN_ID}/roomMetadata`;
export const CONTROL_METADATA: Metadata = {
    [METADATA_KEY_IS_CONTROL]: true,
};

// Popover
export const ID_POPOVER_SETTINGS = `${PLUGIN_ID}/popoverSettings`;

// Broadcast
export const CHANNEL_MESSAGES = `${PLUGIN_ID}/messages`;

// Context menu
export const ID_CONTEXT_MENU_CONVERT = `${PLUGIN_ID}/contextMenuConvert`;
export const ID_CONTEXT_MENU_EDIT = `${PLUGIN_ID}/contextMenuEdit`;
