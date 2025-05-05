import { isImage, type Image, type Item } from "@owlbear-rodeo/sdk";

export type Token = Image & {
    layer: "CHARACTER";
};
export function isToken(token: Item): token is Token {
    return isImage(token) && token.layer === "CHARACTER";
}
