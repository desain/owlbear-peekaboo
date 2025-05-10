import type { BoundingBox, Image, Item, Metadata } from "@owlbear-rodeo/sdk";
import OBR, { isWall, Math2 } from "@owlbear-rodeo/sdk";
import { multiLineString } from "@turf/helpers";
import type { Feature, MultiLineString } from "geojson";
import { enableMapSet } from "immer";
import {
    getId,
    type ExtractNonFunctions,
    type GridParams,
    type GridParsed,
    type Role,
} from "owlbear-utils";
import { create } from "zustand";
import { persist, subscribeWithSelector } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import {
    DEFAULT_SOLIDITY,
    LOCAL_STORAGE_STORE_NAME,
    METADATA_KEY_ROOM_METADATA,
} from "../constants";
import { isCover } from "../coverTypes";
import { isToken } from "../Token";
import {
    boundingBoxToLineString,
    getRaycastCover,
    getWallPositions,
    type RaycastCover,
} from "./raycastCoverTypes";
import { isRoomMetadata, type RoomMetadata } from "./roomMetadata";

enableMapSet();

export type MeasureTo = "corners" | "center";
export function isMeasureTo(measureTo: unknown) {
    return measureTo === "corners" || measureTo === "center";
}

interface LocalStorage {
    readonly toolEnabled: boolean;
    readonly snapOrigin: boolean;
    /**
     * If true, right-click context menu for converting polygons is enabled.
     */
    readonly contextMenuEnabled: boolean;
    /**
     * How to measure visibility: to all corners or just the center.
     */
    readonly measureTo: MeasureTo;
    readonly setToolEnabled: (this: void, toolEnabled: boolean) => void;
    readonly setSnapOrigin: (this: void, snapOrigin: boolean) => void;
    readonly setContextMenuEnabled: (
        this: void,
        contextMenuEnabled: boolean,
    ) => void;
    readonly setMeasureTo: (this: void, measureTo: MeasureTo) => void;
}
function partializeLocalStorage({
    toolEnabled,
    snapOrigin,
    contextMenuEnabled,
    measureTo,
}: LocalStorage): ExtractNonFunctions<LocalStorage> {
    return {
        toolEnabled,
        snapOrigin,
        contextMenuEnabled,
        measureTo,
    };
}

interface OwlbearStore {
    readonly role: Role;
    readonly sceneReady: boolean;
    readonly grid: GridParsed;
    readonly characterBoundingBoxes: [id: string, box: BoundingBox][];
    readonly walls: {
        readonly lastModified: number;
        readonly lastIdSetSize: number;
        readonly geometry: Feature<MultiLineString>;
    };
    readonly partialCover: RaycastCover[];
    readonly roomMetadata: RoomMetadata;

