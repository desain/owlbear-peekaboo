import type {
    CurveStyle,
    LineStyle,
    Metadata,
    ShapeStyle,
} from "@owlbear-rodeo/sdk";

const PLUGIN_ID = "com.desain.peekaboo";

// Colors
export const COLOR_PARTIAL_COVER = "#ffff00";
export const COLOR_UNBLOCKED = "#ffffff";
export const COLOR_BLOCKED = "#ff0000";
export const COLOR_BACKUP = "#ff00ff"; // should never see this
export const STYLE_PARTIAL_COVER: LineStyle | CurveStyle | ShapeStyle = {
    strokeColor: COLOR_PARTIAL_COVER,
    strokeOpacity: 1,
    strokeWidth: 10,
    strokeDash: [1, 30],
};

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
export const METADATA_KEY_IS_PEEKABOO_CONTROL = `${PLUGIN_ID}/isControl`;
export const METADATA_KEY_PERMISSIVENESS = `${PLUGIN_ID}/coverPermissiveness`;
export const METADATA_KEY_ROOM_CORNER_CONFIG = `${PLUGIN_ID}/cornerConfig`;
export const METADATA_KEY_ROOM_CHARACTER_PERMISSIVENESS = `${PLUGIN_ID}/characterPermissiveness`;
export const CONTROL_METADATA: Metadata = {
    [METADATA_KEY_IS_PEEKABOO_CONTROL]: true,
};

// Popover
export const ID_POPOVER_SETTINGS = `${PLUGIN_ID}/popoverSettings`;

// Broadcast
export const CHANNEL_MESSAGES = `${PLUGIN_ID}/messages`;

// Context menu
export const ID_CONTEXT_MENU_CONVERT = `${PLUGIN_ID}/contextMenuConvert`;
export const ID_CONTEXT_MENU_REMOVE = `${PLUGIN_ID}/contextMenuRemove`;
