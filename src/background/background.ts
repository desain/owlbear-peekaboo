import OBR from "@owlbear-rodeo/sdk";
import { deferCallAll, getId } from "owlbear-utils";
import { version } from "../../package.json";
import { installBroadcastListener } from "../broadcast/broadcast";
import { startWatchingContextMenuEnabled } from "../contextmenu/contextmenu";
import { startSyncing } from "../state/startSyncing";
import { usePlayerStorage } from "../state/usePlayerStorage";
import { isControl } from "../tool/ControlItems";
import { startWatchingToolEnabled } from "../tool/tool";

let uninstall: VoidFunction = () => {
    // nothing to uninstall by default
};

async function installExtension(): Promise<VoidFunction> {
    console.log(`Peekaboo version ${version}`);

    const [storeInitialized, stopSyncing] = startSyncing();
    await storeInitialized;
    const stopWatchingTool = await startWatchingToolEnabled();
    const stopWatchingContextMenu = await startWatchingContextMenuEnabled();
    const stopWatchingDisconnectedPlayers = startWatchingDisconnectedPlayers();
    const uninstallBroadcastListener = installBroadcastListener();

    return deferCallAll(
        () => console.log("Uninstalling Peekaboo"),
        stopSyncing,
        stopWatchingTool,
        stopWatchingContextMenu,
        stopWatchingDisconnectedPlayers,
        uninstallBroadcastListener,
    );
}

OBR.onReady(async () => {
    // console.log("onReady");

    if (await OBR.scene.isReady()) {
        // console.log("isReady");
        uninstall = await installExtension();
    }

    OBR.scene.onReadyChange(async (ready) => {
        // console.log("onReadyChange", ready);
        if (ready) {
            uninstall = await installExtension();
        } else {
            uninstall();
            uninstall = () => {
                // nothing to uninstall anymore
            };
        }
    });
});

function startWatchingDisconnectedPlayers() {
    return OBR.party.onChange(async (players) => {
        // Get other player IDs
        const playerIds = new Set(players.map((player) => player.id));
        // My player ID
        playerIds.add(usePlayerStorage.getState().playerId);

        const unownedControls = await OBR.scene.items.getItems(
            (item) => isControl(item) && !playerIds.has(item.createdUserId),
        );
        if (unownedControls.length > 0) {
            await OBR.scene.items.deleteItems(unownedControls.map(getId));
        }
    });
}
