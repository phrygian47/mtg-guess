import MiniSearch from "minisearch";

import { fetchWithRetry } from "@/lib/http/fetchWithRetry";

type SearchCard = {
  id: string;
  name: string;
};

let cardSearchIndexPromise: Promise<MiniSearch<SearchCard>> | null = null;

export function loadCardSearchIndex() {
  cardSearchIndexPromise ??= fetchWithRetry("/data/card-name-search-index.json")
    .then((res) => {
      if (!res.ok) throw new Error("Failed to load card search index");
      return res.text();
    })
    .then((json) =>
      MiniSearch.loadJSON<SearchCard>(json, {
        idField: "id",
        fields: ["name"],
        storeFields: ["id", "name"],
        searchOptions: {
          prefix: true,
          fuzzy: 0.2,
        },
      }),
    )
    .catch((error) => {
      // Don't keep a failed load around, or every later search would reuse it.
      cardSearchIndexPromise = null;
      throw error;
    });

  return cardSearchIndexPromise;
}
