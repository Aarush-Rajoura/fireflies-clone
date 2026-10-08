"""Tokenising and sentence helpers shared by the mock heuristics."""

import re

from app.ai.types import TranscriptForAI

# Function words, meeting filler and conversational glue: none of them ever
# names a topic, so they never become keywords, chapter titles or query terms.
STOPWORDS = frozenset(
    """
    a about above after again against all also am an and any are aren't as at be because been
    before being below between both but by can can't could couldn't did didn't do does doesn't
    doing don't down during each few for from further had hadn't has hasn't have haven't having
    he he'd he'll he's her here here's hers herself him himself his how how's i i'd i'll i'm i've
    if in into is isn't it it's its itself let's me more most mustn't my myself no nor not of off
    on once only or other ought our ours ourselves out over own same shan't she she'd she'll
    she's should shouldn't so some such than that that's the their theirs them themselves then
    there there's these they they'd they'll they're they've this those through to too under
    until up very was wasn't we we'd we'll we're we've were weren't what what's when when's where
    where's which while who who's whom why why's will with won't would wouldn't you you'd you'll
    you're you've your yours yourself yourselves
    yeah yes yep okay ok oh um uh hmm right just really actually basically like well sure great
    thanks thank thing things stuff kind sort lot lots get got getting go going gonna want wanna
    need needs think know mean say said see make made let still already maybe probably much many
    one two three first next last today now everyone everybody all anyway agreed good
    could would should might may must also even back way time item items topic up
    action ask asked asking send sent show shows put take took give gave keep come came start
    started look looking looks feel feels felt sounds sound works done tell told talk talking
    happen happened call called try trying use using bring brought walk run ran
    pretty quick quickly little bit around across roughly exactly enough though since whether
    every another someone anyone something anything everything nothing people folks guys part
    point question idea without safe sense honest fine plan plans case saw seen write new
    confirm per goes going via
    please alright hey hi hello nope yup totally definitely literally obviously honestly
    guess gotta kinda sorta cool awesome perfect nice super basically seems seem seemed
    whatever somewhat somehow anyway anyways bunch couple certainly simply truly
    lost depend depends depending happy glad sorry worry worried behind ahead wait waiting
    asks update updates list
    four five six seven eight nine ten twenty thirty forty fifty hundred thousand million
    percent second seconds minute minutes hour hours day days week weeks month months year years
    yesterday tomorrow tonight morning afternoon monday tuesday wednesday thursday friday
    january february march april june july august september october november december
    """.split()
)

_WORD = re.compile(r"[a-z][a-z0-9'-]*[a-z0-9]|[a-z]")
_SENTENCE_END = re.compile(r"(?<=[.!?])\s+")


def words(text: str) -> list[str]:
    """Lower-cased word tokens, apostrophes kept so contractions hit the stopword list.

    A possessive "'s" is dropped ("Kofi's budget" -> "kofi", "budget"), so names and
    topics match however they are inflected; "it's"/"that's" fold to stopwords too.
    """
    return [w.removesuffix("'s") for w in _WORD.findall(text.lower().replace("’", "'"))]


def is_content(word: str, exclude: frozenset[str] = frozenset()) -> bool:
    return word not in STOPWORDS and word not in exclude and len(word) > 2


def content_words(text: str, exclude: frozenset[str] = frozenset()) -> list[str]:
    return [w for w in words(text) if is_content(w, exclude)]


def stem(word: str) -> str:
    """Crude plural folding so "tiers" matches "tier" in Q&A; nothing fancier is needed."""
    if len(word) > 4 and word.endswith("ies"):
        return word[:-3] + "y"
    if len(word) > 3 and word.endswith("s") and not word.endswith("ss"):
        return word[:-1]
    return word


def sentences(text: str) -> list[str]:
    return [s.strip() for s in _SENTENCE_END.split(text.strip()) if s.strip()]


def as_sentence(text: str) -> str:
    """Capitalised and terminated, so composed prose reads as whole sentences."""
    text = text.strip().rstrip(",;:-")
    if not text:
        return text
    text = text[0].upper() + text[1:]
    return text if text[-1] in ".!?" else text + "."


def speaker_name_tokens(t: TranscriptForAI) -> frozenset[str]:
    """Every word of every speaker and participant name - names are people, not topics."""
    names = [line.speaker for line in t.lines] + list(t.participants)
    return frozenset(w for name in names for w in words(name))


def fmt_ms(ms: int) -> str:
    seconds = ms // 1000
    return f"{seconds // 60:02d}:{seconds % 60:02d}"
