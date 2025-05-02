import OBR, { BoundingBox, Vector2 } from "@owlbear-rodeo/sdk";

export function boundingBoxContains(
    point: Vector2,
    boundingBox: Pick<BoundingBox, "min" | "max">,
): boolean {
    return (
        point.x >= boundingBox.min.x &&
        point.x <= boundingBox.max.x &&
        point.y >= boundingBox.min.y &&
        point.y <= boundingBox.max.y
    );
}

export function vector2Equals(a: Vector2, b: Vector2) {
    return a.x === b.x && a.y === b.y;
}

export async function snapToCenter(pos: Vector2): Promise<Vector2> {
    return OBR.scene.grid.snapPosition(pos, 1.0, false, true);
}

export const CANCEL_SYMBOL = Symbol("cancel");
export function createGetCheckCancel(): () => VoidFunction {
    let seq: number = 0;
    return () => {
        seq++;
        const mySeq = seq;
        return () => {
            if (mySeq !== seq) {
                // using symbol for checking cancel
                // eslint-disable-next-line @typescript-eslint/only-throw-error
                throw CANCEL_SYMBOL;
            }
        };
    };
}
export const NOT_CANCELLABLE: VoidFunction = () => {};

if (import.meta.vitest) {
    const { describe, it, expect } = import.meta.vitest;

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
}
