import type { Curve, Item, KeyFilter, Line, Shape } from "@owlbear-rodeo/sdk";
import { isCurve, isLine, isShape } from "@owlbear-rodeo/sdk";
import type { HasParameterizedMetadata } from "owlbear-utils";
import {
    METADATA_KEY_IS_PEEKABOO_CONTROL,
    METADATA_KEY_OBSTRUCTION_PERMISSIVENESS,
} from "./constants";

// General obstructions
const SMOKE_AND_SPECTRE_IS_VISION_LINE = "com.battle-system.smoke/isVisionLine";

export type ObstructionCandidate = (Curve | Shape | Line) &
    HasParameterizedMetadata<
        typeof METADATA_KEY_OBSTRUCTION_PERMISSIVENESS,
        number | undefined
    > &
    HasParameterizedMetadata<
        typeof METADATA_KEY_IS_PEEKABOO_CONTROL,
        false | undefined
    > &
    HasParameterizedMetadata<
        typeof SMOKE_AND_SPECTRE_IS_VISION_LINE, // Don't allow Smoke and Spectre full obstructions to also be partial obstructions
        false | undefined
    >;

export function isObstructionCandidate(
    item: Item,
): item is ObstructionCandidate {
    return (
        (isCurve(item) || isShape(item) || isLine(item)) &&
        (!(METADATA_KEY_OBSTRUCTION_PERMISSIVENESS in item.metadata) ||
            typeof item.metadata[METADATA_KEY_OBSTRUCTION_PERMISSIVENESS] ===
                "number") &&
        (!(METADATA_KEY_IS_PEEKABOO_CONTROL in item.metadata) ||
            item.metadata[METADATA_KEY_IS_PEEKABOO_CONTROL] === false) &&
        (!(SMOKE_AND_SPECTRE_IS_VISION_LINE in item.metadata) ||
            item.metadata[SMOKE_AND_SPECTRE_IS_VISION_LINE] === false)
    );
}
const KEY_FILTER_OBSTRUCTION_CANDIDATE: KeyFilter[] = [
    {
        key: ["metadata", METADATA_KEY_IS_PEEKABOO_CONTROL],
        operator: "!=",
        value: true,
    },
    {
        key: ["metadata", SMOKE_AND_SPECTRE_IS_VISION_LINE],
        operator: "!=",
        value: true,
    },
];

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
export const KEY_FILTER_NON_OBSTRUCTION: KeyFilter[] = [
    {
        key: ["metadata", METADATA_KEY_OBSTRUCTION_PERMISSIVENESS],
        value: undefined,
    },
];
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
const KEY_FILTER_OBSTRUCTION_POLYGON_CANDIDATE: KeyFilter[] = [
    ...KEY_FILTER_OBSTRUCTION_CANDIDATE,
    {
        key: "type",
        value: "CURVE",
    },
    {
        key: ["style", "tension"],
        value: 0,
    },
];

export type ObstructionPolygon = ObstructionPolygonCandidate & Obstruction;
export function isObstructionPolygon(curve: Item): curve is ObstructionPolygon {
    return isCurve(curve) && curve.style.tension === 0 && isObstruction(curve);
}

// LINES

export type ObstructionLineCandidate = Line & ObstructionCandidate;
const KEY_FILTER_OBSTRUCTION_LINE_CANDIDATE: KeyFilter[] = [
    ...KEY_FILTER_OBSTRUCTION_CANDIDATE,
    {
        key: "type",
        value: "LINE",
    },
];

export type ObstructionLine = ObstructionLineCandidate & Obstruction;
export function isObstructionLine(line: Item): line is ObstructionLine {
    return isLine(line) && isObstruction(line);
}

// SHAPES

export type ObstructionShapeCandidate = Shape & ObstructionCandidate;
const KEY_FILTER_OBSTRUCTION_SHAPE_CANDIDATE: KeyFilter[] = [
    ...KEY_FILTER_OBSTRUCTION_CANDIDATE,
    {
        key: "type",
        value: "SHAPE",
    },
];
export type ObstructionShape = ObstructionShapeCandidate & Obstruction;
export function isObstructionShape(shape: Item): shape is ObstructionShape {
    return isShape(shape) && isObstruction(shape);
}

// Filters
export const KEY_FILTERS_OBSTRUCTION_CANDIDATES: KeyFilter[][] = [
    KEY_FILTER_OBSTRUCTION_LINE_CANDIDATE,
    KEY_FILTER_OBSTRUCTION_POLYGON_CANDIDATE,
    KEY_FILTER_OBSTRUCTION_SHAPE_CANDIDATE,
];
