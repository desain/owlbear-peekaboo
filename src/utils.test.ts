import type { BoundingBox } from "@owlbear-rodeo/sdk";
import { describe, expect, it } from "vitest";
import { boundingBoxContains } from "./utils";

describe("boundingBoxContains", () => {
    const TEST_BOX: BoundingBox = {
        min: { x: 0, y: 0 },
        max: { x: 2, y: 2 },
        width: 2,
        height: 2,
        center: { x: 1, y: 1 },
    };

    it("should report inside when inside", () => {
        const result = boundingBoxContains({ x: 1, y: 1 }, TEST_BOX);
        expect(result).toEqual(true);
    });

    it("should report outside when outside", () => {
        const result = boundingBoxContains({ x: 5, y: -2 }, TEST_BOX);
        expect(result).toEqual(false);
    });
});
