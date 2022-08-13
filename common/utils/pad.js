import colors from "ansi-colors";

function strlen(txt) {
    // eslint-disable-next-line no-control-regex
    return colors.unstyle(txt).replace(/[\x00-\x1f]/g, "").length;
}

export default function pad(str, n = strlen(str), align = "<", fill = " ") {
    const l = strlen(str);
    const k = Math.max(n - l, 0);
    const T = "".padEnd(l + k, fill);
    let L = "";
    let R = "";
    switch (align) {
    case "left": case "<": { R = T.slice(0, k); break; }
    case "right": case ">": { L = T.slice(-k); break; }
    case "center": case "|": default: { L = T.slice(0, k / 2); R = T.slice(T.length - k + L.length); break; }
    }
    return `${L}${str}${R}`;
}
