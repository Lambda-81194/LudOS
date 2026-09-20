
import json
import difflib
import logging
import os
import random
import re
import threading

import numpy as np

log = logging.getLogger(__name__)


def _pick(record, *names, default="N/A"):
    """Return the first non-empty value among the given column names."""
    for name in names:
        value = record.get(name)
        if value is None or value == "":
            continue
        if isinstance(value, float) and np.isnan(value):
            continue
        return value
    return default


def _load_metadata(path, wanted_ids):
    """Load games_metadata.json, keeping only the app_ids we need.

    The Steam dataset ships this file as JSON Lines (one object per line), and
    it is large. We stream it line by line so we never hold the whole file in
    memory. Falls back to a normal JSON load for a regular array/dict file.
    """
    if not os.path.exists(path):
        log.warning("Metadata file not found: %s (tags/descriptions will be empty)", path)
        return {}

    result = {}
    with open(path, "r", encoding="utf-8") as f:
        first = ""
        for first in f:
            if first.strip():
                break
        f.seek(0)

        try:
            probe = json.loads(first)
            is_jsonl = isinstance(probe, dict) and "app_id" in probe
        except json.JSONDecodeError:
            is_jsonl = False

        if is_jsonl:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    item = json.loads(line)
                except json.JSONDecodeError:
                    continue
                key = str(item.get("app_id"))
                if key in wanted_ids:
                    result[key] = item
        else:
            raw = json.load(f)
            if isinstance(raw, dict):
                items = {str(k): v for k, v in raw.items()}
            else:
                items = {
                    str(i.get("app_id")): i for i in raw if isinstance(i, dict)
                }
            result = {k: v for k, v in items.items() if k in wanted_ids}
    return result


