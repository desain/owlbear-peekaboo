import type {
    CurveStyle,
    LineStyle,
    Metadata,
    ShapeStyle,
} from "@owlbear-rodeo/sdk";

const PLUGIN_ID = "com.desain.peekaboo";

// Colors
export const COLOR_PARTIAL_OBSTRUCTION = "#ffff00"; //y ellow
export const COLOR_NO_OBSTRUCTION = "#ffffff";
export const COLOR_OBSTRUCTED = "#ff0000";
export const COLOR_BACKUP = "#ff00ff"; // should never see this
export const STYLE_OBSTRUCTION: LineStyle | CurveStyle | ShapeStyle = {
    strokeColor: COLOR_PARTIAL_OBSTRUCTION,
    strokeOpacity: 1,
    strokeWidth: 10,
    strokeDash: [1, 30],
};

// State
export const LOCAL_STORAGE_STORE_NAME = `${PLUGIN_ID}/localStorage`;

// Tool
export const ID_TOOL = `${PLUGIN_ID}/tool`;
export const ID_TOOL_MODE_VISIBILITY = `${PLUGIN_ID}/toolModeVisibility`;
export const ID_TOOL_MODE_PARTIAL_OBSTRUCTIONS = `${PLUGIN_ID}/partialObstructions`;
export const ID_TOOL_MODE_PEN = `${PLUGIN_ID}/obstructionPen`;
export const ID_TOOL_ACTION_SETTINGS = `${PLUGIN_ID}/toolActionSettings`;
export const ID_TOOL_ACTION_CLEANUP = `${PLUGIN_ID}/toolActionCleanup`;
export const ID_TOOL_ACTION_SWITCH_PRIVATE = `${PLUGIN_ID}/toolActionSwitchPrivate`;
export const METADATA_KEY_TOOL_PEN_ENABLED = `${PLUGIN_ID}/penEnabled`;

// Metadata
export const METADATA_KEY_TOOL_MEASURE_PRIVATE = `${PLUGIN_ID}/measurePrivate`;
export const METADATA_KEY_IS_PEEKABOO_CONTROL = `${PLUGIN_ID}/isControl`;
export const METADATA_KEY_CURVE_PERMISSIVENESS = `${PLUGIN_ID}/partialObstructionPermissiveness`;
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
