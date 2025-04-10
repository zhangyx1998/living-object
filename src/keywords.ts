// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Lexical_grammar#reserved_words
export const keywords = new Set([
    'break',
    'case',
    'catch',
    'class',
    'const',
    'continue',
    'debugger',
    'default',
    'delete',
    'do',
    'else',
    'export',
    'extends',
    'false',
    'finally',
    'for',
    'function',
    'if',
    'import',
    'in',
    'instanceof',
    'new',
    'null',
    'return',
    'super',
    'switch',
    'this',
    'throw',
    'true',
    'try',
    'typeof',
    'var',
    'void',
    'while',
    'with',
    // The following are only reserved when they are found in strict mode code:
    'let',
    'static',
    'yield',
    // The following are only reserved when they are found in module code or async function bodies:
    'await',
    // Future reserved words
    'enum',
    'implements',
    'interface',
    'package',
    'private',
    'protected',
    'public',
    // Identifiers with special meanings
    // (not a keyword, but cannot be declared as identifier in strict mode)
    'arguments',
    'eval',
]);
