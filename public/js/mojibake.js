(function (root) {
  "use strict";

  const tools = root.TextTools = root.TextTools || {};
  const encoder = new TextEncoder();
  const decoder = new TextDecoder("utf-8", { fatal: true });
  const base64Prefix = "MB64:";
  const hexPrefix = "MBHEX:";
  const cp1252Bytes = Object.freeze({
    "€": 0x80, "‚": 0x82, "ƒ": 0x83, "„": 0x84, "…": 0x85, "†": 0x86, "‡": 0x87,
    "ˆ": 0x88, "‰": 0x89, "Š": 0x8a, "‹": 0x8b, "Œ": 0x8c, "Ž": 0x8e,
    "‘": 0x91, "’": 0x92, "“": 0x93, "”": 0x94, "•": 0x95, "–": 0x96, "—": 0x97,
    "˜": 0x98, "™": 0x99, "š": 0x9a, "›": 0x9b, "œ": 0x9c, "ž": 0x9e, "Ÿ": 0x9f
  });
  const safeSymbols = Array.from("�※§¤#%&?!/|+=*~◇◆□■○●△▲▽▼░▒▓╳⊗⌁҂ӁƛȜϞ");
  const intensitySettings = Object.freeze({
    light: { probability: 0.08, label: "軽度" },
    medium: { probability: 0.24, label: "中度" },
    heavy: { probability: 0.58, label: "重度" },
    full: { probability: 1, label: "全体" }
  });

  function ensureReversibleText(text) {
    if (tools.unicode.hasUnpairedSurrogate(text)) {
      throw new Error("UNPAIRED_SURROGATE");
    }
  }

  function encodeLatin1(text) {
    const value = String(text == null ? "" : text);
    ensureReversibleText(value);
    const bytes = encoder.encode(value);
    const output = [];

    for (const byte of bytes) {
      if (byte === 0x5c) {
        output.push("\\\\");
      } else if (byte === 0x0a) {
        output.push("\n");
      } else if ((byte >= 0x20 && byte <= 0x7e) || (byte >= 0xa0 && byte <= 0xff)) {
        output.push(String.fromCharCode(byte));
      } else {
        output.push(`\\x${byte.toString(16).toUpperCase().padStart(2, "0")}`);
      }
    }

    return output.join("");
  }

  function decodeUtf8Bytes(bytes) {
    const array = Uint8Array.from(bytes);
    let decoded;
    try {
      decoded = decoder.decode(array);
    } catch (error) {
      throw new Error("INVALID_UTF8");
    }
    const encodedAgain = encoder.encode(decoded);
    if (encodedAgain.length !== array.length) {
      throw new Error("INVALID_UTF8");
    }
    for (let index = 0; index < array.length; index += 1) {
      if (array[index] !== encodedAgain[index]) {
        throw new Error("INVALID_UTF8");
      }
    }
    return decoded;
  }

  function decodeLatin1(text) {
    const value = String(text == null ? "" : text);
    const bytes = [];

    for (let index = 0; index < value.length;) {
      const character = value[index];
      if (character === "\\") {
        const next = value[index + 1];
        if (next === "\\") {
          bytes.push(0x5c);
          index += 2;
          continue;
        }
        if (next === "x" && /^[0-9a-fA-F]{2}$/.test(value.slice(index + 2, index + 4))) {
          bytes.push(parseInt(value.slice(index + 2, index + 4), 16));
          index += 4;
          continue;
        }
        throw new Error("INVALID_ESCAPE");
      }

      if (character === "\n") {
        bytes.push(0x0a);
        index += 1;
        continue;
      }

      const code = value.charCodeAt(index);
      if (code > 0xff || code === 0x0d || code === 0x09 || code === 0x7f || code < 0x20 || (code >= 0x80 && code <= 0x9f)) {
        throw new Error("INVALID_LATIN1");
      }
      bytes.push(code);
      index += 1;
    }

    return decodeUtf8Bytes(bytes);
  }

  function bytesToBinary(bytes) {
    const parts = [];
    const chunkSize = 0x8000;
    for (let index = 0; index < bytes.length; index += chunkSize) {
      parts.push(String.fromCharCode.apply(null, bytes.subarray(index, index + chunkSize)));
    }
    return parts.join("");
  }

  function bytesToBase64(bytes) {
    return btoa(bytesToBinary(bytes));
  }

  function encodeBase64(text) {
    const value = String(text == null ? "" : text);
    ensureReversibleText(value);
    return base64Prefix + bytesToBase64(encoder.encode(value));
  }

  function decodeBase64(text) {
    const value = String(text == null ? "" : text).trim();
    if (!value.startsWith(base64Prefix)) {
      throw new Error("MISSING_PREFIX");
    }

    const payload = value.slice(base64Prefix.length);
    const validBase64 = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
    if (payload.length % 4 !== 0 || !validBase64.test(payload)) {
      throw new Error("INVALID_BASE64");
    }

    let binary;
    try {
      binary = atob(payload);
    } catch (error) {
      throw new Error("INVALID_BASE64");
    }

    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }

    if (bytesToBase64(bytes) !== payload) {
      throw new Error("NON_CANONICAL_BASE64");
    }
    return decodeUtf8Bytes(bytes);
  }

  function encodeHex(text) {
    const value = String(text == null ? "" : text);
    ensureReversibleText(value);
    const bytes = encoder.encode(value);
    let payload = "";
    for (const byte of bytes) {
      payload += byte.toString(16).toUpperCase().padStart(2, "0");
    }
    return hexPrefix + payload;
  }

  function decodeHex(text) {
    const value = String(text == null ? "" : text).trim();
    if (!value.startsWith(hexPrefix)) {
      throw new Error("MISSING_HEX_PREFIX");
    }
    const payload = value.slice(hexPrefix.length);
    if (payload.length % 2 !== 0 || !/^[0-9a-fA-F]*$/.test(payload)) {
      throw new Error("INVALID_HEX");
    }
    const bytes = new Uint8Array(payload.length / 2);
    for (let index = 0; index < payload.length; index += 2) {
      bytes[index / 2] = parseInt(payload.slice(index, index + 2), 16);
    }
    return decodeUtf8Bytes(bytes);
  }

  function decodeRawMojibake(text) {
    const value = String(text == null ? "" : text);
    if (value.includes("�")) {
      throw new Error("LOSSY_REPLACEMENT");
    }

    const bytes = [];
    let hasHighByte = false;
    for (const character of value) {
      const code = character.codePointAt(0);
      let byte = code <= 0xff ? code : cp1252Bytes[character];
      if (!Number.isInteger(byte)) {
        throw new Error("INVALID_RAW_MOJIBAKE");
      }
      if (byte >= 0x80) hasHighByte = true;
      bytes.push(byte);
    }
    if (!hasHighByte) {
      throw new Error("NO_MOJIBAKE_SIGNAL");
    }
    return decodeUtf8Bytes(bytes);
  }

  function encode(text, method) {
    if (method === "base64") {
      return encodeBase64(text);
    }
    if (method === "hex") {
      return encodeHex(text);
    }
    return encodeLatin1(text);
  }

  function decode(text, method) {
    if (method === "base64") {
      return decodeBase64(text);
    }
    if (method === "hex") {
      return decodeHex(text);
    }
    if (method === "raw") {
      return decodeRawMojibake(text);
    }
    return decodeLatin1(text);
  }

  function detectMethod(text) {
    const value = String(text == null ? "" : text).trim();
    if (value.startsWith(base64Prefix)) return "base64";
    if (value.startsWith(hexPrefix)) return "hex";
    return "latin1";
  }

  function decodeAuto(text) {
    const value = String(text == null ? "" : text);
    if (value.includes("�")) {
      throw new Error("LOSSY_REPLACEMENT");
    }
    const detected = detectMethod(value);
    if (detected !== "latin1") {
      return { text: decode(value, detected), method: detected, inferred: false };
    }
    try {
      return { text: decodeLatin1(value), method: "latin1", inferred: false };
    } catch (safeError) {
      try {
        return { text: decodeRawMojibake(value), method: "raw", inferred: true };
      } catch (rawError) {
        if (rawError && (rawError.message === "LOSSY_REPLACEMENT" || rawError.message === "INVALID_UTF8")) throw rawError;
        throw safeError;
      }
    }
  }

  function hashText(text) {
    let hash = 0x811c9dc5;
    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 0x01000193);
    }
    return hash >>> 0 || 0x9e3779b9;
  }

  function createRandom(seed) {
    let state = seed >>> 0;
    return function random() {
      state ^= state << 13;
      state ^= state >>> 17;
      state ^= state << 5;
      return (state >>> 0) / 0x100000000;
    };
  }

  function pickSymbol(random) {
    return safeSymbols[Math.floor(random() * safeSymbols.length)];
  }

  function randomSymbols(random, maximum) {
    const length = 1 + Math.floor(random() * maximum);
    let result = "";
    for (let index = 0; index < length; index += 1) {
      result += pickSymbol(random);
    }
    return result;
  }

  function isLineBreak(value) {
    return /^(?:\r\n|[\n\r\u2028\u2029])$/.test(value);
  }

  function isWhitespace(value) {
    return /^[\s\u0085\u200b]+$/u.test(value);
  }

  function mutateCluster(cluster, level, random) {
    if (level === "full") {
      return pickSymbol(random) + cluster + pickSymbol(random);
    }

    const roll = random();
    if (level === "light") {
      if (roll < 0.55) return cluster + pickSymbol(random);
      if (roll < 0.85) return pickSymbol(random);
      return cluster + cluster;
    }

    if (level === "medium") {
      if (roll < 0.30) return pickSymbol(random);
      if (roll < 0.48) return "";
      if (roll < 0.73) return pickSymbol(random) + cluster + pickSymbol(random);
      if (roll < 0.88) return cluster + " ".repeat(2 + Math.floor(random() * 3));
      return cluster + pickSymbol(random) + cluster;
    }

    if (roll < 0.30) return randomSymbols(random, 3);
    if (roll < 0.50) return "";
    if (roll < 0.78) return randomSymbols(random, 3) + cluster + randomSymbols(random, 2);
    if (roll < 0.90) return cluster + cluster;
    return cluster + " ".repeat(2 + Math.floor(random() * 3));
  }

  function shuffleHeavyLines(text, random) {
    const parts = text.split(/(\r\n|[\n\r\u2028\u2029])/);
    return parts.map((part, index) => {
      if (index % 2 === 1 || !part || random() > 0.68) {
        return part;
      }
      const units = tools.unicode.graphemes(part);
      if (units.length < 3) {
        return part;
      }
      const width = Math.min(units.length, 2 + Math.floor(random() * 3));
      const start = Math.floor(random() * (units.length - width + 1));
      const slice = units.slice(start, start + width);
      for (let cursor = slice.length - 1; cursor > 0; cursor -= 1) {
        const swapIndex = Math.floor(random() * (cursor + 1));
        [slice[cursor], slice[swapIndex]] = [slice[swapIndex], slice[cursor]];
      }
      units.splice(start, width, ...slice);
      return units.join("");
    }).join("");
  }

  function truncateSafely(text, maximumUnits) {
    if (text.length <= maximumUnits) {
      return text;
    }
    const output = [];
    let length = 0;
    for (const cluster of tools.unicode.graphemes(text)) {
      if (length + cluster.length > maximumUnits) {
        break;
      }
      output.push(cluster);
      length += cluster.length;
    }
    return output.join("");
  }

  function creative(text, requestedLevel, requestedVariation) {
    const value = String(text == null ? "" : text);
    if (!value) {
      return "";
    }

    const level = intensitySettings[requestedLevel] ? requestedLevel : "light";
    const settings = intensitySettings[level];
    const variation = Number.isInteger(requestedVariation) && requestedVariation > 0 ? requestedVariation : 0;
    const seedSource = variation ? `${level}\u0000${variation}\u0000${value}` : `${level}\u0000${value}`;
    const random = createRandom(hashText(seedSource));
    const clusters = tools.unicode.graphemes(value);
    const output = [];
    let changed = false;
    let firstMutableIndex = -1;

    clusters.forEach((cluster) => {
      if (isLineBreak(cluster) || isWhitespace(cluster)) {
        output.push(cluster);
        return;
      }
      if (firstMutableIndex < 0) {
        firstMutableIndex = output.length;
      }
      if (random() >= settings.probability) {
        output.push(cluster);
        return;
      }
      output.push(mutateCluster(cluster, level, random));
      changed = true;
    });

    if (!changed && firstMutableIndex >= 0) {
      output[firstMutableIndex] += pickSymbol(random);
    }

    let result = output.join("");
    if (level === "heavy") {
      result = shuffleHeavyLines(result, random);
    }
    if (firstMutableIndex >= 0 && !tools.unicode.graphemes(result).some((cluster) => !isLineBreak(cluster) && !isWhitespace(cluster))) {
      result = pickSymbol(random) + result;
    }
    return truncateSafely(result, Math.max(value.length * 3, 32));
  }

  tools.mojibake = Object.freeze({
    encode,
    decode,
    creative,
    encodeLatin1,
    decodeLatin1,
    encodeBase64,
    decodeBase64,
    encodeHex,
    decodeHex,
    decodeRawMojibake,
    detectMethod,
    decodeAuto,
    methodLabels: Object.freeze({
      latin1: "UTF-8 → Latin-1 誤解釈風",
      base64: "UTF-8 → Base64",
      hex: "UTF-8 → 16進バイト列",
      raw: "Latin-1 / Windows-1252 推定"
    }),
    methodDescriptions: Object.freeze({
      latin1: "実際の文字コード誤認識に近い見た目です。見えにくい文字は安全な \\xHH 形式にします。",
      base64: "コピーや保存で崩れにくい可逆エンコードです。暗号化ではなく、内容を隠す用途には使えません。",
      hex: "UTF-8の各バイトを16進数で表示します。調査・受け渡し・復元確認に向いています。"
    }),
    intensityLabels: Object.freeze({
      light: "軽度",
      medium: "中度",
      heavy: "重度",
      full: "全体"
    })
  });
}(window));
