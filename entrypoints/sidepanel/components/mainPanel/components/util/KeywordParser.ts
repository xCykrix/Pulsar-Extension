const regex = /(?<!\\)[+-](?:\\[+-]|[\p{L}\p{N}\s$&,:;=?@#|'<>.^*()%!])+/gu;

export class KeywordParser {
  public static parseKeyword(input: string): string[] | null {
    const matches: string[] = [];

    if (input.trim().length === 0) {
      return [];
    }

    for (const rawLine of input.split(/\r?\n/u)) {
      const line = rawLine.trim();
      if (line.length === 0) {
        continue;
      }

      const lineMatches = Array.from(line.matchAll(regex));
      if (lineMatches.length === 0) {
        return null;
      }

      let cursor = 0;
      for (const match of lineMatches) {
        const index = match.index ?? 0;
        if (line.slice(cursor, index).trim().length > 0) {
          return null;
        }

        matches.push(match[0]);
        cursor = index + match[0].length;
      }

      if (line.slice(cursor).trim().length > 0) {
        return null;
      }
    }

    return matches.length > 0 ? matches.map((v) => v.trim().replaceAll(/\s/g, ' ').replaceAll(/\\([+-])/g, '$1')) : null;
  }
}
