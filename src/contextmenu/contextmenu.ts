import OBR from "@owlbear-rodeo/sdk";
import woodenFence from "../../assets/wooden-fence.svg";
import {
    ID_CONTEXT_MENU_CONVERT,
    ID_CONTEXT_MENU_REMOVE,
    METADATA_KEY_CURVE_PERMISSIVENESS,
    STYLE_OBSTRUCTION,
} from "../constants";
import {
    isObstructionCandidate,
    KEY_FILTER_NON_OBSTRUCTION,
    KEY_FILTER_OBSTRUCTION,
    KEY_FILTERS_OBSTRUCTION_CANDIDATES,
} from "../obstructions";
import { usePlayerStorage } from "../state/usePlayerStorage";

export async function startWatchingContextMenuEnabled(): Promise<VoidFunction> {
    if (usePlayerStorage.getState().contextMenuEnabled) {
        await installContextMenu();
    }
    return usePlayerStorage.subscribe(
        (store) => store.contextMenuEnabled,
        async (enabled) => {
            if (enabled) {
                await installContextMenu();
            } else {
                await uninstallContextMenu();
            }
        },
    );
}

function installContextMenu() {
    return Promise.all([
        OBR.contextMenu.create({
            id: ID_CONTEXT_MENU_CONVERT,
            icons: KEY_FILTERS_OBSTRUCTION_CANDIDATES.map((filter) => ({
                icon: woodenFence,
                label: "Make Partial Obstruction",
                filter: {
                    some: [...filter, ...KEY_FILTER_NON_OBSTRUCTION],
                },
            })),
            onClick: (context) =>
                OBR.scene.items.updateItems(context.items, (items) =>
                    items.filter(isObstructionCandidate).forEach((item) => {
                        item.visible = false;
                        item.locked = true;
                        item.metadata[METADATA_KEY_CURVE_PERMISSIVENESS] = 0.5;
                        item.style = { ...item.style, ...STYLE_OBSTRUCTION };
                    }),
                ),
        }),
        OBR.contextMenu.create({
            id: ID_CONTEXT_MENU_REMOVE,
            icons: [
                {
                    icon: woodenFence,
                    label: "Remove Partial Obstruction",
                    filter: {
                        some: KEY_FILTER_OBSTRUCTION,
                    },
                },
            ],
            onClick: (context) =>
                OBR.scene.items.updateItems(context.items, (items) =>
                    items.filter(isObstructionCandidate).forEach((item) => {
                        delete item.metadata[METADATA_KEY_CURVE_PERMISSIVENESS];
                    }),
                ),
        }),
    ]);
}

function uninstallContextMenu() {
    return Promise.all([
        OBR.contextMenu.remove(ID_CONTEXT_MENU_CONVERT),
        OBR.contextMenu.remove(ID_CONTEXT_MENU_REMOVE),
    ]);
}
