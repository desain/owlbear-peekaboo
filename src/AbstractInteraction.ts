import OBR, { Item } from "@owlbear-rodeo/sdk";
import { ItemApi } from "owlbear-utils";

/**
 * Type that abstracts over a network interaction or a local item interaction
 */
export type AbstractInteraction<Items> = {
    update: (updater: (value: Items) => void) => Promise<Items>;
    keepAndStop: (toReAdd: ReadonlyArray<Item>) => Promise<void>;
    itemApi: ItemApi;
};

export async function wrapRealInteraction<Items extends Item[]>(
    ...items: Readonly<Items>
): Promise<AbstractInteraction<Items>> {
    // eslint false positive
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const [update, stop] = await OBR.interaction.startItemInteraction<Items>(
        items,
    );
    return {
        update: (updater: (items: Items) => void) => {
            type Updater = Parameters<typeof update>[0];
            // eslint false positive
            // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
            const newItems: Items = update(updater as Updater); // SAFETY: Updater is intended to work on drafts
            return Promise.resolve(newItems);
        },
        keepAndStop: async (items: ReadonlyArray<Item>) => {
            await OBR.scene.items.addItems(items as Item[]); // SAFETY: OBR.scene.items.addItems does not mutate the argument, so casting to mutable is fine
            // eslint false positive
            // eslint-disable-next-line @typescript-eslint/no-unsafe-call
            stop();
        },
        itemApi: OBR.scene.items,
    };
}

export async function createLocalInteraction<Items extends Item[]>(
    ...items: Readonly<Items>
): Promise<AbstractInteraction<Items>> {
    const ids = items.map((item) => item.id);
    const existingIds = (await OBR.scene.local.getItems(ids)).map(
        (item) => item.id,
    );
    const newItems = items.filter((item) => !existingIds.includes(item.id));
    await OBR.scene.local.addItems(newItems);
    return {
        update: async (updater: (items: Items) => void) => {
            await OBR.scene.local.updateItems(
                ids,
                (items) => updater(items as unknown as Items), // SAFETY: items to update will always be the interaction items
            );
            return OBR.scene.local.getItems(ids) as unknown as Promise<Items>; // SAFETY: retrieved items will always be the interaction items
        },
        keepAndStop: async (items: ReadonlyArray<Item>) => {
            const idsToKeep = items.map((item) => item.id);
            const toDelete = newItems
                .map((item) => item.id)
                .filter((id) => !idsToKeep.includes(id));
            await OBR.scene.local.deleteItems(toDelete);
        },
        itemApi: OBR.scene.local,
    };
}
