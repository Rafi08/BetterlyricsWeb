import { XMLParser } from "fast-xml-parser";

export interface LyricWord {
  startTime: number;
  endTime: number;
  word: string;
  romanWord: string;
}

export interface LyricLine {
  startTime: number;
  endTime: number;
  words: LyricWord[];
  isDuet: boolean;
  isBG: boolean; // Background vocal
  translatedLyric: string;
  romanLyric: string;
}

export interface TTMLLyric {
  lines: LyricLine[];
  metadata: Map<string, string[]>;
}

const ADD_INTERLUDE_MS_SPACE = 5000;
const INTERLUDE_CHARACTER = "♪";

/**
 * Parses TTML timestamp strings (e.g., "00:01:10.254", "10.24s") into milliseconds.
 * @param timeStr The timestamp string from the TTML file.
 * @returns Total time in milliseconds, or null if parsing fails.
 */
function parseTimestamp(timeStr: string): number | null {
  if (!timeStr) return null;
  const timeRegex = /^(?:(\d{2,3}):)?(\d{1,2}):(\d{1,2})(?:[.](\d+))?|(\d+(?:\.\d+)?)(s?)$/;
  const match = timeStr.match(timeRegex);

  if (!match) return null;

  // Full HH:MM:SS.ms or MM:SS.ms format
  if (match[1] !== undefined || match[2] !== undefined) {
    const hours = match[1] ? parseInt(match[1], 10) : 0;
    const minutes = parseInt(match[2], 10);
    const seconds = parseInt(match[3], 10);
    const fractionStr = match[4] || "0";
    const milliseconds = parseFloat(`0.${fractionStr}`) * 1000;
    return (hours * 3600 + minutes * 60 + seconds) * 1000 + milliseconds;
  }

  // Seconds format (e.g., 10.24s or 10.24)
  if (match[5] !== undefined) {
    return parseFloat(match[5]) * 1000;
  }

  return null;
}

/**
 * Parses a TTML string into a structured TTMLLyric object.
 * @param ttmlString The raw TTML content as a string.
 * @returns A Promise that resolves with the parsed TTMLLyric object.
 */
