import type {
    Item,
    Metadata,
    Player,
    Theme,
    Vector2,
} from "@owlbear-rodeo/sdk";
import OBR, { isWall } from "@owlbear-rodeo/sdk";
import { multiLineString } from "@turf/helpers";
import { enableMapSet } from "immer";
import {
    WHITE_HEX,
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
import { isCover, type CoverCandidate } from "../coverTypes";
import { isToken } from "../Token";
import { getImageWorldPoints } from "../utils/utils";
import {
    getRaycastCover,
    getWallPositions,
    type RaycastCover,
    type RaycastLineString,
} from "./raycastCoverTypes";
import { isRoomMetadata, type RoomMetadata } from "./roomMetadata";

enableMapSet();

export type SnapTo = "disabled" | "center" | "corners";
export function isSnapTo(snapTo: unknown): snapTo is SnapTo {
    return snapTo === "disabled" || snapTo === "center" || snapTo === "corners";
}

export type MeasureTo = "corners" | "center" | "precise";
export function isMeasureTo(measureTo: unknown) {
    return (
        measureTo === "corners" ||
        measureTo === "center" ||
        measureTo === "precise"
    );
}

interface LocalStorage {
    readonly toolEnabled: boolean;
    readonly snapTo: SnapTo;
    /**
     * If true, right-click context menu for converting polygons is enabled.
     */
    readonly contextMenuEnabled: boolean;
    /**
     * How to measure visibility: to all corners or just the center.
     */
    readonly measureTo: MeasureTo;
    /**
     * Whether to hide the visibility indicator when you stop dragging with the tool.
     */
    readonly hideOnDragStop?: boolean;
    readonly setToolEnabled: (this: void, toolEnabled: boolean) => void;
    readonly setSnapTo: (this: void, snapTo: SnapTo) => void;
    readonly setContextMenuEnabled: (
        this: void,
        contextMenuEnabled: boolean,
    ) => void;
    readonly setMeasureTo: (this: void, measureTo: MeasureTo) => void;
    readonly setHideOnDragStop: (this: void, hideOnDragStop: boolean) => void;
}
function partializeLocalStorage({
    toolEnabled,
    snapTo,
    contextMenuEnabled,
    measureTo,
    hideOnDragStop,
}: LocalStorage): ExtractNonFunctions<LocalStorage> {
    return {
        toolEnabled,
        snapTo,
        contextMenuEnabled,
        measureTo,
        hideOnDragStop,
    };
}

export interface CharacterBoundingPolygon {
    id: string;
    worldPoints: Vector2[];
}

interface OwlbearStore {
    readonly role: Role;
    readonly theme: Theme;
    readonly playerId: string;
    readonly sceneReady: boolean;
    readonly grid: GridParsed;
    readonly characterBoundingPolygons: CharacterBoundingPolygon[];
    readonly walls: {
        readonly lastModified: number;
        readonly lastWallCount: number;
        readonly geometry: RaycastLineString;
    };
    /**
     * Maps item ID to partial cover data.
     */
    readonly partialCover: Map<
        CoverCandidate["id"],
        {
            lastModified: string;
            centroid: Vector2;
            raycastCover: RaycastCover;
        }
    >;
    readonly roomMetadata: RoomMetadata;

    readonly handlePlayerChange: (
        this: void,
        player: Pick<Player, "role" | "id">,
    ) => void;
    readonly handleThemeChange: (this: void, theme: Theme) => void;
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
                snapTo: "disabled",
                contextMenuEnabled: false,
                measureTo: "corners",
                setToolEnabled: (toolEnabled) => set({ toolEnabled }),
                setSnapTo: (snapTo) => set({ snapTo }),
                setContextMenuEnabled: (contextMenuEnabled) =>
                    set({ contextMenuEnabled }),
                setMeasureTo: (measureTo) => set({ measureTo }),
                setHideOnDragStop: (hideOnDragStop) => set({ hideOnDragStop }),

                // owlbear store
                role: "PLAYER",
                theme: {
                    mode: "DARK",
                    background: { default: WHITE_HEX, paper: WHITE_HEX },
                    primary: {
                        contrastText: WHITE_HEX,
                        dark: WHITE_HEX,
                        light: WHITE_HEX,
                        main: WHITE_HEX,
                    },
                    secondary: {
                        contrastText: WHITE_HEX,
                        dark: WHITE_HEX,
                        light: WHITE_HEX,
                        main: WHITE_HEX,
                    },
                    text: {
                        disabled: WHITE_HEX,
                        primary: WHITE_HEX,
                        secondary: WHITE_HEX,
                    },
                },
                playerId: "",
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
                characterBoundingPolygons: [],
                walls: {
                    lastModified: 0,
                    lastWallCount: 0,
                    geometry: multiLineString([]),
                },
                partialCover: new Map(),
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
                handlePlayerChange: (player) =>
                    set({ role: player.role, playerId: player.id }),
                handleThemeChange: (theme) => set({ theme }),
                setSceneReady: (sceneReady) => set({ sceneReady }),
                setGrid: async (grid) => {
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
                        const newCharacterBoundingPolygons: OwlbearStore["characterBoundingPolygons"] =
                            [];
                        const newPartialCover: OwlbearStore["partialCover"] =
                            new Map();

                        for (const item of items) {
                            if (isToken(item)) {
                                const worldPoints = getImageWorldPoints(
                                    item,
                                    state.grid,
                                );
                                newCharacterBoundingPolygons.push({
                                    id: item.id,
                                    worldPoints,
                                });
                            } else if (isCover(item)) {
                                const oldEntry = state.partialCover.get(
                                    item.id,
                                );
                                if (
                                    oldEntry &&
                                    item.lastModified === oldEntry.lastModified
                                ) {
                                    newPartialCover.set(item.id, oldEntry);
                                } else {
                                    const [raycastCover, centroid] =
                                        getRaycastCover(item);
                                    newPartialCover.set(item.id, {
                                        lastModified: item.lastModified,
                                        centroid,
                                        raycastCover,
                                    });
                                }
                            }
                        }
                        state.characterBoundingPolygons =
                            newCharacterBoundingPolygons;
                        state.partialCover = newPartialCover;
                    }),
                updateLocalItems: (items) => {
                    const oldWalls = get().walls;
                    const wallItems = items.filter(isWall);
                    const lastModified = Math.max(
                        ...wallItems.map((wall) =>
                            Date.parse(wall.lastModified),
                        ),
                    );
                    if (
                        lastModified <= oldWalls.lastModified &&
                        wallItems.length === oldWalls.lastWallCount
                    ) {
                        return;
                    }
                    const lineStrings = wallItems.map(getWallPositions);
                    return set({
                        walls: {
                            lastModified,
                            lastWallCount: wallItems.length,
                            geometry: multiLineString(lineStrings, {
                                solidity: 1,
                            }),
                        },
                    });
                },
                handleRoomMetadataChange: (metadata: Metadata) => {
                    const roomMetadata = metadata[METADATA_KEY_ROOM_METADATA];
                    if (isRoomMetadata(roomMetadata)) {
                        set({ roomMetadata });
                    }
                },
            })),
            {
                name: LOCAL_STORAGE_STORE_NAME,
                partialize: partializeLocalStorage,
                version: 1,
                migrate: (persistedState: any, version) => {
                    if (version < 1) {
                        persistedState.snapTo = persistedState.snapOrigin
                            ? "center"
                            : "disabled";
                        delete persistedState.snapOrigin;
                    }
                    return persistedState;
                },
            },
        ),
    ),
);
