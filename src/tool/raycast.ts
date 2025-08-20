import {
    Command,
    type LineCommand,
    type PathCommand,
    type Vector2,
} from "@owlbear-rodeo/sdk";
import {
    intersection,
    type Geometry,
    type MultiPolygon,
    type Polygon,
    type Position,
} from "martinez-polygon-clipping";
import { closePolygon, toPosition } from "owlbear-utils";
import { type Vector2D } from "visibility-polygon";
import { COLOR_BACKUP } from "../constants";
import { usePlayerStorage } from "../state/usePlayerStorage";
import { getPartialCoverColor } from "../utils/utils";
import { getGridCorners } from "./gridUtils";
import type { Pin } from "./Pin";
import { getPinId, getPinLocation } from "./Pin";
import { raycastSingle } from "./raycastSingle";

interface LineResult {
    /**
     * Position where the line intersected cover.
     * If there was no intersection, this equals the end position.
     */
    intersectPosition: Vector2;
    endPosition: Vector2;
    /**
     * Color of the line from the intersect to the end.
     */
    color: string;
}

export interface RaycastResult {
    startPosition: Vector2;
    labelText: string;
    highlightPathCommands: PathCommand[];
    highlightColor: string;
    lineResults: LineResult[];
}

/**
 * Compute visibility by casting rays to the corners or center of the target
 * grid cell.
 */
export function raycast(
    start: Readonly<Pin>,
    end: Readonly<Pin>,
): RaycastResult {
    const state = usePlayerStorage.getState();
    const startPosition = getPinLocation(start);
    const endPosition = getPinLocation(end);
    const originId = getPinId(start);
    const destinationId = getPinId(end);

    // Determine cast targets based on user setting
    const gridCorners = getGridCorners(endPosition, state.grid);
    const [castTargets, castCountFactor] =
        state.measureTo === "center"
            ? [[endPosition], state.getGridCornerCount()]
            : [gridCorners, 1];

    let numCastsSucceeded = 0;
    const lineResults: LineResult[] = castTargets.map((target) => {
        const [point, solidity] = raycastSingle(
            state,
            startPosition,
            target,
            originId,
            destinationId,
        );
        // Success value is the reverse of solidity - eg a line through 75% solid cover
        // counts for 25% of a line
        numCastsSucceeded += 1 - solidity;
        return {
            intersectPosition: point,
            endPosition: target,
            color: getPartialCoverColor(solidity),
        };
    });

    const cornerConfig = state.roomMetadata.cornerConfigs[
        Math.floor(numCastsSucceeded * castCountFactor)
    ] ?? {
        label: "",
        color: COLOR_BACKUP,
    };

    return {
        startPosition,
        labelText: cornerConfig.label,
        highlightColor: cornerConfig.color,
        highlightPathCommands: vector2PolygonToPath(gridCorners),
        lineResults,
    };
}

function vector2PolygonToPath(polygon: Vector2[]): PathCommand[] {
    return multiPolygonToPath([[polygon.map(toPosition)]]);
}

function multiPolygonToPath(multiPolygon: MultiPolygon): PathCommand[] {
    return multiPolygon
        .map((poly) =>
            poly.map((ring): PathCommand[] => {
                const [startX, startY] = ring[0] ?? [];
                if (startX === undefined || startY === undefined) {
                    return [];
                }

                return [
                    [Command.MOVE, startX, startY],
                    ...ring
                        .slice(1)
                        .map(([x, y]): LineCommand => [Command.LINE, x!, y!]),
                    [Command.CLOSE],
                ];
            }),
        )
        .flat(2);
}

function geometryToMultiPolygon(geo: Geometry) {
    return geo === null
        ? []
        : typeof geo[0]?.[0]?.[0] === "number"
        ? ([geo] as MultiPolygon)
        : (geo as MultiPolygon);
}

/**
 * Compute visibility by intersecting the visibility polygon with the target grid cell.
 */
export function intersectVisibility(
    start: Readonly<Pin>,
    end: Readonly<Pin>,
    visibilityPolygons: readonly [
        solidity: number,
        visibilityPolygon: readonly Vector2D[],
    ][],
): RaycastResult {
    const endPosition = getPinLocation(end);
    const state = usePlayerStorage.getState();

    // Intersect with target square
    const gridCorners = getGridCorners(endPosition, state.grid);
    const targetPoly = closePolygon(gridCorners).map(toPosition);

    interface VisibilityPolygonReduction {
        notFullyBlocked: Geometry;
        visible: Geometry;
        areaBlocked: number;
    }
    const { areaBlocked, notFullyBlocked } =
        visibilityPolygons.reduce<VisibilityPolygonReduction>(
            (
                { notFullyBlocked, visible, areaBlocked },
                [solidity, visibilityPolygon],
            ) => {
                // Skip if we've already obscured the cell
                if (visible.length === 0) {
                    return { notFullyBlocked, visible, areaBlocked };
                }

                // hack to get around the fact that the martinez library doesn't declare that it
                // consumes readonly inputs, even though it does
                type Writeable<T> = { -readonly [P in keyof T]: T[P] };
                const stillVisible =
                    intersection(
                        [
                            visibilityPolygon as Writeable<
                                typeof visibilityPolygon
                            >,
                        ],
                        visible,
                    ) ?? [];

                // check how much area the current solidity level blocks
                const areaNewlyBlocked =
                    areaOfGeometry(visible) - areaOfGeometry(stillVisible);

                return {
                    notFullyBlocked:
                        solidity === 1 ? stillVisible : notFullyBlocked,
                    visible: stillVisible,
                    areaBlocked: areaBlocked + areaNewlyBlocked * solidity,
                };
            },
            {
                notFullyBlocked: [targetPoly],
                visible: [targetPoly],
                areaBlocked: 0,
            },
        );

    const cellArea = areaOfRing(targetPoly);
    const areaVisible = cellArea - areaBlocked;
    const percentage = areaVisible / cellArea;

    const cornerConfig = state.roomMetadata.cornerConfigs[
        Math.round(percentage * state.getGridCornerCount())
    ] ?? {
        label: "",
        color: COLOR_BACKUP,
    };

    const startPosition = getPinLocation(start);
    const notFullyBlockedMultiPolygon = geometryToMultiPolygon(notFullyBlocked);
    return {
        startPosition,
        labelText: cornerConfig.label,
        highlightPathCommands:
            notFullyBlockedMultiPolygon.length === 0
                ? vector2PolygonToPath(gridCorners)
                : multiPolygonToPath(notFullyBlockedMultiPolygon),
        highlightColor: cornerConfig.color,
        lineResults: gridCorners.map((corner) => ({
            intersectPosition: startPosition,
            endPosition: corner,
            color: cornerConfig.color,
        })),
    };
}

// helpers
function areaOfRing(ring: Position[]): number {
    let sum = 0;
    for (let i = 0; i < ring.length; i++) {
        const [x1, y1] = ring[i]!;
        const [x2, y2] = ring[(i + 1) % ring.length]!;
        sum += x1! * y2! - x2! * y1!;
    }
    return Math.abs(sum) / 2;
}

function areaOfPolygon(polygon: Polygon) {
    return polygon[0]
        ? areaOfRing(polygon[0]) -
              polygon
                  .slice(1)
                  .map(areaOfRing)
                  .reduce((a, b) => a + b, 0)
        : 0;
}

function areaOfMultiPolygon(multi: MultiPolygon): number {
    return multi.reduce((acc, poly) => acc + areaOfPolygon(poly), 0);
}

function areaOfGeometry(geo: Geometry) {
    return areaOfMultiPolygon(geometryToMultiPolygon(geo));
}