    readonly setRole: (this: void, role: Role) => void;
    readonly setSceneReady: (this: void, sceneReady: boolean) => void;
    readonly setGrid: (this: void, grid: GridParams) => Promise<void>;
    /**
     * @returns How many corners the current grid cells have - 4 for squares
     *          and 6 for hexagons.
     */
    readonly getGridCornerCount: (this: void) => 4 | 6;
    readonly updateItems: (this: void, items: Item[]) => void;
    readonly updateLocalItems: (this: void, items: Item[]) => void;
    readonly handleRoomMetadataChange: (this: void, metadata: Metadata) => void;

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

export interface PlayerStorage extends LocalStorage, OwlbearStore {}

export const usePlayerStorage = create<PlayerStorage>()(
    subscribeWithSelector(
        persist(
            immer((set, get) => ({
                // local storage
                toolEnabled: true,
                snapOrigin: false,
                contextMenuEnabled: false,
                measureTo: "corners",
                setToolEnabled: (toolEnabled) => set({ toolEnabled }),
                setSnapOrigin: (snapOrigin) => set({ snapOrigin }),
                setContextMenuEnabled: (contextMenuEnabled) =>
                    set({ contextMenuEnabled }),
                setMeasureTo: (measureTo) => set({ measureTo }),

                // owlbear store
                role: "PLAYER",
                sceneReady: false,
                grid: {
                    dpi: -1,
                    measurement: "CHEBYSHEV",
                    type: "SQUARE",
                    parsedScale: {
                        digits: 1,
                        unit: "ft",
                        multiplier: 5,
                    },
                },
                characterBoundingBoxes: [],
                walls: {
                    lastModified: 0,
                    lastIdSetSize: 0,
                    geometry: multiLineString([]),
                },
                partialCover: [],
                roomMetadata: {
                    characterSolidity: DEFAULT_SOLIDITY,

                    cornerConfigs: [
                        {
                            label: "Full Cover",
                            color: "#c97b7b",
                        },
                        {
                            label: "3/4 Cover",
                            color: "#d1a17b",
                        },
                        {
                            label: "Half Cover",
                            color: "#d6c97b",
                        },
                        {
                            label: "No Cover",
                            color: "#a7c97b",
                        },
                        {
                            label: "No Cover",
                            color: "#7bc97b",
                        },
                        {
                            label: "No Cover",
                            color: "#64d364",
                        },
                        {
                            label: "No Cover",
                            color: "#49dd49",
                        },
                    ],
                },
                setRole: (role: Role) => set({ role }),
                setSceneReady: (sceneReady: boolean) => set({ sceneReady }),
                setGrid: async (grid: GridParams) => {
                    const parsedScale = (await OBR.scene.grid.getScale())
                        .parsed;
                    return set({
                        grid: {
                            dpi: grid.dpi,
                            measurement: grid.measurement,
                            type: grid.type,
                            parsedScale,
                        },
                    });
                },
                getGridCornerCount: () => {
                    const gridType = get().grid.type;
                    return gridType === "HEX_HORIZONTAL" ||
                        gridType === "HEX_VERTICAL"
                        ? 6
                        : 4;
                },
                updateItems: (items) =>
                    set((state) => {
                        const characterBoundingBoxes = items
                            .filter(isToken)
                            .map(
                                (item) =>
                                    [
                                        item.id,
                                        getBoundingBox(item, state.grid),
                                    ] as const,
                            );
                        const tokenPartialCover = characterBoundingBoxes.map(
                            ([id, box]) =>
                                boundingBoxToLineString(box, {
                                    characterId: id,
                                    solidity:
                                        state.roomMetadata.characterSolidity,
                                }),
                        );
                        const partialCover = items
                            .filter(isCover)
                            .map(getRaycastCover);

                        return {
                            characterBoundingBoxes,
                            partialCover: [
                                ...tokenPartialCover,
                                ...partialCover,
                            ],
                        };
                    }),
                updateLocalItems: (items) => {
                    const oldWalls = get().walls;
                    const wallItems = items.filter(isWall);
                    const lastModified = Math.max(
                        ...wallItems.map((wall) =>
                            Date.parse(wall.lastModified),
                        ),
                    );
                    const idSet = new Set<string>(wallItems.map(getId));
                    if (
                        lastModified <= oldWalls.lastModified &&
                        idSet.size === oldWalls.lastIdSetSize
                    ) {
                        return;
                    }
                    const lineStrings = wallItems.map(getWallPositions);
                    return set({
                        walls: {
                            lastModified,
                            lastIdSetSize: idSet.size,
                            geometry: multiLineString(lineStrings),
                        },
                    });
                },
                handleRoomMetadataChange: (metadata: Metadata) => {
                    const roomMetadata = metadata[METADATA_KEY_ROOM_METADATA];
                    if (isRoomMetadata(roomMetadata)) {
                        set((state) => {
                            state.roomMetadata = roomMetadata;
                            for (const partialCover of state.partialCover) {
                                if (partialCover.properties.characterId) {
                                    partialCover.properties.solidity =
                                        roomMetadata.characterSolidity;
                                }
                            }
                        });
                    }
                },
            })),
            {
                name: LOCAL_STORAGE_STORE_NAME,
                partialize: partializeLocalStorage,
            },
        ),
    ),
);

function getBoundingBox(item: Image, grid: GridParsed): BoundingBox {
    const dpiScaling = grid.dpi / item.grid.dpi;
    const width = item.image.width * item.scale.x * dpiScaling;
    if (width === -1) {
        console.error(item, grid.dpi);
    }
    const height = item.image.height * item.scale.y * dpiScaling;
    return {
        center: item.position,
        width,
        height,
        min: Math2.subtract(item.position, {
            x: width / 2,
            y: height / 2,
        }),
        max: Math2.add(item.position, {
            x: width / 2,
            y: height / 2,
        }),
    };
}
