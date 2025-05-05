import type { Curve, Item } from "@owlbear-rodeo/sdk";
import { isCurve } from "@owlbear-rodeo/sdk";
import type { HasParameterizedMetadata } from "owlbear-utils";
import { METADATA_KEY_CURVE_PERMISSIVENESS } from "./constants";

export type ObstructionPolygonCandidate = Curve & {
    style: {
        tension: 0;
    };
} & HasParameterizedMetadata<
        typeof METADATA_KEY_CURVE_PERMISSIVENESS,
        number | undefined
    >;
export function isObstructionPolygonCandidate(
    curve: Item,
): curve is ObstructionPolygonCandidate {
    return (
        isCurve(curve) &&
        curve.style.tension === 0 &&
        (!(METADATA_KEY_CURVE_PERMISSIVENESS in curve.metadata) ||
            typeof curve.metadata[METADATA_KEY_CURVE_PERMISSIVENESS] ===
                "number")
    );
}

export type SharpObstructionPolygon = ObstructionPolygonCandidate &
    HasParameterizedMetadata<typeof METADATA_KEY_CURVE_PERMISSIVENESS, number>;
export function isSharpObstructionPolygon(
    curve: Item,
): curve is SharpObstructionPolygon {
    return (
        isCurve(curve) &&
        curve.style.tension === 0 &&
        METADATA_KEY_CURVE_PERMISSIVENESS in curve.metadata &&
        typeof curve.metadata[METADATA_KEY_CURVE_PERMISSIVENESS] === "number"
    );
}
