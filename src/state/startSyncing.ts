import OBR from "@owlbear-rodeo/sdk";
import { deferCallAll, startRehydrating } from "owlbear-utils";
import { usePlayerStorage } from "./usePlayerStorage";

const sceneReady = new Promise<void>((resolve) => {
    OBR.onReady(async () => {
        if (await OBR.scene.isReady()) {
            resolve();
        } else {
            const unsubscribe = OBR.scene.onReadyChange((ready) => {
                if (ready) {
                    unsubscribe();
                    resolve();
                }
            });
        }
    });
});

/**
 * @returns [Promise that resolves once store has initialized, function to stop syncing]
 */
export function startSyncing(): [
    initialized: Promise<void>,
    unsubscribe: VoidFunction,
] {
    // console.log("startSyncing");
    const store = usePlayerStorage.getState();

    const roleInitialized = OBR.player.getRole().then(store.setRole);
    const unsubscribePlayer = OBR.player.onChange((player) =>
        store.setRole(player.role),
    );

    const sceneReadyInitialized = OBR.scene.isReady().then(store.setSceneReady);
    const unsubscribeSceneReady = OBR.scene.onReadyChange((ready) => {
        store.setSceneReady(ready);
    });

    const gridInitialized = sceneReady
        .then(() =>
            Promise.all([
                OBR.scene.grid.getDpi(),
                OBR.scene.grid.getMeasurement(),
                OBR.scene.grid.getType(),
            ]),
        )
        .then(([dpi, measurement, type]) =>
            store.setGrid({ dpi, measurement, type }),
        );
    const unsubscribeGrid = OBR.scene.grid.onChange(store.setGrid);

    const itemsInitialized = gridInitialized
        .then(() => OBR.scene.items.getItems())
        .then(store.updateItems);
    const unsubscribeItems = OBR.scene.items.onChange(store.updateItems);

    const localItemsInitialized = OBR.scene.local
        .getItems()
        .then(store.updateLocalItems);
    const unsubscribeLocalItems = OBR.scene.local.onChange(
        store.updateLocalItems,
    );

    const roomMetadataInitialized = OBR.room
        .getMetadata()
        .then(store.handleRoomMetadataChange);
    const unsubscribeRoomMetadata = OBR.room.onMetadataChange(
        store.handleRoomMetadataChange,
    );

    const uninstallStorageHandler = startRehydrating(usePlayerStorage);

    return [
        Promise.all([
            roleInitialized,
            sceneReadyInitialized,
            gridInitialized,
            itemsInitialized,
            localItemsInitialized,
            roomMetadataInitialized,
        ]).then(() => void 0),
        deferCallAll(
            unsubscribePlayer,
            unsubscribeSceneReady,
            unsubscribeGrid,
            unsubscribeItems,
            unsubscribeLocalItems,
            unsubscribeRoomMetadata,
            uninstallStorageHandler,
        ),
    ];
}
