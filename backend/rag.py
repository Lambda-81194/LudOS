import json
import os
import numpy as np
import pandas as pd
from sentence_transformers import SentenceTransformer


class RAGEngine:

    def __init__(self, data_dir="data"):
        self.embedder = SentenceTransformer("all-MiniLM-L6-v2")
        self.chunks = []
        self.embeddings = None
        self._load_and_process_data(data_dir)

    def _load_and_process_data(self, data_dir):
        games_csv_path = os.path.join(data_dir, "games.csv")
        json_path = os.path.join(data_dir, "games_metadata.json")

        # 1. Load CSV data
        df_games = (
            pd.read_csv(games_csv_path)
            if os.path.exists(games_csv_path)
            else pd.DataFrame()
        )

        # 2. Load JSON metadata (mapped by app_id)
        metadata_dict = {}
        if os.path.exists(json_path):
            with open(json_path, "r", encoding="utf-8") as f:
                try:
                    raw_data = json.load(f)
                    if isinstance(raw_data, list):
                        metadata_dict = {
                            str(item.get("app_id")): item for item in raw_data
                        }
                    elif isinstance(raw_data, dict):
                        metadata_dict = raw_data
                except json.JSONDecodeError:
                    pass

        # 3. Create enriched chunks combining both sources
        for _, row in df_games.iterrows():
            app_id = str(row.get("app_id", ""))
            title = row.get("title", "Unknown Title")
            price = row.get("price", "N/A")
            rating = row.get("rating", "N/A")

            # Extract matching JSON details
            json_info = metadata_dict.get(app_id, {})
            tags = json_info.get("tags", "N/A")
            desc = json_info.get("description", row.get("description", ""))

            chunk = (
                f"Game Title: {title}\n"
                f"Price: ${price} | Rating: {rating}\n"
                f"Tags/Genres: {tags}\n"
                f"Description: {desc}"
            )
            self.chunks.append(chunk)

        # 4. Generate embeddings for the unified chunks
        if self.chunks:
            self.embeddings = self.embedder.encode(self.chunks)

    def retrieve(self, query, top_k=3):
        """Finds the top_k most relevant game chunks for a query."""
        if not self.chunks or self.embeddings is None:
            return []

        query_vec = self.embedder.encode([query])[0]
        similarities = np.dot(self.embeddings, query_vec) / (
            np.linalg.norm(self.embeddings, axis=1) * np.linalg.norm(query_vec)
        )
        top_indices = np.argsort(similarities)[::-1][:top_k]
        return [self.chunks[i] for i in top_indices]