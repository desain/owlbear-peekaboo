import OBR from "@owlbear-rodeo/sdk";
import { assertItem } from "owlbear-utils";
import woodenFence from "../../assets/wooden-fence.svg";
import {
    DEFAULT_SOLIDITY,
    ID_CONTEXT_MENU_CONVERT,
    ID_CONTEXT_MENU_EDIT,
    METADATA_KEY_SOLIDITY,
} from "../constants";
import {
    isCover,
    isCoverCandidate,
    KEY_FILTER_COVER,
    KEY_FILTER_NON_COVER,
    KEY_FILTERS_COVER_CANDIDATES,
} from "../coverTypes";
import { usePlayerStorage } from "../state/usePlayerStorage";
import { updatePartialCoverStyle } from "../utils";

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
                    // allow selecting multiple types of cover with multiple filters
                    // so use the 'some' specifier
                    // this means that some selected items may not be cover candidates
                    some: [...filter, ...KEY_FILTER_NON_COVER],
                },
            })),
            onClick: (context) =>
                OBR.scene.items.updateItems(context.items, (items) =>
                    items.forEach((item) => {
                        if (isCoverCandidate(item) && !isCover(item)) {
                            const solidity = DEFAULT_SOLIDITY;
                            item.visible = false;
                            item.locked = true;
                            item.metadata[METADATA_KEY_SOLIDITY] = solidity;
                            assertItem(item, isCover);
                            updatePartialCoverStyle(item);
                        }
                    }),
                ),
        }),
        OBR.contextMenu.create({
            id: ID_CONTEXT_MENU_EDIT,
            icons: [
                {
                    icon: woodenFence,
                    label: "Edit Partial Cover",
                    filter: {
                        roles: ["GM"],
                        every: KEY_FILTER_COVER,
                    },
                },
            ],
            embed: {
                url: "/src/contextmenu/contextMenuEmbed.html",
                height: 100,
            },
        }),
    ]);
}

function uninstallContextMenu() {
    return Promise.all([
        OBR.contextMenu.remove(ID_CONTEXT_MENU_CONVERT),
        OBR.contextMenu.remove(ID_CONTEXT_MENU_EDIT),
    ]);
}
