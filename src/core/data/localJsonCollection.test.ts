import { describe, expect, it } from "vitest";

import {
  LocalJsonCollection,
  LocalPersistenceError,
  MemoryKeyValueStore,
} from "./localJsonCollection";

type TestRecord = {
  id: string;
  title: string;
};

function createCollection(storage: MemoryKeyValueStore) {
  return new LocalJsonCollection<TestRecord>({
    storage,
    versionKey: "test:schema-version",
    collectionKey: "test:records",
    schemaVersion: 1,
  });
}

describe("LocalJsonCollection", () => {
  it("persists records across adapter instances", () => {
    const storage = new MemoryKeyValueStore();
    const firstCollection = createCollection(storage);

    firstCollection.save({ id: "one", title: "Saved" });
    const restartedCollection = createCollection(storage);

    expect(restartedCollection.getById("one")).toEqual({ id: "one", title: "Saved" });
  });

  it("creates a migration version marker", () => {
    const storage = new MemoryKeyValueStore();

    createCollection(storage);

    expect(storage.getItem("test:schema-version")).toBe("1");
  });

  it("supports deletion", () => {
    const storage = new MemoryKeyValueStore();
    const collection = createCollection(storage);

    collection.save({ id: "one", title: "Saved" });
    collection.delete("one");

    expect(collection.list()).toEqual([]);
  });

  it("fails safely when local records are corrupt", () => {
    const storage = new MemoryKeyValueStore();
    createCollection(storage);
    storage.setItem("test:records", "{not json");

    expect(() => createCollection(storage).list()).toThrow(LocalPersistenceError);
  });
});