class RAGEngine:
    def __init__(self, data_dir="data", max_games=None):
        self.data_dir = data_dir
        # Keep the N most-reviewed games. Set MAX_GAMES=0 for everything.
        self.max_games = (
            max_games
            if max_games is not None
            else int(os.environ.get("MAX_GAMES", "10000"))
        )
        self.chunks = []
        self.vectorizer = None
        self.matrix = None
        self._initialized = False
        self._chunks_loaded = False
        self._chunk_metadata = []
        self._title_to_index = {}
        self._lock = threading.Lock()

    @property
    def chunks_path(self):
        return os.path.join(self.data_dir, "chunks.json")

    def _chunks_are_current(self):
        if not os.path.exists(self.chunks_path):
            return False
        source_paths = (
            os.path.join(self.data_dir, "games.csv"),
            os.path.join(self.data_dir, "games_metadata.json"),
        )
        chunks_mtime = os.path.getmtime(self.chunks_path)
        return all(
            not os.path.exists(path) or os.path.getmtime(path) <= chunks_mtime
            for path in source_paths
        )

    # ------------------------------------------------------------ build step
    def build_chunks(self):
        """Merge games.csv + games_metadata.json into text chunks (uses pandas)."""
        import pandas as pd

        csv_path = os.path.join(self.data_dir, "games.csv")
        json_path = os.path.join(self.data_dir, "games_metadata.json")

        if not os.path.exists(csv_path):
            log.warning("games.csv not found at %s", csv_path)
            return []

        df = pd.read_csv(csv_path)
        log.info("games.csv columns: %s", list(df.columns))

        if self.max_games and len(df) > self.max_games:
            sort_col = next(
                (c for c in ("user_reviews", "positive_ratio") if c in df.columns),
                None,
            )
            if sort_col:
                df = df.sort_values(sort_col, ascending=False)
            df = df.head(self.max_games)

        wanted = {str(x) for x in df["app_id"]} if "app_id" in df.columns else set()
        metadata = _load_metadata(json_path, wanted)
        log.info("Matched metadata for %d of %d games", len(metadata), len(df))

        chunks = []
        for record in df.to_dict("records"):
            info = metadata.get(str(record.get("app_id", "")), {})

            title = _pick(record, "title", "name", default="Unknown Title")

            price = _pick(record, "price_final", "price")
            if isinstance(price, (int, float, np.number)):
                price_str = "Free" if price == 0 else f"${price}"
            else:
                price_str = str(price)

            rating_str = str(_pick(record, "rating"))
            ratio = record.get("positive_ratio")
            if ratio is not None and not (isinstance(ratio, float) and np.isnan(ratio)):
                rating_str += f" ({ratio}% positive)"

            tags = info.get("tags") or record.get("tags") or "N/A"
            if isinstance(tags, (list, tuple)):
                tags = ", ".join(str(t) for t in tags)

            desc = info.get("description") or record.get("description") or ""

            chunks.append(
                f"Game Title: {title}\n"
                f"Price: {price_str} | Rating: {rating_str}\n"
                f"Tags/Genres: {tags}\n"
                f"Description: {desc}"
            )
        return chunks

    def save_chunks(self):
        chunks = self.build_chunks()
        os.makedirs(self.data_dir, exist_ok=True)
        with open(self.chunks_path, "w", encoding="utf-8") as f:
            json.dump(chunks, f, ensure_ascii=False)
        return len(chunks)

    # ------------------------------------------------------------- runtime
    def _ensure_chunks(self):
        if self._chunks_loaded:
            return
        with self._lock:
            if self._chunks_loaded:
                return

            if self._chunks_are_current():
                with open(self.chunks_path, "r", encoding="utf-8") as f:
                    self.chunks = json.load(f)
                log.info("Loaded %d prebuilt chunks", len(self.chunks))
            else:
                log.info("RAG source data changed; rebuilding chunks")
                self.chunks = self.build_chunks()

            self._chunk_metadata = []
            self._title_to_index = {}
            for index, chunk in enumerate(self.chunks):
                title_match = re.search(r"^Game Title:\s*(.*)$", chunk, re.MULTILINE)
                rating_match = re.search(r"\((\d+(?:\.\d+)?)%\s*positive\)", chunk)
                title = title_match.group(1).strip() if title_match else "Unknown Title"
                positive_percent = float(rating_match.group(1)) if rating_match else -1.0
                self._chunk_metadata.append((title, positive_percent, index))
                normalized_title = self._normalize_title(title)
                if normalized_title and normalized_title not in self._title_to_index:
                    self._title_to_index[normalized_title] = index
            self._chunks_loaded = True

    def _initialize(self):
        if self._initialized:
            return
        with self._lock:
            if self._initialized:
                return

        self._ensure_chunks()
        with self._lock:
            if self._initialized:
                return

            if self.chunks:
                from sklearn.feature_extraction.text import TfidfVectorizer

                self.vectorizer = TfidfVectorizer(
                    stop_words="english",
                    ngram_range=(1, 2),
                    sublinear_tf=True,
                    dtype=np.float32,
                )
                self.matrix = self.vectorizer.fit_transform(self.chunks)
            self._initialized = True

    @staticmethod
    def _normalize_title(text):
        normalized = text.casefold().replace("™", "").replace("®", "")
        normalized = re.sub(r"[^\w\s]", " ", normalized)
        return re.sub(r"\s+", " ", normalized).strip()

    def _score_query(self, query, top_k):
        self._initialize()
        if not self.chunks or self.matrix is None or self.vectorizer is None:
            return []

        q = self.vectorizer.transform([query])
        scores = np.asarray(self.matrix @ q.toarray().ravel()).ravel()  # type: ignore[attr-defined]
        return sorted(
            ((float(score), index) for index, score in enumerate(scores) if score > 0),
            reverse=True,
        )[:top_k]

    def find_game(self, text):
        self._ensure_chunks()
        if not self.chunks:
            return None

        normalized_text = self._normalize_title(text)
        exact_index = self._title_to_index.get(normalized_text)
        if exact_index is not None:
            title = self._chunk_metadata[exact_index][0]
            return title, self.chunks[exact_index]

        for normalized_title, index in sorted(
            self._title_to_index.items(), key=lambda item: len(item[0]), reverse=True
        ):
            if len(normalized_title) < 4:
                continue
            if re.search(rf"(?<!\w){re.escape(normalized_title)}(?!\w)", normalized_text):
                title = self._chunk_metadata[index][0]
                return title, self.chunks[index]

        matches = difflib.get_close_matches(
            normalized_text, list(self._title_to_index), n=1, cutoff=0.8
        )
        if matches:
            index = self._title_to_index[matches[0]]
            title = self._chunk_metadata[index][0]
            return title, self.chunks[index]
        return None

    def _similar_games(self, query, favorite_title, top_k):
        scores = self._score_query(query, len(self.chunks))
        favorite_normalized = self._normalize_title(favorite_title)
        strict = []
        relaxed = []
        for score, index in scores:
            title = self._chunk_metadata[index][0]
            normalized_title = self._normalize_title(title)
            if normalized_title == favorite_normalized:
                continue
            is_related_title = (
                favorite_normalized in normalized_title
                or normalized_title in favorite_normalized
            )
            target = relaxed if is_related_title else strict
            target.append((score, index))

        preferred = [
            item for item in strict if self._chunk_metadata[item[1]][1] >= 70
        ]
        if len(preferred) < 3:
            preferred.extend(
                item for item in strict if item not in preferred
            )
        if len(preferred) < 3:
            preferred.extend(
                item for item in relaxed if self._chunk_metadata[item[1]][1] >= 70
            )
        if len(preferred) < 3:
            preferred.extend(item for item in relaxed if item not in preferred)
        return [self.chunks[index] for _, index in preferred[:top_k]]

    def similar_games(self, chunk_text, favorite_title, top_k=6):
        tags_match = re.search(r"^Tags/Genres:\s*(.*)$", chunk_text, re.MULTILINE)
        description_match = re.search(r"^Description:\s*(.*)$", chunk_text, re.MULTILINE)
        tags = tags_match.group(1).strip() if tags_match else ""
        description = description_match.group(1).strip() if description_match else ""
        if tags.casefold() in {"", "n/a", "na"}:
            tags = ""
        if description.casefold() in {"", "n/a", "na"}:
            description = ""
        query = f"{tags} {tags} {description}".strip()
        if not query:
            query = favorite_title
        return self._similar_games(query, favorite_title, top_k)

    def similar_from_keywords(self, keywords, favorite_title, top_k=6):
        return self._similar_games(keywords, favorite_title, top_k)

    def random_game(self, min_ratio=80, exclude=None):
        self._ensure_chunks()
        if not self.chunks:
            return None

        excluded_titles = {
            title.strip().casefold() for title in (exclude or []) if title.strip()
        }

        thresholds = []
        for threshold in (min_ratio, 70, 60):
            if threshold not in thresholds:
                thresholds.append(threshold)

        for threshold in thresholds:
            pool = [
                item
                for item in self._chunk_metadata
                if item[1] >= threshold and item[0].strip().casefold() not in excluded_titles
            ]
            if pool:
                title, _, index = random.choice(pool)
                return title, self.chunks[index]

        pool = [
            item
            for item in self._chunk_metadata
            if item[0].strip().casefold() not in excluded_titles
        ]
        if not pool:
            pool = self._chunk_metadata
        if not pool:
            return None

        title, _, index = random.choice(pool)
        return title, self.chunks[index]

    def retrieve(self, query, top_k=3):
        return [self.chunks[index] for _, index in self._score_query(query, top_k)]


if __name__ == "__main__":
    # python rag.py build
    logging.basicConfig(level=logging.INFO)
    base = os.path.dirname(os.path.abspath(__file__))
    engine = RAGEngine(data_dir=os.path.join(base, "data"))
    n = engine.save_chunks()
    print(f"Wrote {n} games to {engine.chunks_path}")