import MiniSearch from "minisearch";

type SearchCard = {
  id: string;
  name: string;
};

let cardSearchIndexPromise: Promise<MiniSearch<SearchCard>> | null = null;

export function loadCardSearchIndex() {
  cardSearchIndexPromise ??= fetch("/data/card-name-search-index.json")
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
    );

  return cardSearchIndexPromise;
}
