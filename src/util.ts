import { keywords } from "./keywords";

export type PropertyKey = string | number | symbol;

export const inBrowser = typeof window !== "undefined";

export class NameGenerator {
    private static letters =
        "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
    static get length() {
        return NameGenerator.letters.length;
    }

    private counter = 0;

    next(): string {
        while (true) {
            const result: number[] = [];
            let n = this.counter;
            this.counter++;
            do {
                result.push(n % NameGenerator.length);
                n = Math.floor(n / NameGenerator.length);
            } while (n > 0);
            const next = result
                .reverse()
                .map((c) => NameGenerator.letters[c])
                .join("");
            if (!keywords.includes(next)) return next;
        }
    }
}

export function isValidAttributeName(name: PropertyKey): boolean {
    if (typeof name === "number") return true;
    if (typeof name !== "string") return false;
    return /^[a-zA-Z_$][0-9a-zA-Z_$]*$/.test(name);
}

export function isImmediateValue(value: any): boolean {
    return (
        typeof value === "string" ||
        typeof value === "number" ||
        typeof value === "boolean" ||
        typeof value === "undefined" ||
        typeof value === "symbol" ||
        typeof value === "bigint" ||
        value === null
    );
}

export function inline(
    target: any,
    store?: Map<any, string>
): string | undefined {
    if (!isImmediateValue(target)) return store?.get(target);
    if (typeof target === "symbol") {
        if (Symbol.keyFor(target) !== undefined) {
            return "Symbol.for(" + JSON.stringify(Symbol.keyFor(target)) + ")";
        } else {
            throw new Error("Cannot serialize private Symbol");
        }
    }
    if (typeof target === "bigint") return target.toString() + "n";
    return JSON.stringify(target) ?? "undefined";
}

function isConciseMethod(f: string, name: string) {
    if (name.length === 0 || keywords.includes(name)) return false;
    f = f.trimStart();
    if (!f.startsWith(name)) return false;
    f = f.slice(name.length).trimStart();
    return f.startsWith("(");
}

export function serializeFunction(target: Function) {
    const raw = target.toString();
    // Strip async prefix
    const prefix = raw.match(/^\s*async\s+/)?.[0] ?? "";
    const stripped = raw.slice(prefix.length);
    // Special case:
    // fn() {} (needs fix => function fn() {})
    // mutations:
    // fn \s* () \s* {}
    // Not to be confused with:
    // () => {}
    // function () {}
    // function function() {}
    if (isConciseMethod(stripped, target.name))
        return [prefix, "function ", stripped].join("");
    else return raw;
}

export function serializeObjectKey(key: string | number | symbol) {
    if (typeof key === "string") {
        return isValidAttributeName(key) ? key.toString() : JSON.stringify(key);
    } else if (typeof key === "number") {
        return key.toString();
    } else if (typeof key === "symbol") {
        const name = Symbol.keyFor(key);
        if (name === undefined)
            throw new Error("Cannot serialize private Symbol");
        return "[Symbol.for(" + JSON.stringify(name) + ")]";
    } else {
        throw new Error(`Cannot serialize object key ${key}`);
    }
}

export function crash(message: string): never {
    throw new Error(message);
}
