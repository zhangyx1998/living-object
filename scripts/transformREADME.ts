export default function transform(src: string, pkg: any) {
    const BLOB = new URL('./blob/master/', pkg.repository.url);
    return src
        .replace(
            '<!-- LINK TO DOCUMENTATION -->',
            '**[🔗 Documentation Website Coming Soon]()**',
        )
        .replace(/(?<=\()(\.\/.*)(?=\))/g, (path) => new URL(path, BLOB).href);
}
