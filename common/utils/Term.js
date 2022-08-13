/* eslint-disable max-classes-per-file */
import ansiColors from "ansi-colors";

import Callable from "./Callable.js";
import { stdout, stderr } from "./Writer.js";
import pad from "./pad.js";

class Term extends Callable {
    // eslint-disable-next-line class-methods-use-this
    #transform = (x) => x;
    #colors = ansiColors.noop;

    constructor(colors = ansiColors.noop, transform = (x) => x) {
        super((...args) => this.format(...args));

        this.#colors = colors;
        this.#transform = transform;
    }

    log(...args) { return this.write(stdout, ...args); }
    logln(...args) { return this.writeln(stdout, ...args); }
    error(...args) { return this.write(stderr, ...args); }
    errorln(...args) { return this.writeln(stderr, ...args); }

    format(...args) {
        const str = Buffer.concat(args.map((arg) => Buffer.from(arg))).toString();
        return this.#colors(this.#transform(str));
    }

    write(writer, ...args) {
        writer.print(this.format(...args));
        return this;
    }

    writeln(writer, ...args) {
        writer.println(this.format(...args));
        return this;
    }

    // eslint-disable-next-line class-methods-use-this
    get symbols() { return ansiColors.symbols; }

    pad(...args) {
        return this.map((str) => pad(str, ...args));
    }

    map(f) { return new Term(this.#colors, (str) => f(this.#transform(str))); }

    get visible() { return new Term(this.#colors.visible, this.#transform); }
    get reset() { return new Term(this.#colors.reset, this.#transform); }
    get bold() { return new Term(this.#colors.bold, this.#transform); }
    get dim() { return new Term(this.#colors.dim, this.#transform); }
    get italic() { return new Term(this.#colors.italic, this.#transform); }
    get underline() { return new Term(this.#colors.underline, this.#transform); }
    get inverse() { return new Term(this.#colors.inverse, this.#transform); }
    get hidden() { return new Term(this.#colors.hidden, this.#transform); }
    get strikethrough() { return new Term(this.#colors.strikethrough, this.#transform); }
    get black() { return new Term(this.#colors.black, this.#transform); }
    get red() { return new Term(this.#colors.red, this.#transform); }
    get green() { return new Term(this.#colors.green, this.#transform); }
    get yellow() { return new Term(this.#colors.yellow, this.#transform); }
    get blue() { return new Term(this.#colors.blue, this.#transform); }
    get magenta() { return new Term(this.#colors.magenta, this.#transform); }
    get cyan() { return new Term(this.#colors.cyan, this.#transform); }
    get white() { return new Term(this.#colors.white, this.#transform); }
    get gray() { return new Term(this.#colors.gray, this.#transform); }
    get grey() { return new Term(this.#colors.grey, this.#transform); }
    get bgBlack() { return new Term(this.#colors.bgBlack, this.#transform); }
    get bgRed() { return new Term(this.#colors.bgRed, this.#transform); }
    get bgGreen() { return new Term(this.#colors.bgGreen, this.#transform); }
    get bgYellow() { return new Term(this.#colors.bgYellow, this.#transform); }
    get bgBlue() { return new Term(this.#colors.bgBlue, this.#transform); }
    get bgMagenta() { return new Term(this.#colors.bgMagenta, this.#transform); }
    get bgCyan() { return new Term(this.#colors.bgCyan, this.#transform); }
    get bgWhite() { return new Term(this.#colors.bgWhite, this.#transform); }
    get blackBright() { return new Term(this.#colors.blackBright, this.#transform); }
    get redBright() { return new Term(this.#colors.redBright, this.#transform); }
    get greenBright() { return new Term(this.#colors.greenBright, this.#transform); }
    get yellowBright() { return new Term(this.#colors.yellowBright, this.#transform); }
    get blueBright() { return new Term(this.#colors.blueBright, this.#transform); }
    get magentaBright() { return new Term(this.#colors.magentaBright, this.#transform); }
    get cyanBright() { return new Term(this.#colors.cyanBright, this.#transform); }
    get whiteBright() { return new Term(this.#colors.whiteBright, this.#transform); }
    get bgBlackBright() { return new Term(this.#colors.bgBlackBright, this.#transform); }
    get bgRedBright() { return new Term(this.#colors.bgRedBright, this.#transform); }
    get bgGreenBright() { return new Term(this.#colors.bgGreenBright, this.#transform); }
    get bgYellowBright() { return new Term(this.#colors.bgYellowBright, this.#transform); }
    get bgBlueBright() { return new Term(this.#colors.bgBlueBright, this.#transform); }
    get bgMagentaBright() { return new Term(this.#colors.bgMagentaBright, this.#transform); }
    get bgCyanBright() { return new Term(this.#colors.bgCyanBright, this.#transform); }
    get bgWhiteBright() { return new Term(this.#colors.bgWhiteBright, this.#transform); }
    get unstyle() { return new Term(this.#colors.unstyle, this.#transform); }
    get noop() { return new Term(this.#colors.noop, this.#transform); }
    get clear() { return new Term(this.#colors.clear, this.#transform); }
    get none() { return new Term(this.#colors.none, this.#transform); }
    get stripColor() { return new Term(this.#colors.stripColor, this.#transform); }
}

const term = new Term();

export { Term };
export default term;
