import { dirname, join, normalize } from "path";
import { fileURLToPath } from "url";

const ROOT = normalize(join(dirname(fileURLToPath(import.meta.url)), ".."));

export {
    // eslint-disable-next-line import/prefer-default-export
    ROOT,
};
