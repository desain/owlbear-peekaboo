import OBR, { MathM, type Vector2 } from "@owlbear-rodeo/sdk";
import {
    ORIGIN,
    type Position2,
    closePolygon,
    groupBy,
    toPosition,
} from "owlbear-utils";
import {
    type Vector2D,
    breakIntersections,
    computeViewport,
    convertToSegments,
} from "visibility-polygon";
import { isRaycastCircle } from "../state/raycastCoverTypes";
import { usePlayerStorage } from "../state/usePlayerStorage";
import { type Pin, getPinLocation } from "./Pin";

function tessellateArc(
    center: Vector2,
    r: number,
    startAngle: number,
    endAngle: number,
    segments: number,
) {
    const pts: Vector2D[] = [];
    const step = (endAngle - startAngle) / segments;
    for (let i = 0; i <= segments; i++) {
        const a = startAngle + step * i;
        pts.push([center.x + r * Math.cos(a), center.y + r * Math.sin(a)]);
    }
    return pts;
}

async function getViewportBounds(): Promise<
    [topLeft: Position2, bottomRight: Position2]
> {
    // Get viewport
    const [viewportHeight, viewportWidth, worldTopLeft] = await Promise.all([
        OBR.viewport.getHeight(),
        OBR.viewport.getWidth(),
        OBR.viewport.inverseTransformPoint(ORIGIN),
    ]);
    const worldBottomRight = await OBR.viewport.inverseTransformPoint({
        x: viewportWidth,
        y: viewportHeight,
    });

    return [toPosition(worldTopLeft), toPosition(worldBottomRight)];
}

function getObstacles(): [solidity: number, coords: Position2[][]][] {
    const state = usePlayerStorage.getState();

    const walls = state.walls.geometry.geometry.coordinates.map((wall) => ({
        coords: wall as Position2[],
        solidity: 1,
    }));

    const partials = [...usePlayerStorage.getState().partialCover.values()].map(
        ({ raycastCover }) => ({
            solidity: raycastCover.properties.solidity,
            coords: isRaycastCircle(raycastCover)
                ? tessellateArc(
                      MathM.decompose(raycastCover.transform).position,
                      MathM.decompose(raycastCover.transform).scale.x,
                      0,
                      2 * Math.PI,
                      10,
                  )
                : raycastCover.geometry.coordinates
                      .map((subpath) => subpath.map((wall) => wall as Vector2D))
                      .flat(),
        }),
    );

    const obstacles = [...walls, ...partials].sort(
        (a, b) => b.solidity - a.solidity,
    );

    return Object.entries(
        groupBy(obstacles, (obstacle) => obstacle.solidity),
    ).map(([solidity, coordsList]) => [
        Number(solidity),
        coordsList.map((c) => c.coords),
    ]);
}

export async function getVisibilityPolygons(
    start: Readonly<Pin>,
): Promise<
    readonly [solidity: number, visibilityPolygon: readonly Vector2D[]][]
> {
    const startPosition = toPosition(getPinLocation(start));
    const [worldTopLeft, worldBottomRight] = await getViewportBounds();

    return getObstacles().map(([solidity, coords]) => {
        // Get viewport visibility polygon
        const segments = breakIntersections(convertToSegments(coords));
        const visibilityPolygon = closePolygon(
            computeViewport(
                startPosition,
                segments,
                worldTopLeft,
                worldBottomRight,
            ),
        );
        return [solidity, visibilityPolygon] as const;
    });
}
