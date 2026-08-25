(function (root) {
  "use strict";

  const tools = root.TextTools = root.TextTools || {};

  const mirrorMap = Object.freeze({
    "A": "A", "B": "ᗺ", "C": "Ɔ", "D": "ᗡ", "E": "Ǝ", "F": "ꟻ", "G": "Ꭾ",
    "H": "H", "I": "I", "J": "Ⴑ", "K": "⋊", "L": "⅃", "M": "M", "N": "И",
    "O": "O", "P": "Ԁ", "Q": "Ϙ", "R": "Я", "S": "S", "T": "T", "U": "U",
    "V": "V", "W": "W", "X": "X", "Y": "Y", "Z": "Z",
    "a": "ɒ", "b": "d", "c": "ɔ", "d": "b", "e": "ɘ", "f": "ꟻ", "g": "ǫ",
    "h": "ʜ", "i": "i", "j": "ꞁ", "k": "ʞ", "l": "l", "m": "m", "n": "ᴎ",
    "o": "o", "p": "q", "q": "p", "r": "ɿ", "s": "ƨ", "t": "ƚ", "u": "u",
    "v": "v", "w": "w", "x": "x", "y": "ʏ", "z": "z",
    "3": "Ɛ", "(": ")", ")": "(", "[": "]", "]": "[", "{": "}", "}": "{",
    "<": ">", ">": "<", "/": "\\", "\\": "/", "?": "⸮"
  });

  const upsideDownMap = Object.freeze({
    "a": "ɐ", "b": "q", "c": "ɔ", "d": "p", "e": "ǝ", "f": "ɟ", "g": "ƃ",
    "h": "ɥ", "i": "ᴉ", "j": "ɾ", "k": "ʞ", "l": "l", "m": "ɯ", "n": "u",
    "o": "o", "p": "d", "q": "b", "r": "ɹ", "s": "s", "t": "ʇ", "u": "n",
    "v": "ʌ", "w": "ʍ", "x": "x", "y": "ʎ", "z": "z",
    "A": "∀", "B": "𐐒", "C": "Ɔ", "D": "◖", "E": "Ǝ", "F": "Ⅎ", "G": "פ",
    "H": "H", "I": "I", "J": "ſ", "K": "⋊", "L": "˥", "M": "W", "N": "N",
    "O": "O", "P": "Ԁ", "Q": "Ό", "R": "ᴚ", "S": "S", "T": "⊥", "U": "∩",
    "V": "Λ", "W": "M", "X": "X", "Y": "⅄", "Z": "Z",
    "0": "0", "1": "Ɩ", "2": "ᄅ", "3": "Ɛ", "4": "ㄣ", "5": "ϛ",
    "6": "9", "7": "ㄥ", "8": "8", "9": "6",
    ".": "˙", ",": "'", "'": ",", "\"": "„", "?": "¿", "!": "¡",
    "(": ")", ")": "(", "[": "]", "]": "[", "{": "}", "}": "{",
    "<": ">", ">": "<", "_": "‾", "/": "\\", "\\": "/"
  });

  const labels = Object.freeze({
    reverse: "文字順を逆転",
    mirror: "鏡文字風",
    combined: "文字順＋鏡文字",
    upsideDown: "逆さ文字"
  });

  function reverseText(text) {
    return tools.unicode.graphemes(String(text || "")).reverse().join("");
  }

  function reverseByLine(text) {
    return String(text || "")
      .split(/(\r\n|[\n\r\u2028\u2029])/)
      .map((part, index) => index % 2 === 0 ? reverseText(part) : part)
      .join("");
  }

  function mapText(text, map) {
    return tools.unicode.graphemes(String(text || ""))
      .map((cluster) => Object.prototype.hasOwnProperty.call(map, cluster) ? map[cluster] : cluster)
      .join("");
  }

  function reverseWithSetting(text, lineByLine) {
    return lineByLine ? reverseByLine(text) : reverseText(text);
  }

  function transform(text, requestedMethod, lineByLine) {
    const value = String(text || "");
    const method = labels[requestedMethod] ? requestedMethod : "reverse";

    if (method === "mirror") {
      return mapText(value, mirrorMap);
    }
    if (method === "combined") {
      return mapText(reverseWithSetting(value, lineByLine), mirrorMap);
    }
    if (method === "upsideDown") {
      return mapText(reverseWithSetting(value, lineByLine), upsideDownMap);
    }
    return reverseWithSetting(value, lineByLine);
  }

  tools.mirror = Object.freeze({
    transform,
    reverseText,
    reverseByLine,
    mirrorMap,
    upsideDownMap,
    labels
  });
}(window));
