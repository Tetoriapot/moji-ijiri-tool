(function (root) {
  "use strict";

  const namespace = root.TextTools = root.TextTools || {};

  const romajiToHiraganaMap = Object.freeze({
    kya: "きゃ", kyu: "きゅ", kyo: "きょ", kye: "きぇ",
    gya: "ぎゃ", gyu: "ぎゅ", gyo: "ぎょ", gye: "ぎぇ",
    sha: "しゃ", shu: "しゅ", sho: "しょ", she: "しぇ",
    sya: "しゃ", syu: "しゅ", syo: "しょ", sye: "しぇ",
    ja: "じゃ", ju: "じゅ", jo: "じょ", je: "じぇ",
    jya: "じゃ", jyu: "じゅ", jyo: "じょ", zya: "じゃ", zyu: "じゅ", zyo: "じょ", zye: "じぇ",
    cha: "ちゃ", chu: "ちゅ", cho: "ちょ", che: "ちぇ",
    cya: "ちゃ", cyu: "ちゅ", cyo: "ちょ", tya: "ちゃ", tyu: "ちゅ", tyo: "ちょ", tye: "ちぇ",
    dya: "ぢゃ", dyu: "ぢゅ", dyo: "ぢょ", dye: "ぢぇ",
    nya: "にゃ", nyu: "にゅ", nyo: "にょ", nye: "にぇ",
    hya: "ひゃ", hyu: "ひゅ", hyo: "ひょ", hye: "ひぇ",
    bya: "びゃ", byu: "びゅ", byo: "びょ", bye: "びぇ",
    pya: "ぴゃ", pyu: "ぴゅ", pyo: "ぴょ", pye: "ぴぇ",
    mya: "みゃ", myu: "みゅ", myo: "みょ", mye: "みぇ",
    rya: "りゃ", ryu: "りゅ", ryo: "りょ", rye: "りぇ",
    fya: "ふゃ", fyu: "ふゅ", fyo: "ふょ",
    vya: "ゔゃ", vyu: "ゔゅ", vyo: "ゔょ",
    kwa: "くぁ", kwi: "くぃ", kwe: "くぇ", kwo: "くぉ",
    gwa: "ぐぁ", gwi: "ぐぃ", gwe: "ぐぇ", gwo: "ぐぉ",
    tsa: "つぁ", tsi: "つぃ", tse: "つぇ", tso: "つぉ",
    swi: "すぃ", zwi: "ずぃ",
    wha: "うぁ", whi: "うぃ", whe: "うぇ", who: "うぉ",
    tha: "てゃ", thi: "てぃ", thu: "てゅ", the: "てぇ", tho: "てょ",
    dha: "でゃ", dhi: "でぃ", dhu: "でゅ", dhe: "でぇ", dho: "でょ",
    twa: "とぁ", twi: "とぃ", twu: "とぅ", twe: "とぇ", two: "とぉ",
    dwa: "どぁ", dwi: "どぃ", dwu: "どぅ", dwe: "どぇ", dwo: "どぉ",
    xtsu: "っ", ltsu: "っ", xtu: "っ", ltu: "っ",
    xya: "ゃ", xyu: "ゅ", xyo: "ょ", xwa: "ゎ", xka: "ゕ", xke: "ゖ",
    shi: "し", chi: "ち", tsu: "つ",
    fa: "ふぁ", fi: "ふぃ", fe: "ふぇ", fo: "ふぉ",
    va: "ゔぁ", vi: "ゔぃ", vu: "ゔ", ve: "ゔぇ", vo: "ゔぉ",
    wi: "うぃ", we: "うぇ", ye: "いぇ",
    ti: "ち", di: "ぢ", tu: "つ", du: "づ",
    ka: "か", ki: "き", ku: "く", ke: "け", ko: "こ",
    ga: "が", gi: "ぎ", gu: "ぐ", ge: "げ", go: "ご",
    sa: "さ", si: "し", su: "す", se: "せ", so: "そ",
    za: "ざ", zi: "じ", ji: "じ", zu: "ず", ze: "ぜ", zo: "ぞ",
    ta: "た", te: "て", to: "と",
    da: "だ", de: "で", do: "ど",
    na: "な", ni: "に", nu: "ぬ", ne: "ね", no: "の",
    ha: "は", hi: "ひ", fu: "ふ", hu: "ふ", he: "へ", ho: "ほ",
    ba: "ば", bi: "び", bu: "ぶ", be: "べ", bo: "ぼ",
    pa: "ぱ", pi: "ぴ", pu: "ぷ", pe: "ぺ", po: "ぽ",
    ma: "ま", mi: "み", mu: "む", me: "め", mo: "も",
    ya: "や", yu: "ゆ", yo: "よ",
    ra: "ら", ri: "り", ru: "る", re: "れ", ro: "ろ",
    wa: "わ", wo: "を",
    xa: "ぁ", xi: "ぃ", xu: "ぅ", xe: "ぇ", xo: "ぉ",
    a: "あ", i: "い", u: "う", e: "え", o: "お"
  });

  const hiraganaToRomajiMap = Object.freeze({
    "きゃ": "kya", "きゅ": "kyu", "きょ": "kyo", "きぇ": "kye",
    "ぎゃ": "gya", "ぎゅ": "gyu", "ぎょ": "gyo", "ぎぇ": "gye",
    "しゃ": "sha", "しゅ": "shu", "しょ": "sho", "しぇ": "she",
    "じゃ": "ja", "じゅ": "ju", "じょ": "jo", "じぇ": "je",
    "ぢゃ": "ja", "ぢゅ": "ju", "ぢょ": "jo", "ぢぇ": "je",
    "ちゃ": "cha", "ちゅ": "chu", "ちょ": "cho", "ちぇ": "che",
    "にゃ": "nya", "にゅ": "nyu", "にょ": "nyo", "にぇ": "nye",
    "ひゃ": "hya", "ひゅ": "hyu", "ひょ": "hyo", "ひぇ": "hye",
    "びゃ": "bya", "びゅ": "byu", "びょ": "byo", "びぇ": "bye",
    "ぴゃ": "pya", "ぴゅ": "pyu", "ぴょ": "pyo", "ぴぇ": "pye",
    "みゃ": "mya", "みゅ": "myu", "みょ": "myo", "みぇ": "mye",
    "りゃ": "rya", "りゅ": "ryu", "りょ": "ryo", "りぇ": "rye",
    "ふゃ": "fya", "ふゅ": "fyu", "ふょ": "fyo",
    "ゔゃ": "vya", "ゔゅ": "vyu", "ゔょ": "vyo",
    "くぁ": "kwa", "くぃ": "kwi", "くぇ": "kwe", "くぉ": "kwo",
    "ぐぁ": "gwa", "ぐぃ": "gwi", "ぐぇ": "gwe", "ぐぉ": "gwo",
    "つぁ": "tsa", "つぃ": "tsi", "つぇ": "tse", "つぉ": "tso",
    "すぃ": "swi", "ずぃ": "zwi",
    "うぁ": "wha", "うぃ": "wi", "うぇ": "we", "うぉ": "who",
    "てゃ": "tha", "てぃ": "thi", "てゅ": "thu", "てぇ": "the", "てょ": "tho",
    "でゃ": "dha", "でぃ": "dhi", "でゅ": "dhu", "でぇ": "dhe", "でょ": "dho",
    "とぁ": "twa", "とぃ": "twi", "とぅ": "twu", "とぇ": "twe", "とぉ": "two",
    "どぁ": "dwa", "どぃ": "dwi", "どぅ": "dwu", "どぇ": "dwe", "どぉ": "dwo",
    "ふぁ": "fa", "ふぃ": "fi", "ふぇ": "fe", "ふぉ": "fo",
    "ゔぁ": "va", "ゔぃ": "vi", "ゔぇ": "ve", "ゔぉ": "vo",
    "いぇ": "ye",
    "あ": "a", "い": "i", "う": "u", "え": "e", "お": "o",
    "か": "ka", "き": "ki", "く": "ku", "け": "ke", "こ": "ko",
    "が": "ga", "ぎ": "gi", "ぐ": "gu", "げ": "ge", "ご": "go",
    "さ": "sa", "し": "shi", "す": "su", "せ": "se", "そ": "so",
    "ざ": "za", "じ": "ji", "ず": "zu", "ぜ": "ze", "ぞ": "zo",
    "た": "ta", "ち": "chi", "つ": "tsu", "て": "te", "と": "to",
    "だ": "da", "ぢ": "ji", "づ": "zu", "で": "de", "ど": "do",
    "な": "na", "に": "ni", "ぬ": "nu", "ね": "ne", "の": "no",
    "は": "ha", "ひ": "hi", "ふ": "fu", "へ": "he", "ほ": "ho",
    "ば": "ba", "び": "bi", "ぶ": "bu", "べ": "be", "ぼ": "bo",
    "ぱ": "pa", "ぴ": "pi", "ぷ": "pu", "ぺ": "pe", "ぽ": "po",
    "ま": "ma", "み": "mi", "む": "mu", "め": "me", "も": "mo",
    "や": "ya", "ゆ": "yu", "よ": "yo",
    "ら": "ra", "り": "ri", "る": "ru", "れ": "re", "ろ": "ro",
    "わ": "wa", "ゐ": "wi", "ゑ": "we", "を": "o", "ん": "n", "ゔ": "vu",
    "ぁ": "xa", "ぃ": "xi", "ぅ": "xu", "ぇ": "xe", "ぉ": "xo",
    "ゃ": "xya", "ゅ": "xyu", "ょ": "xyo",
    "ゎ": "xwa", "ゕ": "xka", "ゖ": "xke"
  });

  const schemeOverrides = Object.freeze({
    hepburn: Object.freeze({}),
    kunrei: Object.freeze({
      "し": "si", "じ": "zi", "ぢ": "zi", "ち": "ti", "つ": "tu", "づ": "zu", "ふ": "hu",
      "しゃ": "sya", "しゅ": "syu", "しょ": "syo", "しぇ": "sye",
      "じゃ": "zya", "じゅ": "zyu", "じょ": "zyo", "じぇ": "zye",
      "ぢゃ": "zya", "ぢゅ": "zyu", "ぢょ": "zyo", "ぢぇ": "zye",
      "ちゃ": "tya", "ちゅ": "tyu", "ちょ": "tyo", "ちぇ": "tye"
    }),
    nihon: Object.freeze({
      "し": "si", "じ": "zi", "ぢ": "di", "ち": "ti", "つ": "tu", "づ": "du", "ふ": "hu",
      "しゃ": "sya", "しゅ": "syu", "しょ": "syo", "しぇ": "sye",
      "じゃ": "zya", "じゅ": "zyu", "じょ": "zyo", "じぇ": "zye",
      "ぢゃ": "dya", "ぢゅ": "dyu", "ぢょ": "dyo", "ぢぇ": "dye",
      "ちゃ": "tya", "ちゅ": "tyu", "ちょ": "tyo", "ちぇ": "tye"
    })
  });
  const schemeLabels = Object.freeze({ hepburn: "ヘボン式", kunrei: "訓令式", nihon: "日本式" });
  const longVowelLabels = Object.freeze({ written: "かな通り", spoken: "発音寄り", macron: "マクロン" });
  const particleLabels = Object.freeze({ written: "表記通り", pronunciation: "助詞を発音通り" });
  const macrons = Object.freeze({ a: "ā", i: "ī", u: "ū", e: "ē", o: "ō" });
  const romanTokenPattern = /[A-Za-zＡ-Ｚａ-ｚĀĪŪĒŌāīūēō'’ʼ＇]+/gu;

  const romajiKeys = Object.keys(romajiToHiraganaMap).sort((left, right) => right.length - left.length);
  const hiraganaKeys = Object.keys(hiraganaToRomajiMap).sort((left, right) => right.length - left.length);

  function normalizeText(input) {
    return String(input == null ? "" : input).normalize("NFC");
  }

  function expandMacrons(input, useLongMark) {
    const replacements = useLongMark
      ? { ā: "a-", ī: "i-", ū: "u-", ē: "e-", ō: "o-" }
      : { ā: "aa", ī: "ii", ū: "uu", ē: "ei", ō: "ou" };
    return String(input).toLowerCase().replace(/[āīūēō]/g, (character) => replacements[character]);
  }

  function hiraganaToKatakana(input) {
    return Array.from(String(input), (character) => {
      const code = character.codePointAt(0);
      return code >= 0x3041 && code <= 0x3096 ? String.fromCodePoint(code + 0x60) : character;
    }).join("");
  }

  function katakanaToHiragana(input) {
    const normalized = normalizeText(input)
      .replace(/[\uFF66-\uFF9F]+/g, (run) => run.normalize("NFKC"))
      .normalize("NFC");
    return Array.from(normalized, (character) => {
      const code = character.codePointAt(0);
      return code >= 0x30a1 && code <= 0x30f6 ? String.fromCodePoint(code - 0x60) : character;
    }).join("");
  }

  function convertRomajiToken(token, script) {
    const source = expandMacrons(
      String(token).normalize("NFKC").replace(/[’ʼ＇]/g, "'"),
      script === "katakana"
    ).replace(/m(?=[bmp])/g, "n");
    let output = "";
    let index = 0;

    while (index < source.length) {
      const character = source[index];
      const next = source[index + 1] || "";

      if (character === "-") {
        output += "ー";
        index += 1;
        continue;
      }

      if (character === "n") {
        if (next === "'") {
          output += "ん";
          index += 2;
          continue;
        }
        if (next === "n" && !/[aeiouy]/.test(source[index + 2] || "")) {
          output += "ん";
          index += 2;
          continue;
        }
        if (!next || next === "n" || !/[aeiouy]/.test(next)) {
          output += "ん";
          index += 1;
          continue;
        }
      }

      if (character === "t" && source.startsWith("tch", index)) {
        output += "っ";
        index += 1;
        continue;
      }
      if (character === next && /[bcdfghjkmpqrstvwxyz]/.test(character) && character !== "n") {
        output += "っ";
        index += 1;
        continue;
      }

      let matched = "";
      for (const key of romajiKeys) {
        if (source.startsWith(key, index)) {
          matched = key;
          break;
        }
      }
      if (!matched) return { text: token, complete: false, unmatchedIndex: index, unmatched: source.slice(index) };
      output += romajiToHiraganaMap[matched];
      index += matched.length;
    }

    return { text: output, complete: true, unmatchedIndex: -1, unmatched: "" };
  }

  function romajiToKana(input, script) {
    const normalized = normalizeText(input);
    const target = script === "katakana" ? "katakana" : "hiragana";
    return normalized.replace(romanTokenPattern, (token) => {
      const converted = convertRomajiToken(token, target);
      if (!converted.complete) return token;
      return target === "katakana" ? hiraganaToKatakana(converted.text) : converted.text;
    });
  }

  function findHiraganaMatch(text, index) {
    for (const key of hiraganaKeys) {
      if (text.startsWith(key, index)) return key;
    }
    return "";
  }

  function lastVowel(input) {
    const match = String(input).match(/[aeiou](?!.*[aeiou])/i);
    return match ? match[0].toLowerCase() : "";
  }

  function normalizeRomanizationOptions(options) {
    const source = options && typeof options === "object" ? options : {};
    const scheme = Object.prototype.hasOwnProperty.call(schemeOverrides, source.scheme) ? source.scheme : "hepburn";
    const longVowels = Object.prototype.hasOwnProperty.call(longVowelLabels, source.longVowels) ? source.longVowels : "written";
    const particles = Object.prototype.hasOwnProperty.call(particleLabels, source.particles) ? source.particles : "written";
    return { scheme, longVowels, particles };
  }

  function romajiForKana(kana, scheme) {
    return schemeOverrides[scheme][kana] || hiraganaToRomajiMap[kana] || "";
  }

  function isBoundary(character) {
    return !character || /[\s、。！？,.!?・「」『』（）()\[\]{}]/u.test(character);
  }

  function isStandaloneParticle(source, index, length) {
    return isBoundary(source[index - 1] || "") && isBoundary(source[index + length] || "");
  }

  function isLongVowelPair(previous, next) {
    return previous === next || (previous === "o" && next === "u") || (previous === "e" && next === "i");
  }

  function replaceLastVowelWithMacron(output, vowel) {
    const replacement = macrons[vowel] || vowel;
    for (let index = output.length - 1; index >= 0; index -= 1) {
      if (output[index].toLowerCase() === vowel) {
        return output.slice(0, index) + replacement + output.slice(index + 1);
      }
    }
    return output + replacement;
  }

  function appendLongVowel(output, vowel, policy) {
    return policy === "macron" ? replaceLastVowelWithMacron(output, vowel) : output + vowel;
  }

  function kanaToRomaji(input, requestedOptions) {
    const options = normalizeRomanizationOptions(requestedOptions);
    const source = katakanaToHiragana(input);
    let output = "";
    let index = 0;
    let geminate = false;
    let activeVowel = "";

    while (index < source.length) {
      const character = source[index];
      if (character === "っ") {
        if (geminate) output += options.scheme === "hepburn" ? "xtsu" : "xtu";
        geminate = true;
        activeVowel = "";
        index += 1;
        continue;
      }
      if (character === "ー") {
        if (geminate) {
          output += options.scheme === "hepburn" ? "xtsu" : "xtu";
          geminate = false;
          activeVowel = "";
        }
        if (activeVowel) output = appendLongVowel(output, activeVowel, options.longVowels);
        else output += "ー";
        index += 1;
        continue;
      }
      if (character === "ん") {
        if (geminate) {
          output += options.scheme === "hepburn" ? "xtsu" : "xtu";
          geminate = false;
        }
        const nextKey = findHiraganaMatch(source, index + 1);
        const nextRomaji = nextKey ? romajiForKana(nextKey, options.scheme) : "";
        output += /^[aeiouy]/.test(nextRomaji) ? "n'" : "n";
        activeVowel = "";
        index += 1;
        continue;
      }

      const matched = findHiraganaMatch(source, index);
      if (!matched) {
        if (geminate) {
          output += options.scheme === "hepburn" ? "xtsu" : "xtu";
          geminate = false;
        }
        output += character;
        activeVowel = "";
        index += 1;
        continue;
      }

      let romaji = romajiForKana(matched, options.scheme);
      if (matched.length === 1 && isStandaloneParticle(source, index, matched.length)) {
        if (options.particles === "pronunciation") {
          if (matched === "は") romaji = "wa";
          if (matched === "へ") romaji = "e";
          if (matched === "を") romaji = "o";
        } else if (matched === "を") {
          romaji = "wo";
        }
      }

      const nextVowel = matched.length === 1 && /^[あいうえお]$/.test(matched) ? romaji : "";
      if (activeVowel && nextVowel && isLongVowelPair(activeVowel, nextVowel) && options.longVowels !== "written") {
        output = appendLongVowel(output, activeVowel, options.longVowels);
        activeVowel = "";
        index += matched.length;
        continue;
      }

      if (geminate) {
        if (options.scheme === "hepburn" && /^ch/.test(romaji)) output += "t";
        else if (options.scheme === "hepburn" && /^sh/.test(romaji)) output += "s";
        else if (options.scheme === "hepburn" && /^ts/.test(romaji)) output += "t";
        else if (/^[bcdfghjklmpqrstvwxyz]/.test(romaji)) output += romaji[0];
        else output += options.scheme === "hepburn" ? "xtsu" : "xtu";
      }
      output += romaji;
      activeVowel = lastVowel(romaji);
      geminate = false;
      index += matched.length;
    }

    if (geminate) output += options.scheme === "hepburn" ? "xtsu" : "xtu";
    return output;
  }

  function pushUniqueIssue(items, issue) {
    const key = `${issue.source}\u0000${(issue.choices || []).join("\u0000")}`;
    if (!items.some((item) => `${item.source}\u0000${(item.choices || []).join("\u0000")}` === key)) {
      items.push(issue);
    }
  }

  function analyzeRomajiInput(input, script) {
    const normalized = normalizeText(input);
    const target = script === "katakana" ? "katakana" : "hiragana";
    const unconverted = [];
    const ambiguities = [];

    for (const match of normalized.matchAll(romanTokenPattern)) {
      const token = match[0];
      const converted = convertRomajiToken(token, target);
      if (!converted.complete) {
        pushUniqueIssue(unconverted, {
          source: token,
          choices: [],
          message: `「${token}」は対応するローマ字として最後まで判定できないため、そのまま残しました。`
        });
      }

      const lower = expandMacrons(token, target === "katakana").replace(/[’ʼ＇]/g, "'");
      if (lower.includes("ji")) {
        pushUniqueIssue(ambiguities, { source: "ji", choices: ["じ", "ぢ"], message: "ji は「じ」と「ぢ」の両方に使われます。" });
      }
      if (lower.includes("zu")) {
        pushUniqueIssue(ambiguities, { source: "zu", choices: ["ず", "づ"], message: "zu は「ず」と「づ」の両方に使われます。" });
      }
      if (lower.includes("zi")) {
        pushUniqueIssue(ambiguities, { source: "zi", choices: ["じ", "ぢ"], message: "zi は方式や語によって「じ」と「ぢ」の両方に使われます。" });
      }
      [["zya", "じゃ", "ぢゃ"], ["zyu", "じゅ", "ぢゅ"], ["zyo", "じょ", "ぢょ"], ["zye", "じぇ", "ぢぇ"]].forEach(([source, first, second]) => {
        if (lower.includes(source)) {
          pushUniqueIssue(ambiguities, { source, choices: [first, second], message: `${source} は方式や語によって「${first}」と「${second}」の両方に使われます。` });
        }
      });
      [["ja", "じゃ", "ぢゃ"], ["ju", "じゅ", "ぢゅ"], ["jo", "じょ", "ぢょ"], ["je", "じぇ", "ぢぇ"]].forEach(([source, first, second]) => {
        if (lower.includes(source)) {
          pushUniqueIssue(ambiguities, { source, choices: [first, second], message: `${source} は「${first}」と「${second}」の両方に使われます。` });
        }
      });
      if (/n(?!')(?=[aeiouy])/i.test(lower)) {
        pushUniqueIssue(ambiguities, {
          source: "n + 母音・y",
          choices: ["な行として読む", "n' で「ん」を区切る"],
          message: "「ん」の後に母音や y が続く場合は、n' と書くと区切りが明確です。"
        });
      }
      if (lower === "o") {
        pushUniqueIssue(ambiguities, { source: "o", choices: ["お", "を"], message: "o だけでは「お」と助詞の「を」を区別できません。" });
      }
    }

    return { unconverted, ambiguities };
  }

  function analyzeKanaInput(input, requestedOptions) {
    const options = normalizeRomanizationOptions(requestedOptions);
    const source = katakanaToHiragana(input);
    const unconverted = [];
    const ambiguities = [];

    for (let index = 0; index < source.length;) {
      const character = source[index];
      if (character === "っ" || character === "ん" || character === "ー") {
        index += 1;
        continue;
      }
      const matched = findHiraganaMatch(source, index);
      if (matched) {
        if (options.particles === "written" && matched.length === 1 && isStandaloneParticle(source, index, 1) && (matched === "は" || matched === "へ" || matched === "を")) {
          const choices = matched === "は"
            ? ["ha（表記通り）", "wa（助詞の発音）"]
            : matched === "へ"
              ? ["he（表記通り）", "e（助詞の発音）"]
              : ["wo（表記通り）", "o（助詞の発音）"];
          pushUniqueIssue(ambiguities, { source: matched, choices, message: `単独の「${matched}」は助詞として読む場合があります。助詞方針で切り替えられます。` });
        }
        index += matched.length;
        continue;
      }
      if (/^[\u3040-\u30ff]$/u.test(character)) {
        pushUniqueIssue(unconverted, { source: character, choices: [], message: `「${character}」は対応表にないため、そのまま残しました。` });
      }
      index += 1;
    }
    return { unconverted, ambiguities };
  }

  function analyze(input, direction, script, requestedOptions) {
    const options = normalizeRomanizationOptions(requestedOptions);
    const text = direction === "toRomaji" ? kanaToRomaji(input, options) : romajiToKana(input, script);
    const notes = direction === "toRomaji" ? analyzeKanaInput(input, options) : analyzeRomajiInput(input, script);
    return { text, unconverted: notes.unconverted, ambiguities: notes.ambiguities, options };
  }

  function convert(input, direction, script, requestedOptions) {
    return direction === "toRomaji" ? kanaToRomaji(input, requestedOptions) : romajiToKana(input, script);
  }

  namespace.romanKana = Object.freeze({
    romajiToHiraganaMap,
    hiraganaToRomajiMap,
    schemeLabels,
    longVowelLabels,
    particleLabels,
    normalizeText,
    normalizeRomanizationOptions,
    expandMacrons,
    hiraganaToKatakana,
    katakanaToHiragana,
    romajiToHiragana: (input) => romajiToKana(input, "hiragana"),
    romajiToKatakana: (input) => romajiToKana(input, "katakana"),
    romajiToKana,
    kanaToRomaji,
    analyze,
    convert
  });
}(window));
