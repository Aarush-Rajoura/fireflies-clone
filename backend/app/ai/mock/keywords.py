"""TF-IDF keywords with each transcript line treated as a document.

A term that recurs across several lines (but not all of them) is a topic; a
term said once is noise; a term in every line is filler. Bigrams that recur
are preferred over their parts because "annual billing" says more than
"billing".
"""

import math
from collections import Counter
from collections.abc import Sequence

from app.ai.mock.text_utils import is_content, sentences, words
from app.ai.types import KeywordResult

MAX_KEYWORDS = 6
# Phrases beat single words when they recur; the boost is modest so a word
# that dominates the meeting still wins.
_BIGRAM_BOOST = 1.5


def terms(text: str, exclude: frozenset[str] = frozenset()) -> list[str]:
    """Content unigrams, then bigrams of content words that are adjacent in a sentence.

    Adjacent in the original text (no stopword between), so a bigram is a
    phrase someone actually said - "replay tool", not "send deck".
    """
    unigrams: list[str] = []
    bigrams: list[str] = []
    for sentence in sentences(text):
        tokens = [w if is_content(w, exclude) else None for w in words(sentence)]
        unigrams += [w for w in tokens if w]
        pairs = zip(tokens, tokens[1:], strict=False)
        bigrams += [f"{a} {b}" for a, b in pairs if a and b and a != b]
    return unigrams + bigrams


def tfidf(tf: Counter[str], df: Counter[str], n_docs: int) -> dict[str, float]:
    scores: dict[str, float] = {}
    for term, count in tf.items():
        is_bigram = " " in term
        if is_bigram and count < 2:
            continue  # a phrase said once is a coincidence, not a topic
        idf = math.log((n_docs + 1) / (df[term] + 0.5)) + 1.0
        scores[term] = count * idf * (_BIGRAM_BOOST if is_bigram else 1.0)
    return scores


def score_terms(texts: Sequence[str], exclude: frozenset[str] = frozenset()) -> dict[str, float]:
    """TF-IDF score of every unigram and bigram over the given documents."""
    docs = [terms(text, exclude) for text in texts]
    tf: Counter[str] = Counter(term for doc in docs for term in doc)
    df: Counter[str] = Counter(term for doc in docs for term in set(doc))
    return tfidf(tf, df, len(docs))


def top_keywords(
    texts: Sequence[str], exclude: frozenset[str] = frozenset(), limit: int = MAX_KEYWORDS
) -> list[KeywordResult]:
    scores = score_terms(texts, exclude)
    # Ties broken by the term itself so output never depends on dict order.
    ranked = sorted(scores.items(), key=lambda kv: (-kv[1], kv[0]))
    chosen: list[tuple[str, float]] = []
    for term, score in ranked:
        if len(chosen) == limit:
            break
        # Skip a word already covered by a chosen phrase (and vice versa) so six
        # slots are six topics, not "pricing", "tiers" and "pricing tiers".
        parts = set(term.split())
        if any(parts & set(other.split()) for other, _ in chosen):
            continue
        chosen.append((term, score))
    if not chosen:
        return []
    best = chosen[0][1]
    return [KeywordResult(term=t, weight=round(s / best, 3)) for t, s in chosen]
