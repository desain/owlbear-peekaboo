import OBR, { Vector2, buildShape, buildLight } from '@owlbear-rodeo/sdk';
import { getId } from 'owlbear-utils';

export async function raycast(
    origin: Readonly<Vector2>,
    ends: ReadonlyArray<Vector2>,
): Promise<Vector2[]> {
    const dummies = ends.map(() =>
        buildShape()
            .shapeType("CIRCLE")
            .width(10)
            .height(10)
            .fillOpacity(0)
            .strokeOpacity(0)
            .strokeColor("#ffffff")
            .position(origin)
            .layer("CONTROL")
            .build(),
    );
    const lights = dummies.map((dummy) =>
        buildLight()
            .position(dummy.position)
            .attachedTo(dummy.id)
            .sourceRadius(0)
            .attenuationRadius(0)
            .build(),
    );
    await OBR.scene.local.addItems([...dummies, ...lights]);

    await OBR.scene.local.updateItems(dummies, (dummies) =>
        dummies.forEach((dummy, i) => {
            dummy.position = ends[i];
        }),
    );

    const dummiesNew = await OBR.scene.local.getItems(
        dummies.map((dummy) => dummy.id),
    );

    await OBR.scene.local.deleteItems(dummiesNew.map(getId));

    if (dummiesNew.length !== dummies.length) {
        throw new Error("Raycast dummy object deleted");
    }

    return dummiesNew.map((dummy) => dummy.position);
}
