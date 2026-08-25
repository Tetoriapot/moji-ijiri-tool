(function (root) {
  "use strict";

  const tools = root.TextTools = root.TextTools || {};
  const definitions = Object.freeze([
    { id: "utf-8", label: "UTF-8", decoder: "utf-8" },
    { id: "shift_jis", label: "Shift_JIS / CP932", decoder: "shift_jis" },
    { id: "euc-jp", label: "EUC-JP", decoder: "euc-jp" },
    { id: "iso-2022-jp", label: "ISO-2022-JP", decoder: "iso-2022-jp" },
    { id: "utf-16le", label: "UTF-16 LE", decoder: "utf-16le" },
    { id: "utf-16be", label: "UTF-16 BE", decoder: "utf-16be" }
  ]);

  function toBytes(input) {
    if (input instanceof Uint8Array) return new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
    if (input instanceof ArrayBuffer) return new Uint8Array(input);
    if (ArrayBuffer.isView(input)) return new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
    if (Array.isArray(input)) return Uint8Array.from(input);
    throw new TypeError("バイト列を指定してください。");
  }

  function detectBom(bytes) {
    if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) return "utf-8";
    if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) return "utf-16le";
    if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) return "utf-16be";
    return "";
  }

  function stripBom(text) {
    return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  }

  function decode(bytes, encoding) {
    const definition = definitions.find((item) => item.id === encoding);
    if (!definition) throw new RangeError("未対応の文字コードです。");
    return stripBom(new TextDecoder(definition.decoder, { fatal: true }).decode(toBytes(bytes)));
  }

  function decodeForInspection(bytes, encoding, allowTrailingTrim) {
    let lastError;
    const maximumTrim = allowTrailingTrim ? 8 : 0;
    for (let trim = 0; trim <= maximumTrim && (trim === 0 || trim < bytes.length); trim += 1) {
      try {
        return decode(trim ? bytes.subarray(0, bytes.length - trim) : bytes, encoding);
      } catch (error) {
        lastError = error;
      }
    }
    if (bytes.length === 0) return decode(bytes, encoding);
    throw lastError;
  }

  function byteSignals(bytes) {
    let shiftJisPairs = 0;
    let shiftJisHalfwidth = 0;
    let eucPairs = 0;
    let eucKana = 0;
    let zeroEven = 0;
    let zeroOdd = 0;

    for (let index = 0; index < bytes.length; index += 1) {
      const value = bytes[index];
      if (value === 0) {
        if (index % 2) zeroOdd += 1;
        else zeroEven += 1;
      }
      if (value >= 0xa1 && value <= 0xdf) shiftJisHalfwidth += 1;
      if (((value >= 0x81 && value <= 0x9f) || (value >= 0xe0 && value <= 0xfc)) && index + 1 < bytes.length) {
        const trail = bytes[index + 1];
        if ((trail >= 0x40 && trail <= 0x7e) || (trail >= 0x80 && trail <= 0xfc)) {
          shiftJisPairs += 1;
          index += 1;
          continue;
        }
      }
      if (value === 0x8e && index + 1 < bytes.length && bytes[index + 1] >= 0xa1 && bytes[index + 1] <= 0xdf) {
        eucKana += 1;
        index += 1;
        continue;
      }
      if (value === 0x8f && index + 2 < bytes.length && bytes[index + 1] >= 0xa1 && bytes[index + 1] <= 0xfe && bytes[index + 2] >= 0xa1 && bytes[index + 2] <= 0xfe) {
        eucPairs += 1;
        index += 2;
        continue;
      }
      if (value >= 0xa1 && value <= 0xfe && index + 1 < bytes.length && bytes[index + 1] >= 0xa1 && bytes[index + 1] <= 0xfe) {
        eucPairs += 1;
        index += 1;
      }
    }

    const hasIsoEscape = bytes.some((value, index) => value === 0x1b && index + 2 < bytes.length && (
      (bytes[index + 1] === 0x24 && (bytes[index + 2] === 0x40 || bytes[index + 2] === 0x42)) ||
      (bytes[index + 1] === 0x28 && [0x42, 0x49, 0x4a].includes(bytes[index + 2]))
    ));

    return { shiftJisPairs, shiftJisHalfwidth, eucPairs, eucKana, zeroEven, zeroOdd, hasIsoEscape };
  }

  function textQuality(text) {
    if (!text) return 18;
    if (/\ufffd/u.test(text)) return -1000;

    const characters = Array.from(text);
    let controls = 0;
    let japanese = 0;
    let halfwidthKana = 0;
    let privateUse = 0;
    for (const character of characters) {
      const codePoint = character.codePointAt(0);
      if ((codePoint < 0x20 && !"\n\r\t".includes(character)) || (codePoint >= 0x7f && codePoint <= 0x9f)) controls += 1;
      if (/[\u3040-\u30ff\u3400-\u9fff\uf900-\ufaff]/u.test(character)) japanese += 1;
      if (/[\uff61-\uff9f]/u.test(character)) halfwidthKana += 1;
      if ((codePoint >= 0xe000 && codePoint <= 0xf8ff) || (codePoint >= 0xf0000 && codePoint <= 0xffffd)) privateUse += 1;
    }

    const length = Math.max(1, characters.length);
    let score = 42;
    score += Math.min(24, (japanese / length) * 32);
    score -= (controls / length) * 180;
    score -= (halfwidthKana / length) * 18;
    score -= (privateUse / length) * 80;
    const suspicious = text.match(/(?:Ã.|Â.|â€|ã[\u0080-\u00ff]|縺|繧|荳|譁)/gu);
    if (suspicious) score -= Math.min(35, suspicious.length * 6);
    return score;
  }

  function signalScore(id, bytes, bom, signals) {
    let score = 0;
    if (bom) score += bom === id ? 120 : -120;

    if (id === "utf-8") {
      score += 38;
      if (signals.zeroEven + signals.zeroOdd > 0) score -= 45;
    } else if (id === "shift_jis") {
      score += Math.min(34, signals.shiftJisPairs * 5);
      score += Math.min(6, signals.shiftJisHalfwidth);
      if (!signals.shiftJisPairs && !signals.shiftJisHalfwidth && bytes.some((value) => value >= 0x80)) score -= 25;
    } else if (id === "euc-jp") {
      score += Math.min(38, signals.eucPairs * 6 + signals.eucKana * 4);
      if (!signals.eucPairs && !signals.eucKana && bytes.some((value) => value >= 0x80)) score -= 25;
    } else if (id === "iso-2022-jp") {
      score += signals.hasIsoEscape ? 115 : -18;
    } else {
      const expectedZeros = id === "utf-16le" ? signals.zeroOdd : signals.zeroEven;
      const unexpectedZeros = id === "utf-16le" ? signals.zeroEven : signals.zeroOdd;
      if (!bom) {
        score += Math.min(48, expectedZeros * 7);
        score -= Math.min(38, unexpectedZeros * 7);
        if (expectedZeros === 0) score -= 46;
      }
      if (bytes.length % 2) score -= 100;
    }
    return score;
  }

  function previewText(text) {
    const compact = text.replace(/\r\n?/g, "\n").replace(/[\t ]+/g, " ").trim();
    return compact.length > 180 ? `${compact.slice(0, 180)}…` : compact;
  }

  function analyze(input, options) {
    const bytes = toBytes(input);
    const truncatedSample = Boolean(options && options.truncatedSample);
    const bom = detectBom(bytes);
    const signals = byteSignals(bytes);
    const candidates = [];

    for (const definition of definitions) {
      try {
        const text = decodeForInspection(bytes, definition.id, truncatedSample);
        const score = textQuality(text) + signalScore(definition.id, bytes, bom, signals);
        candidates.push({
          encoding: definition.id,
          label: definition.label,
          text,
          preview: previewText(text),
          score
        });
      } catch (_error) {
        // Fatal decoding intentionally removes invalid candidates.
      }
    }

    candidates.sort((left, right) => right.score - left.score || definitions.findIndex((item) => item.id === left.encoding) - definitions.findIndex((item) => item.id === right.encoding));

    const unique = [];
    const seenTexts = new Set();
    for (const candidate of candidates) {
      if (seenTexts.has(candidate.text)) continue;
      seenTexts.add(candidate.text);
      unique.push(candidate);
    }

    unique.forEach((candidate, index) => {
      const gap = index === 0 && unique[1] ? candidate.score - unique[1].score : 0;
      candidate.confidence = index === 0 && (bom === candidate.encoding || signals.hasIsoEscape || candidate.score >= 88 && gap >= 12)
        ? "high"
        : index === 0 || candidate.score >= 58 ? "medium" : "low";
      candidate.score = Math.round(candidate.score);
    });

    return {
      byteLength: bytes.byteLength,
      sampled: truncatedSample,
      bom,
      candidates: unique.slice(0, 5),
      recommended: unique[0] || null
    };
  }

  tools.encoding = Object.freeze({ analyze, decode, definitions });
}(typeof window !== "undefined" ? window : globalThis));
