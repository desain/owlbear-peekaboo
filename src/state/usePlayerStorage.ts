import type { BoundingBox, Image, Item, Wall } from "@owlbear-rodeo/sdk";
import OBR, { isImage, isWall, Math2 } from "@owlbear-rodeo/sdk";
import {
    booleanClockwise,
    featureCollection,
    lineString,
    polygon,
} from "@turf/turf";
import type {
    Feature,
    FeatureCollection,
    LineString,
    Polygon,
    Position,
} from "geojson";
import { enableMapSet } from "immer";
import {
    getId,
    type ExtractNonFunctions,
    type GridParams,
    type GridParsed,
} from "owlbear-utils";
import { create } from "zustand";
import { persist, subscribeWithSelector } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import { LOCAL_STORAGE_STORE_NAME } from "../constants";

enableMapSet();

function wallToFeature(wall: Wall): Feature<Polygon | LineString> {
    const coords: Position[] = wall.points.map((pt) => [pt.x, pt.y]);
    if (coords.length < 2) {
        throw new Error("Invalid wall: " + JSON.stringify(coords));
    } else if (
        coords[0][0] !== coords[coords.length - 1][0] ||
        coords[0][1] !== coords[coords.length - 1][1]
    ) {
        // Wall doesn't end where it began, it's a line
        return lineString(coords);
    } else {
        // Wall does end where it began, it's a polygon
        if (!booleanClockwise(coords)) {
            // Turf polygons must be counterclockwise. But the Turf Y axis
            // points up, whereas the OBR Y axis points down, so we want the OBR
            // polygon to point clockwise.
            coords.reverse();
        }
        return polygon([coords]);
    }
}

interface LocalStorage {
    readonly toolEnabled: boolean;
    readonly snapOrigin: boolean;
    /**
     * What label to show based on how many corners are visible.
     */
    readonly cornerLabels: Partial<Record<number, string>>;
    /**
     * What color to show based on how many corners are visible.
     */
    readonly cornerColors: Partial<Record<number, string>>;
    setToolEnabled(this: void, toolEnabled: boolean): void;
    setSnapOrigin(this: void, snapOrigin: boolean): void;
    setCornerLabel(this: void, index: number, value: string): void;
    setCornerColor(this: void, index: number, value: string): void;
}
function partializeLocalStorage({
    toolEnabled,
    snapOrigin,
    cornerLabels,
    cornerColors,
}: LocalStorage): ExtractNonFunctions<LocalStorage> {
    return { toolEnabled, snapOrigin, cornerLabels, cornerColors };
}

interface OwlbearStore {
    sceneReady: boolean;
    grid: GridParsed;
    characterBoundingBoxes: [id: string, box: BoundingBox][];
    walls: {
        lastModified: number;
        lastIdSet: Set<string>;
        geometry: FeatureCollection<Polygon | LineString>;
    };
    setSceneReady: (this: void, sceneReady: boolean) => void;
    setGrid: (this: void, grid: GridParams) => Promise<void>;
    getGridCorners: (this: void) => number;
    updateItems: (this: void, items: Item[]) => void;
    updateLocalItems: (this: void, items: Item[]) => void;

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
                cornerLabels: [
                    "Full Cover",
                    "3/4 Cover",
                    "Half Cover",
                    "No Cover",
                    "No Cover",
                ],
                cornerColors: [
                    "#c97b7b",
                    "#d1a17b",
                    "#d6c97b",
                    "#a7c97b",
                    "#7bc97b",
                    "#64d364",
                    "#49dd49",
                ],
                setToolEnabled: (toolEnabled) => set({ toolEnabled }),
                setSnapOrigin: (snapOrigin) => set({ snapOrigin }),
                setCornerLabel: (index, value) =>
                    set((state) => {
                        state.cornerLabels[index] = value;
                    }),
                setCornerColor: (index, value) =>
                    set((state) => {
                        state.cornerColors[index] = value;
                    }),

                // owlbear store
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
                    lastIdSet: new Set(),
                    geometry: featureCollection([]),
                },
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
                getGridCorners: () => {
                    const gridType = get().grid.type;
                    return gridType === "HEX_HORIZONTAL" ||
                        gridType === "HEX_VERTICAL"
                        ? 6
                        : 4;
                },
                updateItems: (items) =>
                    set((state) => ({
                        characterBoundingBoxes: items
                            .filter(isImage)
                            .filter((item) => item.layer === "CHARACTER")
                            .map((item) => [
                                item.id,
                                getBoundingBox(item, state.grid),
                            ]),
                    })),
                updateLocalItems: (items) => {
                    const oldWalls = get().walls;
                    const wallItems = items.filter(isWall);
                    // .filter((wall) => wall.blocking); // Smoke and Spectre turns this off for GM pass
                    const lastModified = Math.max(
                        ...wallItems.map((wall) =>
                            Date.parse(wall.lastModified),
                        ),
                    );
                    const idSet = new Set<string>(wallItems.map(getId));
                    if (
                        lastModified <= oldWalls.lastModified &&
                        idSet.size === oldWalls.lastIdSet.size
                    ) {
                        return;
                    }
                    const features = wallItems.map(wallToFeature);
                    return set({
                        walls: {
                            lastModified,
                            lastIdSet: idSet,
                            geometry: featureCollection(features),
                        },
                    });
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