export function parseTTML(ttmlString: string): Promise<TTMLLyric> {
  return new Promise((resolve, reject) => {
    const result: TTMLLyric = {
      lines: [],
      metadata: new Map(),
    };

    const options = {
      ignoreAttributes: false,
      attributeNamePrefix: "",
      textNodeName: "#text",
      // Ensure these tags are always arrays for consistent processing
      isArray: (name: string) =>
        ["p", "span", "ttm:agent", "amll:meta", "text", "div"].includes(name),
      trimValues: false,
    };

    try {
      const parser = new XMLParser(options);
      const jsonObj = parser.parse(ttmlString);

      if (!jsonObj.tt) {
        throw new Error("Invalid TTML structure: missing <tt> root element.");
      }
      const tt = jsonObj.tt;

      // --- iTunes Metadata Specific Variables ---
      const itunesTranslations = new Map<string, string>();
      const itunesTransliterations = new Map<string, string>();
      const itunesTransliterationPieces = new Map<string, string[]>();
      const lineKeyMap: { index: number; key: string }[] = [];

      // --- 1. Parse Metadata ---
      // Find main agent
      const Agents = tt.head.metadata["ttm:agent"];
      const PostAgents = Agents != null ? (Array.isArray(Agents) ? Agents : [Agents]) : [];

      // Determine if an agent represents an opposite alignment based on its ID
      const isOppositeAlignedAgent = (agent: any) => {
        const agentId = agent["xml:id"];
        // v1 is always the main vocal track
        if (agentId === "v1") return false;
        // v2000 and v2 are typically opposite aligned
        if (agentId === "v2000" || agentId === "v2") return true;
        return false;
      };

      const TrackAgents =
        PostAgents.length > 0
          ? PostAgents.map((agent) => {
              return {
                Type: agent.type,
                Id: agent["xml:id"],
                OppositeAligned: isOppositeAlignedAgent(agent),
              };
            })
          : [];

      if (tt.head?.metadata) {
        // Find amll:meta
        const amllMetas = tt.head.metadata["amll:meta"] || [];
        for (const meta of amllMetas) {
          if (meta.key && meta.value) {
            if (!result.metadata.has(meta.key)) {
              result.metadata.set(meta.key, []);
            }
            result.metadata.get(meta.key).push(meta.value);
          }
        }

        // Find iTunes metadata
        const itunesMeta = tt.head.metadata.itunesmetadata;
        if (itunesMeta) {
          const translations = itunesMeta.translations?.text || [];
          for (const trans of translations) {
            if (trans.for && trans["#text"]) {
              itunesTranslations.set(trans.for, trans["#text"]);
            }
          }
          const transliterations = itunesMeta.transliterations?.text || [];
          for (const trans of transliterations) {
            if (trans.for) {
              const fullText = Array.isArray(trans["#text"])
                ? trans["#text"].join("")
                : trans["#text"] || "";
              itunesTransliterations.set(trans.for, fullText);

              const pieces = (trans.span || []).map((s: any) => s["#text"] || "");
              itunesTransliterationPieces.set(trans.for, pieces);
            }
          }
        }
      }

      const IsPartOfWord = (spans: any[], index: number) => {
        if (!spans || spans.length <= 0) return false;
        const nextSpan = spans[index + 1];
        const span = spans[index];
        let isPartOfWord = false;
        if (nextSpan) {
          // Condition 1: Check tag adjacency
          let tagsAreAdjacent = false;
          const endMarker = `end="${span.end}"`;
          const endMarkerIndex = ttmlString.indexOf(endMarker);
          if (endMarkerIndex !== -1) {
            const closingTagIndex = ttmlString.indexOf("</span>", endMarkerIndex);
            if (closingTagIndex !== -1) {
              const positionAfterCloseTag = closingTagIndex + "</span>".length;
              if (
                ttmlString.length > positionAfterCloseTag &&
                ttmlString.charAt(positionAfterCloseTag) === "<"
              ) {
                tagsAreAdjacent = true;
              }
            }
          }

          // Condition 2: Check if the NEXT span's text starts with whitespace
          let nextTextStartsWithSpace = false;
          if (nextSpan["#text"] !== undefined) {
            const nextText = nextSpan["#text"]?.toString() || "";
            if (/^\s/.test(nextText)) {
              nextTextStartsWithSpace = true;
            }
          }

          // Condition 3: Check if the CURRENT span's text ends with a comma
          let currentTextEndsWithComma = false;
          if (span["#text"] !== undefined) {
            currentTextEndsWithComma = span["#text"]?.toString()?.trim().endsWith(",");
          }

          // Condition 4: Check if the CURRENT span's text ends with whitespace
          const currentTextEndsWithWhitespace = /\s$/.test(span["#text"]?.toString() ?? "");

          // Combine: True only if tags are adjacent AND next text doesn't start with space AND current text doesn't end with comma AND current text doesn't end with whitespace
          if (
            tagsAreAdjacent &&
            !nextTextStartsWithSpace &&
            !currentTextEndsWithComma &&
            !currentTextEndsWithWhitespace
          ) {
            isPartOfWord = true;
          }
        }
        return isPartOfWord;
      };

      // --- 2. Parse Body Content ---
      const divs = tt.body?.div || [];
      for (const div of divs) {
        const paragraphs = div.p || [];
        for (const p of paragraphs) {
          const pContent = Array.isArray(p["#text"])
            ? p["#text"].concat(p.span || [])
            : [p["#text"], ...(p.span || [])].filter(Boolean);

          // Determine the agent ID for the current p element, falling back to div and then body
          const pAgentId = p["ttm:agent"] || div["ttm:agent"] || tt.body["ttm:agent"];
          // Find the corresponding agent in TrackAgents
          const trackAgent = TrackAgents.find((a) => a.Id === pAgentId);
          // Determine the OppositeAligned status
          const isOpposite = trackAgent ? trackAgent.OppositeAligned : false;

          const mainLine: LyricLine = {
            startTime: parseTimestamp(p.begin) ?? 0,
            endTime: parseTimestamp(p.end) ?? 0,
            words: [],
            isDuet: isOpposite,
            isBG: false,
            translatedLyric: "",
            romanLyric: "",
          };

          const itunesKey = p["itunes:key"];
          if (itunesKey) {
            lineKeyMap.push({ index: result.lines.length, key: itunesKey });
            mainLine.translatedLyric = itunesTranslations.get(itunesKey) || "";
            mainLine.romanLyric = itunesTransliterations.get(itunesKey) || "";
          }
          result.lines.push(mainLine);

          for (let i = 0; i < pContent.length; i++) {
            const item = pContent[i];
            if (typeof item === "string") {
              // Text directly in <p> is a word without timing
              mainLine.words.push({
                word: item,
                startTime: 0,
                endTime: 0,
                romanWord: "",
              });
            } else if (typeof item === "object" && item !== null) {
              // This is a <span> element
              const role = item["ttm:role"];
              const text = item["#text"] || "";

              if (role === "x-translation") {
                if (mainLine.translatedLyric === "") mainLine.translatedLyric = text;
              } else if (role === "x-roman") {
                if (mainLine.romanLyric === "") mainLine.romanLyric = text;
              } else if (role === "x-bg") {
                // --- MODIFIED SECTION START ---
                // Background line words are now appended to the current line
                const bgWords: LyricWord[] = [];
                const bgContent = Array.isArray(item["#text"])
                  ? item["#text"].concat(item.span || [])
                  : [item["#text"], ...(item.span || [])].filter(Boolean);

                for (let bgIndex = 0; bgIndex < bgContent.length; bgIndex++) {
                  const bgItem = bgContent[bgIndex];
                  if (typeof bgItem === "object" && bgItem !== null) {
                    const bgRole = bgItem["ttm:role"];
                    // We only care about actual words inside the bg span
                    if (bgRole !== "x-translation" && bgRole !== "x-roman") {
                      const bgText = bgItem["#text"] || "";
                      bgWords.push({
                        startTime: parseTimestamp(bgItem.begin) ?? 0,
                        endTime: parseTimestamp(bgItem.end) ?? 0,
                        word: IsPartOfWord(bgContent, bgIndex) ? `${bgText}` : `${bgText} `,
                        romanWord: "",
                      });
                    }
                  }
                }

                if (bgWords.length > 0) {
                  // Add opening parenthesis to the first word
                  bgWords[0].word = `${bgWords[0].word.trimStart()}`;

                  // Add closing parenthesis to the last word
                  const lastBgWordIndex = bgWords.length - 1;
                  bgWords[lastBgWordIndex].word = `${bgWords[lastBgWordIndex].word.trimEnd()} `;

                  // Append these processed words to the main line
                  mainLine.words.push(...bgWords);
                }
                // --- MODIFIED SECTION END ---
              } else {
                // Regular timed word
                mainLine.words.push({
                  startTime: parseTimestamp(item.begin) ?? 0,
                  endTime: parseTimestamp(item.end) ?? 0,
                  word: IsPartOfWord(pContent, i) ? `${text}` : `${text} `,
                  romanWord: "",
                });
              }
            }
          }
        }
      }

      // --- 3. Post-processing ---
      // The old logic for trimming parentheses from separate BG lines is no longer needed.

      // Map iTunes word-by-word transliterations
      lineKeyMap.forEach(({ index, key }) => {
        const line = result.lines[index];
        const pieces = itunesTransliterationPieces.get(key);

        if (line && !line.isBG && pieces) {
          const wordIndices = line.words.map((w, i) => (w.word ? i : -1)).filter((i) => i !== -1);

          if (wordIndices.length === 0 || pieces.length === 0) return;

          const finalPieces = [...pieces];
          if (finalPieces.length > wordIndices.length) {
            const extras = finalPieces.splice(wordIndices.length - 1).join(" ");
            finalPieces.push(extras);
          }

          wordIndices.forEach((wordIndex, i) => {
            if (i < finalPieces.length) {
              line.words[wordIndex].romanWord = finalPieces[i];
            }
          });
        }
      });

      // Add interludes for long pauses between lines
      if (result.lines.length > 0) {
        const linesWithInterludes: LyricLine[] = [];
        for (let i = 0; i < result.lines.length; i++) {
          const currentLine = result.lines[i];
          linesWithInterludes.push(currentLine);

          // Check for a gap between the current line and the next one
          const nextLine = result.lines[i + 1];
          if (nextLine) {
            const timeGap = nextLine.startTime - currentLine.endTime;
            if (timeGap >= ADD_INTERLUDE_MS_SPACE) {
              const interludeLine: LyricLine = {
                startTime: currentLine.endTime,
                endTime: nextLine.startTime,
                words: [
                  {
                    startTime: currentLine.endTime,
                    endTime: currentLine.endTime + 1,
                    word: INTERLUDE_CHARACTER,
                    romanWord: "",
                  },
                ],
                isDuet: false,
                isBG: false,
                translatedLyric: "",
                romanLyric: "",
              };
              linesWithInterludes.push(interludeLine);
            }
          }
        }
        result.lines = linesWithInterludes;
      }

      resolve(result);
    } catch (error: any) {
      reject(new Error(`XML parsing error: ${error.message}`));
    }
  });
}
