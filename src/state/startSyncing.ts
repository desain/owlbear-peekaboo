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
    const {
        handlePlayerChange,
        handleRoomMetadataChange,
        handleThemeChange,
        setSceneReady,
        updateLocalItems,
        setGrid,
        updateItems,
    } = usePlayerStorage.getState();

    const playerInitialized = Promise.all([
        OBR.player.getId(),
        OBR.player.getRole(),
    ]).then(([id, role]) => handlePlayerChange({ id, role }));
    const unsubscribePlayer = OBR.player.onChange(handlePlayerChange);

    const sceneReadyInitialized = OBR.scene.isReady().then(setSceneReady);
    const unsubscribeSceneReady = OBR.scene.onReadyChange((ready) => {
        setSceneReady(ready);
    });

    const themeInitialized = OBR.theme.getTheme().then(handleThemeChange);
    const unsubscribeTheme = OBR.theme.onChange(handleThemeChange);

    const gridInitialized = sceneReady
        .then(() =>
            Promise.all([
                OBR.scene.grid.getDpi(),
                OBR.scene.grid.getMeasurement(),
                OBR.scene.grid.getType(),
            ]),
        )
        .then(([dpi, measurement, type]) =>
            setGrid({ dpi, measurement, type }),
        );
    const unsubscribeGrid = OBR.scene.grid.onChange(setGrid);

    const itemsInitialized = gridInitialized
        .then(() => OBR.scene.items.getItems())
        .then(updateItems);
    const unsubscribeItems = OBR.scene.items.onChange(updateItems);

    const localItemsInitialized = OBR.scene.local
        .getItems()
        .then(updateLocalItems);
    const unsubscribeLocalItems = OBR.scene.local.onChange(updateLocalItems);

    const roomMetadataInitialized = OBR.room
        .getMetadata()
        .then(handleRoomMetadataChange);
    const unsubscribeRoomMetadata = OBR.room.onMetadataChange(
        handleRoomMetadataChange,
    );

    const uninstallStorageHandler = startRehydrating(usePlayerStorage);

    return [
        Promise.all([
            playerInitialized,
            sceneReadyInitialized,
            themeInitialized,
            gridInitialized,
            itemsInitialized,
            localItemsInitialized,
            roomMetadataInitialized,
        ]).then(() => void 0),
        deferCallAll(
            unsubscribePlayer,
            unsubscribeSceneReady,
            unsubscribeTheme,
            unsubscribeGrid,
            unsubscribeItems,
            unsubscribeLocalItems,
            unsubscribeRoomMetadata,
            uninstallStorageHandler,
        ),
    ];
}
