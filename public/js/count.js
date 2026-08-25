(function (root) {
  "use strict";

  const tools = root.TextTools = root.TextTools || {};
  const lineBreakSource = "\\r\\n|[\\n\\r\\u2028\\u2029]";
  const horizontalWhitespacePattern = /[ \t\v\f\u0085\u00a0\u1680\u180e\u2000-\u200a\u200b\u202f\u205f\u3000]/gu;
  const allWhitespacePattern = /[\s\u0085\u200b]/gu;

  let graphemeSegmenter = null;
  let wordSegmenter = null;
  let unicodeMarkPattern = null;

  try {
    if (typeof Intl !== "undefined" && typeof Intl.Segmenter === "function") {
      graphemeSegmenter = new Intl.Segmenter("ja", { granularity: "grapheme" });
      wordSegmenter = new Intl.Segmenter("ja", { granularity: "word" });
    }
  } catch (error) {
    graphemeSegmenter = null;
    wordSegmenter = null;
  }

  try {
    unicodeMarkPattern = new RegExp("\\p{M}", "u");
  } catch (error) {
    unicodeMarkPattern = null;
  }

  function codePointOf(character) {
    return character.codePointAt(0);
  }

  function isCombiningPart(character) {
    const point = codePointOf(character);
    return Boolean(
      (unicodeMarkPattern && unicodeMarkPattern.test(character)) ||
      point === 0xfe0e ||
      point === 0xfe0f ||
      (point >= 0xe0100 && point <= 0xe01ef) ||
      (point >= 0x1f3fb && point <= 0x1f3ff)
    );
  }

  function isRegionalIndicator(character) {
    const point = codePointOf(character);
    return point >= 0x1f1e6 && point <= 0x1f1ff;
  }

  function fallbackGraphemes(text) {
    const points = Array.from(text);
    const clusters = [];

    for (let index = 0; index < points.length; index += 1) {
      let cluster = points[index];

      if (points[index] === "\r" && points[index + 1] === "\n") {
        clusters.push("\r\n");
        index += 1;
        continue;
      }

      if (isRegionalIndicator(points[index]) && isRegionalIndicator(points[index + 1] || "")) {
        cluster += points[index + 1];
        index += 1;
      }

      while (index + 1 < points.length) {
        const next = points[index + 1];
        if (isCombiningPart(next)) {
          cluster += next;
          index += 1;
          continue;
        }
        if (next === "\u200d" && index + 2 < points.length) {
          cluster += next + points[index + 2];
          index += 2;
          continue;
        }
        break;
      }

      clusters.push(cluster);
    }

    return clusters;
  }

  function graphemes(text) {
    const value = String(text || "");
    if (!graphemeSegmenter) {
      return fallbackGraphemes(value);
    }
    return Array.from(graphemeSegmenter.segment(value), (part) => part.segment);
  }

  function graphemeCount(text) {
    const value = String(text || "");
    if (!graphemeSegmenter) {
      return fallbackGraphemes(value).length;
    }

    let count = 0;
    for (const unused of graphemeSegmenter.segment(value)) {
      count += 1;
    }
    return count;
  }

  function hasUnpairedSurrogate(text) {
    const value = String(text || "");
    for (let index = 0; index < value.length; index += 1) {
      const code = value.charCodeAt(index);
      if (code >= 0xd800 && code <= 0xdbff) {
        const next = value.charCodeAt(index + 1);
        if (next >= 0xdc00 && next <= 0xdfff) {
          index += 1;
        } else {
          return true;
        }
      } else if (code >= 0xdc00 && code <= 0xdfff) {
        return true;
      }
    }
    return false;
  }

  function countWords(text) {
    const value = String(text || "");
    if (!value.trim()) {
      return 0;
    }

    if (wordSegmenter) {
      let count = 0;
      for (const part of wordSegmenter.segment(value)) {
        if (part.isWordLike) {
          count += 1;
        }
      }
      return count;
    }

    try {
      const words = value.match(/[\p{L}\p{N}\p{M}]+(?:['’_-][\p{L}\p{N}\p{M}]+)*/gu);
      return words ? words.length : 0;
    } catch (error) {
      return value.trim().split(/\s+/).filter(Boolean).length;
    }
  }

  function countLines(text) {
    const value = String(text || "");
    if (!value) {
      return 0;
    }
    const breaks = value.match(new RegExp(lineBreakSource, "g"));
    return (breaks ? breaks.length : 0) + 1;
  }

  function analyze(text) {
    const value = String(text || "");
    const withoutSpaces = value.replace(horizontalWhitespacePattern, "");
    const withoutLines = value.replace(new RegExp(lineBreakSource, "gu"), "");
    const withoutWhitespace = value.replace(allWhitespacePattern, "");

    return {
      total: graphemeCount(value),
      noSpaces: graphemeCount(withoutSpaces),
      noLines: graphemeCount(withoutLines),
      noWhitespace: graphemeCount(withoutWhitespace),
      lines: countLines(value),
      words: countWords(value),
      bytes: new TextEncoder().encode(value).length
    };
  }

  tools.unicode = Object.freeze({
    graphemes,
    graphemeCount,
    hasUnpairedSurrogate,
    lineBreakSource
  });

  tools.count = Object.freeze({ analyze, countLines, countWords });
}(window));
