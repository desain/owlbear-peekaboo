import type { Curve, Item, KeyFilter, Line, Shape } from "@owlbear-rodeo/sdk";
import { isCurve, isLine, isShape } from "@owlbear-rodeo/sdk";
import type { HasParameterizedMetadata } from "owlbear-utils";
import { METADATA_KEY_CURVE_PERMISSIVENESS as METADATA_KEY_OBSTRUCTION_PERMISSIVENESS } from "./constants";

export type ObstructionCandidate = (Curve | Shape | Line) &
    HasParameterizedMetadata<
        typeof METADATA_KEY_OBSTRUCTION_PERMISSIVENESS,
        number | undefined
    >;

export function isObstructionCandidate(
    item: Item,
): item is ObstructionCandidate {
    return (
        (isCurve(item) || isShape(item) || isLine(item)) &&
        (!(METADATA_KEY_OBSTRUCTION_PERMISSIVENESS in item.metadata) ||
            typeof item.metadata[METADATA_KEY_OBSTRUCTION_PERMISSIVENESS] ===
                "number")
    );
}

export type Obstruction = ObstructionCandidate &
    HasParameterizedMetadata<
        typeof METADATA_KEY_OBSTRUCTION_PERMISSIVENESS,
        number
    >;

export function isObstruction(item: Item): item is Obstruction {
    return (
        isObstructionCandidate(item) &&
        METADATA_KEY_OBSTRUCTION_PERMISSIVENESS in item.metadata &&
        typeof item.metadata[METADATA_KEY_OBSTRUCTION_PERMISSIVENESS] ===
            "number"
    );
}

export const KEY_FILTER_OBSTRUCTION: KeyFilter[] = [
    {
        key: ["metadata", METADATA_KEY_OBSTRUCTION_PERMISSIVENESS],
        operator: "!=",
        value: undefined,
    },
];

// POLYGONS

export type ObstructionPolygonCandidate = Curve & {
    style: {
        tension: 0;
    };
} & ObstructionCandidate;
export const KEY_FILTER_OBSTRUCTION_POLYGON_CANDIDATE: KeyFilter[] = [
    {
        key: "type",
        value: "CURVE",
    },
    {
        key: ["style", "tension"],
        value: 0,
    },
];
export const KEY_FILTER_NON_OBSTRUCTION_POLYGON: KeyFilter[] = [
    ...KEY_FILTER_OBSTRUCTION_POLYGON_CANDIDATE,
    {
        key: ["metadata", METADATA_KEY_OBSTRUCTION_PERMISSIVENESS],
        value: undefined,
    },
];

export type ObstructionPolygon = ObstructionPolygonCandidate & Obstruction;
export function isObstructionPolygon(curve: Item): curve is ObstructionPolygon {
    return isCurve(curve) && curve.style.tension === 0 && isObstruction(curve);
}
export const KEY_FILTER_OBSTRUCTION_POLYGON: KeyFilter[] = [
    ...KEY_FILTER_OBSTRUCTION_POLYGON_CANDIDATE,
    {
        key: ["metadata", METADATA_KEY_OBSTRUCTION_PERMISSIVENESS],
        operator: "!=",
        value: undefined,
    },
];

// LINES

export type ObstructionLineCandidate = Line & ObstructionCandidate;
export function isObstructionLineCandidate(
    line: Item,
): line is ObstructionLineCandidate {
    return (
        isLine(line) &&
        (!(METADATA_KEY_OBSTRUCTION_PERMISSIVENESS in line.metadata) ||
            typeof line.metadata[METADATA_KEY_OBSTRUCTION_PERMISSIVENESS] ===
                "number")
    );
}
export const KEY_FILTER_OBSTRUCTION_LINE_CANDIDATE: KeyFilter[] = [
    {
        key: "type",
        value: "LINE",
    },
];
export const KEY_FILTER_NON_OBSTRUCTION_LINE: KeyFilter[] = [
    ...KEY_FILTER_OBSTRUCTION_LINE_CANDIDATE,
    {
        key: ["metadata", METADATA_KEY_OBSTRUCTION_PERMISSIVENESS],
        value: undefined,
    },
];

export type ObstructionLine = ObstructionLineCandidate & Obstruction;
export function isObstructionLine(line: Item): line is ObstructionLine {
    return isLine(line) && isObstruction(line);
}
export const KEY_FILTER_OBSTRUCTION_LINE: KeyFilter[] = [
    ...KEY_FILTER_OBSTRUCTION_LINE_CANDIDATE,
    {
        key: ["metadata", METADATA_KEY_OBSTRUCTION_PERMISSIVENESS],
        operator: "!=",
        value: undefined,
    },
];
