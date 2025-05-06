import OBR from "@owlbear-rodeo/sdk";
import woodenFence from "../../assets/wooden-fence.svg";
import {
    ID_CONTEXT_MENU_CONVERT,
    ID_CONTEXT_MENU_REMOVE,
    METADATA_KEY_CURVE_PERMISSIVENESS,
} from "../constants";
import {
    KEY_FILTER_NON_OBSTRUCTION_POLYGON,
    KEY_FILTER_OBSTRUCTION_POLYGON,
} from "../SharpObstructionPolygon";
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
            icons: [
                {
                    icon: woodenFence,
                    label: "Make Partial Obstruction",
                    filter: {
                        every: KEY_FILTER_NON_OBSTRUCTION_POLYGON,
                    },
                },
            ],
            onClick: (context) =>
                OBR.scene.items.updateItems(context.items, (items) =>
                    items.forEach((item) => {
                        item.metadata[METADATA_KEY_CURVE_PERMISSIVENESS] = 0.5;
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
                        every: KEY_FILTER_OBSTRUCTION_POLYGON,
                    },
                },
            ],
            onClick: (context) =>
                OBR.scene.items.updateItems(context.items, (items) =>
                    items.forEach((item) => {
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
