import OBR from "@owlbear-rodeo/sdk";
import { enableMapSet } from "immer";
import { create } from "zustand";
import { persist, subscribeWithSelector } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import { LOCAL_STORAGE_STORE_NAME } from "../constants";

enableMapSet();

const SET_SENSIBLE = Symbol("SetSensible");

const ObrSceneReady = new Promise<void>((resolve) => {
    OBR.onReady(async () => {
        if (await OBR.scene.isReady()) {
            resolve();
        } else {
            const unsubscribeScene = OBR.scene.onReadyChange((ready) => {
                if (ready) {
                    unsubscribeScene();
                    resolve();
                }
            });
        }
    });
});

/**
 * @returns Default values for persisted local storage that depend on an OBR scene.
 */
async function fetchDefaults(): Promise<null> {
    await ObrSceneReady;
    return null;
}

interface LocalStorage {
    readonly hasSensibleValues: boolean;
    readonly toolEnabled: boolean;
    readonly contextMenuEnabled: boolean;
    [SET_SENSIBLE](this: void): void;
    setToolEnabled(this: void, toolEnabled: boolean): void;
    setContextMenuEnabled(this: void, contextMenuEnabled: boolean): void;
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyFunction = (this: void, ...args: any[]) => unknown;
type ExtractNonFunctions<T> = {
    [K in keyof T as T[K] extends AnyFunction ? never : K]: T[K];
};
function partializeLocalStorage({
    hasSensibleValues,
    toolEnabled,
    contextMenuEnabled,
}: LocalStorage): ExtractNonFunctions<LocalStorage> {
    return { hasSensibleValues, toolEnabled, contextMenuEnabled };
}

interface OwlbearStore {
    sceneReady: boolean;
    setSceneReady: (sceneReady: boolean) => void;

    /*
    Notes on mirroring metadata:

    https://discord.com/channels/795808973743194152/1082460044731371591/1110879213348737057
    Player metadata isn't saved between refreshes

    Below is some of the technical differences between types of metadata.

    Networking:
    The metadata for a scene or scene item uses a CRDT so it is network resilient.
    The metadata for a player uses a simple CRDT but can only be updated by one person at a time so collisions aren't a concern there.
    Room metadata doesn't use any network resiliency and is last writer wins. Which is why it is generally meant for small values with very low frequency updates.

    Size:
    Metadata for a scene uses the users storage quota.
    Each individual update to the scene and player metadata is limited by the max update size (64kb).
    The room metadata has a max size of 16kB shared across all extensions.

    Other Differences:
    Updates to the scene metadata are added to the undo stack of the user. This means a Ctrl+Z will undo changes made.
    Player metadata is per connection. This means that refreshing the page will reset the metadata}

    Tool metadata is stored in localStorage so all the limitations of that apply.
    This also means that there is no networking in tool metadata and it will be erased if the user clears their cache.
    */
}

export const usePlayerStorage = create<LocalStorage & OwlbearStore>()(
    subscribeWithSelector(
        persist(
            immer((set) => ({
                // local storage
                hasSensibleValues: false,
                toolEnabled: false,
                contextMenuEnabled: false,
                [SET_SENSIBLE]: () => set({ hasSensibleValues: true }),
                setToolEnabled: (toolEnabled) => set({ toolEnabled }),
                setContextMenuEnabled: (contextMenuEnabled) =>
                    set({ contextMenuEnabled }),

                // owlbear store
                sceneReady: false,
                setSceneReady: (sceneReady: boolean) => set({ sceneReady }),
            })),
            {
                name: LOCAL_STORAGE_STORE_NAME,
                partialize: partializeLocalStorage,
                onRehydrateStorage() {
                    return (state, error) => {
                        if (state) {
                            if (!state.hasSensibleValues) {
                                void fetchDefaults().then(() => {
                                    state[SET_SENSIBLE]();
                                });
                            }
                        } else if (error) {
                            console.error(
                                "Error hydrating player settings store",
                                error,
                            );
                        }
                    };
                },
            },
        ),
    ),
);
