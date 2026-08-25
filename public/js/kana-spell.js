(function (root) {
  "use strict";

  const namespace = root.TextTools = root.TextTools || {};
  const vowels = "aeiou";

  const knownNames = Object.freeze({
    "リプサム・グリーキング": ["Lipsum Greeking"],
    "アレクサンダー": ["Alexander"],
    "クリスティーナ": ["Christina"],
    "ミシェル": ["Michelle"],
    "ミッシェル": ["Michelle"],
    "キャサリン": ["Catherine", "Katherine"],
    "ジョセフ": ["Joseph"],
    "ジョージ": ["George"],
    "チャールズ": ["Charles"]
  });

  const segmentLexicon = Object.freeze({
    "ベル": ["Bell", "Belle"],
    "リプサム": ["Lipsum"],
    "グリーキング": ["Greeking"]
  });
  const sourceReasonLabels = Object.freeze({
    dictionary: "限定的な既知名辞書の表記を優先",
    faithful: "入力の読みを規則通りにローマ字化",
    natural: "読みやすさを保ちながら綴りを整理",
    english: "英語圏の名前らしい綴りへ調整",
    fantasy: "幻想的に見える文字や語尾へ調整",
    classic: "古典・伝承風に見える綴りへ調整",
    sf: "未来的に見える文字の組み合わせへ調整",
    creative: "創作名として見映えする綴りへ変化",
    fallback: "候補数を補うため語尾を機械的に変化"
  });

  const kanaMap = Object.freeze({
    "イェ": "ye", "ウァ": "wa", "ウィ": "wi", "ウェ": "we", "ウォ": "wo",
    "ヴァ": "va", "ヴィ": "vi", "ヴェ": "ve", "ヴォ": "vo", "ヴュ": "vyu",
    "キァ": "kya", "キャ": "kya", "キィ": "kyi", "キュ": "kyu", "キェ": "kye", "キョ": "kyo",
    "ギァ": "gya", "ギャ": "gya", "ギィ": "gyi", "ギュ": "gyu", "ギェ": "gye", "ギョ": "gyo",
    "クァ": "kwa", "クィ": "kwi", "クェ": "kwe", "クォ": "kwo",
    "グァ": "gwa", "グィ": "gwi", "グェ": "gwe", "グォ": "gwo",
    "シャ": "sha", "シュ": "shu", "シェ": "she", "ショ": "sho", "スィ": "si",
    "ジャ": "ja", "ジュ": "ju", "ジェ": "je", "ジョ": "jo", "ズィ": "zi",
    "チャ": "cha", "チュ": "chu", "チェ": "che", "チョ": "cho",
    "ヂャ": "ja", "ヂュ": "ju", "ヂェ": "je", "ヂョ": "jo",
    "ツァ": "tsa", "ツィ": "tsi", "ツェ": "tse", "ツォ": "tso",
    "ティ": "ti", "トゥ": "tu", "テュ": "tyu", "ディ": "di", "ドゥ": "du", "デュ": "dyu",
    "ニャ": "nya", "ニュ": "nyu", "ニェ": "nye", "ニョ": "nyo",
    "ヒャ": "hya", "ヒュ": "hyu", "ヒェ": "hye", "ヒョ": "hyo",
    "ビャ": "bya", "ビュ": "byu", "ビェ": "bye", "ビョ": "byo",
    "ピャ": "pya", "ピュ": "pyu", "ピェ": "pye", "ピョ": "pyo",
    "ファ": "fa", "フィ": "fi", "フェ": "fe", "フォ": "fo", "フュ": "fyu",
    "ミャ": "mya", "ミュ": "myu", "ミェ": "mye", "ミョ": "myo",
    "リャ": "rya", "リュ": "ryu", "リェ": "rye", "リョ": "ryo",
    "ア": "a", "イ": "i", "ウ": "u", "エ": "e", "オ": "o",
    "カ": "ka", "キ": "ki", "ク": "ku", "ケ": "ke", "コ": "ko",
    "ガ": "ga", "ギ": "gi", "グ": "gu", "ゲ": "ge", "ゴ": "go",
    "サ": "sa", "シ": "shi", "ス": "su", "セ": "se", "ソ": "so",
    "ザ": "za", "ジ": "ji", "ズ": "zu", "ゼ": "ze", "ゾ": "zo",
    "タ": "ta", "チ": "chi", "ツ": "tsu", "テ": "te", "ト": "to",
    "ダ": "da", "ヂ": "ji", "ヅ": "zu", "デ": "de", "ド": "do",
    "ナ": "na", "ニ": "ni", "ヌ": "nu", "ネ": "ne", "ノ": "no",
    "ハ": "ha", "ヒ": "hi", "フ": "fu", "ヘ": "he", "ホ": "ho",
    "バ": "ba", "ビ": "bi", "ブ": "bu", "ベ": "be", "ボ": "bo",
    "パ": "pa", "ピ": "pi", "プ": "pu", "ペ": "pe", "ポ": "po",
    "マ": "ma", "ミ": "mi", "ム": "mu", "メ": "me", "モ": "mo",
    "ヤ": "ya", "ユ": "yu", "ヨ": "yo",
    "ラ": "ra", "リ": "ri", "ル": "ru", "レ": "re", "ロ": "ro",
    "ワ": "wa", "ヰ": "wi", "ヱ": "we", "ヲ": "o", "ン": "n", "ヴ": "vu",
    "ァ": "a", "ィ": "i", "ゥ": "u", "ェ": "e", "ォ": "o",
    "ヵ": "ka", "ヶ": "ke"
  });

  const kanaKeys = Object.keys(kanaMap).sort((a, b) => Array.from(b).length - Array.from(a).length);

  function normalizeKana(input) {
    let value = String(input == null ? "" : input).normalize("NFKC");
    value = value
      .replace(/[\u3000\s]+/gu, " ")
      .replace(/[･·•]/gu, "・")
      .replace(/[‐‑‒–—―−]/gu, "-")
      .trim()
      .replace(/\s*・\s*/gu, "・")
      .replace(/\s*-\s*/gu, "-")
      .replace(/・{2,}/gu, "・")
      .replace(/-{2,}/gu, "-");

    return Array.from(value, (character) => {
      const code = character.codePointAt(0);
      return code >= 0x3041 && code <= 0x3096 ? String.fromCodePoint(code + 0x60) : character;
    }).join("");
  }

  function isSupportedKana(input) {
    const value = normalizeKana(input);
    return value.length > 0 && /[ァ-ヶ]/u.test(value) && !/[^ァ-ヶー・\- ]/u.test(value) &&
      !/^[・\- ]|[・\- ]$|[・\- ]{2,}/u.test(value);
  }

  function lastVowel(text) {
    const match = String(text).match(/[aeiou](?!.*[aeiou])/i);
    return match ? match[0].toLowerCase() : "";
  }

  function titleCase(value) {
    return String(value)
      .toLowerCase()
      .replace(/(^|[\s-])([a-z])/g, (match, separator, letter) => `${separator}${letter.toUpperCase()}`)
      .replace(/\s+/g, " ")
      .replace(/\s*-\s*/g, "-")
      .trim();
  }

  function romanizeKana(input, separator) {
    const normalized = normalizeKana(input);
    const middleDot = separator === "hyphen" ? "-" : separator === "none" ? "" : " ";
    let output = "";
    let index = 0;
    let geminate = false;

    while (index < normalized.length) {
      const character = normalized[index];
      if (character === "ッ") {
        geminate = true;
        index += 1;
        continue;
      }
      if (character === "ー") {
        if (geminate) output += "tsu";
        const vowel = lastVowel(output);
        if (vowel) output += vowel;
        geminate = false;
        index += 1;
        continue;
      }
      if (character === "・") {
        if (geminate) output += "tsu";
        output += middleDot;
        geminate = false;
        index += 1;
        continue;
      }
      if (character === " " || character === "-") {
        if (geminate) output += "tsu";
        output += character;
        geminate = false;
        index += 1;
        continue;
      }

      let matched = "";
      let syllable = "";
      for (const key of kanaKeys) {
        if (normalized.startsWith(key, index)) {
          matched = key;
          syllable = kanaMap[key];
          break;
        }
      }

      if (!matched) {
        output += character;
        geminate = false;
        index += 1;
        continue;
      }

      if (geminate) {
        if (/^[^aeiou]/i.test(syllable)) output += /^ch/i.test(syllable) ? "t" : syllable[0];
        else output += "tsu";
      }
      output += syllable;
      geminate = false;
      index += matched.length;
    }

    if (geminate) output += "tsu";

    return titleCase(output);
  }

  function applyNaturalization(input) {
    let value = String(input).toLowerCase();
    value = value
      .replace(/([bcdfghjklmnpqrstvwxyz])u(?=[bcdfghjklmnpqrstvwxyz])/g, "$1")
      .replace(/([ktdgbp])o(?=[bcdfghjklmnpqrstvwxyz])/g, "$1")
      .replace(/tsu(?=[bcdfghjklmnpqrstvwxyz])/g, "ts")
      .replace(/rii(?=[zs])/g, "rie")
      .replace(/z(?=e\b)/g, "s")
      .replace(/rko\b/g, "lco")
      .replace(/ii/g, "i")
      .replace(/aa/g, "a")
      .replace(/uu/g, "u")
      .replace(/ee/g, "e")
      .replace(/oo/g, "o")
      .replace(/([bcdfghjklmnpqrstvwxyz])\1\1+/g, "$1$1");
    return titleCase(value);
  }

  function replaceFirst(value, pattern, replacement) {
    return String(value).replace(pattern, replacement);
  }

  function applyFantasyRules(input, variant) {
    const value = String(input);
    const index = Math.abs(Number(variant) || 0) % 8;
    const rules = [
      (text) => replaceFirst(text, /^A/i, "Ae"),
      (text) => replaceFirst(text, /hta/i, "htha"),
      (text) => replaceFirst(text, /k/i, "kh"),
      (text) => replaceFirst(text, /f/i, "ph"),
      (text) => replaceFirst(text, /r/i, "rh"),
      (text) => replaceFirst(text, /i/i, "y"),
      (text) => replaceFirst(text, /g/i, "gh"),
      (text) => /a$/i.test(text) ? text.replace(/a$/i, "ia") : `${text}el`
    ];
    return titleCase(rules[index](value));
  }

  function applyClassicRules(input, variant) {
    const value = String(input);
    const index = Math.abs(Number(variant) || 0) % 8;
    const rules = [
      (text) => /a$/i.test(text) ? text.replace(/a$/i, "ia") : `${text}ius`,
      (text) => /a$/i.test(text) ? text.replace(/a$/i, "ae") : `${text}is`,
      (text) => /[aeiou]$/i.test(text) ? text.replace(/[aeiou]$/i, "us") : `${text}us`,
      (text) => /[aeiou]$/i.test(text) ? text.replace(/[aeiou]$/i, "os") : `${text}os`,
      (text) => replaceFirst(text, /f/i, "ph"),
      (text) => replaceFirst(text, /k/i, "c"),
      (text) => replaceFirst(text, /r/i, "rh"),
      (text) => /[aeiou]$/i.test(text) ? text.replace(/[aeiou]$/i, "iel") : `${text}el`
    ];
    return titleCase(rules[index](value));
  }

  function applySfRules(input, variant) {
    const value = String(input);
    const index = Math.abs(Number(variant) || 0) % 8;
    const rules = [
      (text) => replaceFirst(text, /k/i, "x"),
      (text) => replaceFirst(text, /s/i, "z"),
      (text) => replaceFirst(text, /i/i, "y"),
      (text) => replaceFirst(text, /k/i, "q"),
      (text) => /a$/i.test(text) ? text.replace(/a$/i, "ia") : `${text}ix`,
      (text) => /[aeiou]$/i.test(text) ? text.replace(/[aeiou]$/i, "ex") : `${text}ex`,
      (text) => /[aeiou]$/i.test(text) ? text.replace(/[aeiou]$/i, "yx") : `${text}yx`,
      (text) => replaceFirst(text, /^Z/i, "X")
    ];
    return titleCase(rules[index](value));
  }

  function stringDistance(left, right) {
    const a = String(left).toLowerCase();
    const b = String(right).toLowerCase();
    const previous = Array.from({ length: b.length + 1 }, (_, index) => index);
    for (let row = 1; row <= a.length; row += 1) {
      let diagonal = previous[0];
      previous[0] = row;
      for (let column = 1; column <= b.length; column += 1) {
        const above = previous[column];
        previous[column] = Math.min(
          previous[column] + 1,
          previous[column - 1] + 1,
          diagonal + (a[row - 1] === b[column - 1] ? 0 : 1)
        );
        diagonal = above;
      }
    }
    return previous[b.length];
  }

  function hashText(value) {
    let hash = 2166136261;
    for (let index = 0; index < value.length; index += 1) {
      hash ^= value.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function cleanSpelling(value) {
    return titleCase(String(value)
      .replace(/[^A-Za-z\s-]/g, "")
      .replace(/-{2,}/g, "-")
      .replace(/\s{2,}/g, " ")
      .replace(/(^[\s-]+|[\s-]+$)/g, ""));
  }

  function summarizeSpellingChange(base, spelling) {
    const beforeText = String(base || "");
    const afterText = String(spelling || "");
    const beforeLower = beforeText.toLowerCase();
    const afterLower = afterText.toLowerCase();
    let prefixLength = 0;
    while (prefixLength < beforeText.length && prefixLength < afterText.length && beforeLower[prefixLength] === afterLower[prefixLength]) {
      prefixLength += 1;
    }
    let beforeEnd = beforeText.length;
    let afterEnd = afterText.length;
    while (beforeEnd > prefixLength && afterEnd > prefixLength && beforeLower[beforeEnd - 1] === afterLower[afterEnd - 1]) {
      beforeEnd -= 1;
      afterEnd -= 1;
    }
    return Object.freeze({
      changed: beforeLower !== afterLower,
      prefix: beforeText.slice(0, prefixLength),
      before: beforeText.slice(prefixLength, beforeEnd),
      after: afterText.slice(prefixLength, afterEnd),
      suffix: beforeText.slice(beforeEnd)
    });
  }

  function driftLabel(changeCount, spelling, base) {
    const distance = stringDistance(spelling.replace(/[\s-]/g, ""), base.replace(/[\s-]/g, ""));
    const ratio = distance / Math.max(1, base.replace(/[\s-]/g, "").length);
    if (changeCount <= 1 && ratio <= 0.22) return "小";
    if (changeCount <= 3 && ratio <= 0.48) return "中";
    return "大";
  }

  function scoreCandidate(candidate, context) {
    const taste = context.taste || "standard";
    const fidelity = Math.max(1, Math.min(5, Number(context.fidelity) || 3));
    const base = context.base || candidate.spelling;
    const source = candidate.source || "creative";
    let score = 100;

    if (candidate.dictionary) score += 500;
    if (source === "natural") score += taste === "standard" ? 84 : 58;
    if (source === "faithful") score += 63 - (fidelity - 1) * 5;
    if (source === "english") score += taste === "english" ? 92 : 28;
    if (source === taste) score += 88;
    if (source === "creative") score += 34 + fidelity * 7;
    if (source === "fallback") score -= 45;
    if (candidate.featured) score += 40;
    if (taste === "standard" && source !== "natural" && source !== "faithful") score -= 8;

    const normalizedSpelling = candidate.spelling.replace(/[\s-]/g, "");
    const normalizedBase = base.replace(/[\s-]/g, "");
    score -= stringDistance(normalizedSpelling, normalizedBase) * Math.max(1.2, 3.6 - fidelity * 0.45);
    score -= Math.abs(normalizedSpelling.length - normalizedBase.length) * 0.8;
    score -= (candidate.changeCount || 0) * Math.max(0.7, 2.6 - fidelity * 0.34);
    if (/[bcdfghjklmnpqrstvwxyz]{5,}/i.test(candidate.spelling)) score -= 38;
    if (/q(?!u)/i.test(candidate.spelling)) score -= 9;
    if (source !== "faithful" && source !== "natural" && !candidate.dictionary) {
      score += (hashText(`${candidate.spelling}|${context.seed || 0}`) % 1700) / 100;
    }
    return Math.round(score * 100) / 100;
  }

  function removeDuplicates(candidates) {
    const seen = new Set();
    const results = [];
    candidates.forEach((candidate) => {
      const spelling = cleanSpelling(typeof candidate === "string" ? candidate : candidate.spelling);
      const key = spelling.toLowerCase().replace(/[\s-]+/g, "");
      if (!spelling || seen.has(key)) return;
      seen.add(key);
      results.push(typeof candidate === "string" ? spelling : Object.assign({}, candidate, { spelling }));
    });
    return results;
  }

  function changeFirst(value, pattern, replacement) {
    const changed = replaceFirst(value, pattern, replacement);
    return changed === value ? "" : changed;
  }

  function generateVariants(input, options) {
    const normalized = normalizeKana(input);
    if (!isSupportedKana(normalized)) return [];

    const config = Object.assign({ taste: "standard", fidelity: 3, seed: 0, limit: 8 }, options || {});
    const tastes = ["standard", "english", "fantasy", "classic", "sf"];
    const taste = tastes.includes(config.taste) ? config.taste : "standard";
    const fidelity = Math.max(1, Math.min(5, Math.round(Number(config.fidelity) || 3)));
    const seed = Math.max(0, Math.floor(Number(config.seed) || 0));
    const base = romanizeKana(normalized, "space");
    const natural = applyNaturalization(base);
    const candidates = [];

    function add(spelling, source, changeCount, dictionary, featured) {
      const clean = cleanSpelling(spelling);
      if (!clean) return;
      candidates.push({ spelling: clean, source, changeCount: changeCount || 0, dictionary: Boolean(dictionary), featured: Boolean(featured) });
    }

    (knownNames[normalized] || []).forEach((spelling, index) => add(spelling, "english", 1, true, index === 0));
    add(natural, "natural", natural === base ? 0 : 1, false);
    add(base, "faithful", 0, false);
    const lightlyReduced = titleCase(base.toLowerCase().replace(/([bcdfghjklmnpqrstvwxyz])u(?=[bcdfghjklmnpqrstvwxyz])/g, "$1"));
    if (lightlyReduced !== base && lightlyReduced !== natural) add(lightlyReduced, "creative", 1, false);

    if (normalized.includes("・")) {
      add(romanizeKana(normalized, "hyphen"), "natural", 1, false);
      add(romanizeKana(normalized, "none"), "creative", 2, false);
    }

    const nameParts = normalized.split(/[・\- ]/u);
    if (nameParts.length > 1) {
      const lexicalParts = nameParts.map((part) => (segmentLexicon[part] || [applyNaturalization(romanizeKana(part))])[0]);
      const lexicalName = lexicalParts.join(" ");
      add(lexicalName, "natural", 2, false, true);
      add(lexicalParts.join("-"), "creative", 3, false);
      add(lexicalParts.join(""), "creative", 3, false);
    }

    add(changeFirst(natural, /sh/i, "s"), "creative", 2, false);
    add(changeFirst(natural, /r(?!.*r)/i, "l"), "creative", 2, false);
    add(changeFirst(natural, /r/i, "l"), "creative", 2, false);
    add(changeFirst(natural, /k/i, "c"), taste === "english" ? "english" : "creative", 2, false);
    add(changeFirst(natural, /k/i, "q"), "sf", 3, false);
    add(changeFirst(natural, /f/i, "ph"), "fantasy", 2, false);
    add(changeFirst(natural, /j/i, "g"), "creative", 2, false);
    add(changeFirst(natural, /s/i, "z"), "sf", 2, false);
    add(changeFirst(natural, /v/i, "w"), "english", 2, false);
    add(changeFirst(natural, /z/i, "s"), "english", 2, false);
    add(changeFirst(natural, /^r/i, "l"), "english", 2, false);
    add(applyFantasyRules(natural, 0), "fantasy", 2, false);
    add(applyFantasyRules(natural, 1), "fantasy", 2, false, true);

    const compressedX = natural.replace(/ksh/i, "x");
    if (compressedX !== natural) {
      add(compressedX, "sf", 2, false, true);
      add(compressedX.replace(/^z/i, "X"), "sf", 3, false);
      add(compressedX.replace(/i/i, "y"), "sf", 3, false);
    }

    const folco = natural.replace(/r(?=[^aeiou]*[kc])/i, "l").replace(/k/i, "c");
    if (folco !== natural) add(folco, taste === "english" ? "english" : "creative", 3, false);

    for (let variant = 0; variant < 8; variant += 1) {
      add(applyFantasyRules(natural, variant), "fantasy", 2 + Math.floor(variant / 4), false);
      add(applyClassicRules(natural, variant), "classic", 2 + Math.floor(variant / 4), false);
      add(applySfRules(natural, variant), "sf", 2 + Math.floor(variant / 4), false);
    }

    const endingRules = [
      (text) => /a$/i.test(text) ? text.replace(/a$/i, "ah") : `${text}a`,
      (text) => /i$/i.test(text) ? text.replace(/i$/i, "y") : `${text}i`,
      (text) => /e$/i.test(text) ? text.replace(/e$/i, "ea") : `${text}e`,
      (text) => /o$/i.test(text) ? text.replace(/o$/i, "oh") : `${text}o`,
      (text) => /[aeiou]$/i.test(text) ? text.replace(/[aeiou]$/i, "el") : `${text}el`,
      (text) => /[aeiou]$/i.test(text) ? text.replace(/[aeiou]$/i, "is") : `${text}is`
    ];
    endingRules.forEach((rule, index) => add(rule(natural), "fallback", 3 + Math.floor(index / 3), false));

    const unique = removeDuplicates(candidates);
    const context = { taste, fidelity, base, seed: 0 };
    unique.forEach((candidate) => {
      candidate.score = scoreCandidate(candidate, context);
      candidate.drift = driftLabel(candidate.changeCount, candidate.spelling, base);
    });
    unique.sort((left, right) => right.score - left.score || left.spelling.localeCompare(right.spelling, "en"));

    const requestedLimit = Math.max(5, Math.min(8, Math.floor(Number(config.limit) || 8)));
    const desired = Math.min(requestedLimit, 5 + Math.ceil(fidelity / 2));
    let selected = unique.slice(0, desired);
    if (seed > 0 && unique.length > desired) {
      const recommendation = unique[0];
      const faithful = unique.find((candidate) => candidate.source === "faithful" && candidate !== recommendation);
      const naturalCandidate = unique.find((candidate) => candidate.source === "natural" && candidate !== recommendation);
      selected = [recommendation];
      [naturalCandidate, faithful].forEach((candidate) => {
        if (candidate && !selected.includes(candidate) && selected.length < desired) selected.push(candidate);
      });
      unique
        .filter((candidate) => !selected.includes(candidate))
        .sort((left, right) => {
          const leftScore = left.score + (hashText(`${normalized}|${taste}|${seed}|${left.spelling}`) % 5200) / 100;
          const rightScore = right.score + (hashText(`${normalized}|${taste}|${seed}|${right.spelling}`) % 5200) / 100;
          return rightScore - leftScore || left.spelling.localeCompare(right.spelling, "en");
        })
        .slice(0, desired - selected.length)
        .forEach((candidate) => selected.push(candidate));
      const freshPool = unique.slice(desired, Math.min(unique.length, desired + 12)).filter((candidate) => !selected.includes(candidate));
      if (freshPool.length && selected.length > 3) {
        selected[selected.length - 1] = freshPool[hashText(`${normalized}|fresh|${seed}`) % freshPool.length];
      }
    }
    return selected.map((candidate, index) => {
      const reasonCode = candidate.dictionary ? "dictionary" : candidate.source;
      return Object.freeze({
        spelling: candidate.spelling,
        score: candidate.score,
        drift: candidate.drift,
        changeLevel: candidate.drift,
        recommended: index === 0,
        source: candidate.source,
        reasonCode,
        reason: sourceReasonLabels[reasonCode] || sourceReasonLabels.creative,
        originalKana: normalized,
        baseSpelling: base,
        change: summarizeSpellingChange(base, candidate.spelling)
      });
    });
  }

  namespace.kanaSpell = Object.freeze({
    knownNames,
    segmentLexicon,
    sourceReasonLabels,
    kanaMap,
    normalizeKana,
    isSupportedKana,
    romanizeKana,
    applyNaturalization,
    applyFantasyRules,
    applyClassicRules,
    applySfRules,
    summarizeSpellingChange,
    generateVariants,
    scoreCandidate,
    removeDuplicates
  });
}(window));
