import json
import logging
import os
import threading

import numpy as np

log = logging.getLogger(__name__)


def _pick(record, *names, default="N/A"):
    for name in names:
        value = record.get(name)
        if value is None or value == "":
            continue
        if isinstance(value, float) and np.isnan(value):
            continue
        return value
    return default


def _load_metadata(path, wanted_ids):
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
        self.hasher = None
        self.tfidf = None
        self.matrix = None
        self._initialized = False
        self._lock = threading.Lock()

    @property
    def chunks_path(self):
        return os.path.join(self.data_dir, "chunks.json")

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
    def _initialize(self):
        if self._initialized:
            return
        with self._lock:
            if self._initialized:
                return

            if os.path.exists(self.chunks_path):
                with open(self.chunks_path, "r", encoding="utf-8") as f:
                    self.chunks = json.load(f)
                log.info("Loaded %d prebuilt chunks", len(self.chunks))
            else:
                log.warning("chunks.json not found; building from CSV at runtime")
                self.chunks = self.build_chunks()

            if self.chunks:
                from sklearn.feature_extraction.text import (
                    HashingVectorizer,
                    TfidfTransformer,
                )

                self.hasher = HashingVectorizer(
                    stop_words="english",
                    ngram_range=(1, 2),
                    n_features=2**18,
                    alternate_sign=False,
                    norm=None,  # type: ignore[arg-type]
                    dtype=np.float32,
                )
                self.tfidf = TfidfTransformer(sublinear_tf=True)
                self.matrix = self.tfidf.fit_transform(self.hasher.transform(self.chunks))
            self._initialized = True

    def retrieve(self, query, top_k=3):
        self._initialize()
        if (
            not self.chunks
            or self.matrix is None
            or self.hasher is None
            or self.tfidf is None
        ):
            return []

        q = self.tfidf.transform(self.hasher.transform([query]))
        # Rows are L2-normalised, so a dot product is cosine similarity.
        scores = np.asarray(self.matrix @ q.toarray().ravel()).ravel()  # type: ignore[attr-defined]
        top = np.argsort(scores)[::-1][:top_k]
        return [self.chunks[i] for i in top if scores[i] > 0]


if __name__ == "__main__":
    # python rag.py build
    logging.basicConfig(level=logging.INFO)
    base = os.path.dirname(os.path.abspath(__file__))
    engine = RAGEngine(data_dir=os.path.join(base, "data"))
    n = engine.save_chunks()
    print(f"Wrote {n} games to {engine.chunks_path}")