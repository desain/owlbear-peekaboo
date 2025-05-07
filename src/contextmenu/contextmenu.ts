import OBR from "@owlbear-rodeo/sdk";
import woodenFence from "../../assets/wooden-fence.svg";
import {
    ID_CONTEXT_MENU_CONVERT,
    ID_CONTEXT_MENU_REMOVE,
    METADATA_KEY_PERMISSIVENESS,
    STYLE_PARTIAL_COVER,
} from "../constants";
import {
    isCoverCandidate,
    KEY_FILTER_COVER,
    KEY_FILTER_NON_COVER,
    KEY_FILTERS_COVER_CANDIDATES,
} from "../coverTypes";
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
            icons: KEY_FILTERS_COVER_CANDIDATES.map((filter) => ({
                icon: woodenFence,
                label: "Make Partial Cover",
                filter: {
                    roles: ["GM"],
                    some: [...filter, ...KEY_FILTER_NON_COVER],
                },
            })),
            onClick: (context) =>
                OBR.scene.items.updateItems(context.items, (items) =>
                    items.filter(isCoverCandidate).forEach((item) => {
                        item.visible = false;
                        item.locked = true;
                        item.metadata[METADATA_KEY_PERMISSIVENESS] = 0.5;
                        item.style = { ...item.style, ...STYLE_PARTIAL_COVER };
                    }),
                ),
        }),
        OBR.contextMenu.create({
            id: ID_CONTEXT_MENU_REMOVE,
            icons: [
                {
                    icon: woodenFence,
                    label: "Remove Partial Cover",
                    filter: {
                        roles: ["GM"],
                        some: KEY_FILTER_COVER,
                    },
                },
            ],
            onClick: (context) =>
                OBR.scene.items.updateItems(context.items, (items) =>
                    items.filter(isCoverCandidate).forEach((item) => {
                        delete item.metadata[METADATA_KEY_PERMISSIVENESS];
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
