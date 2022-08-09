import { createHash } from "crypto";

function md5(data) { return createHash("md5").update(data).digest(); }
function sha1(data) { return createHash("sha1").update(data).digest(); }

export { md5, sha1 };
