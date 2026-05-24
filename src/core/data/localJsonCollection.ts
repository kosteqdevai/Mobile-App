export type KeyValueStore = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
};

export type LocalPersistenceErrorCode =
  | "storage-unavailable"
  | "schema-version-unsupported"
  | "records-corrupt"
  | "write-failed";

export class LocalPersistenceError extends Error {
  constructor(
    readonly code: LocalPersistenceErrorCode,
    message: string,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = "LocalPersistenceError";
  }
}

export class MemoryKeyValueStore implements KeyValueStore {
  private readonly values = new Map<string, string>();

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }

  removeItem(key: string) {
    this.values.delete(key);
  }
}

type LocalJsonCollectionOptions<TRecord extends { id: string }> = {
  storage: KeyValueStore;
  versionKey: string;
  collectionKey: string;
  schemaVersion: number;
  initialRecords?: ReadonlyArray<TRecord>;
};

export class LocalJsonCollection<TRecord extends { id: string }> {
  private readonly storage: KeyValueStore;
  private readonly versionKey: string;
  private readonly collectionKey: string;
  private readonly schemaVersion: string;

  constructor(options: LocalJsonCollectionOptions<TRecord>) {
    this.storage = options.storage;
    this.versionKey = options.versionKey;
    this.collectionKey = options.collectionKey;
    this.schemaVersion = String(options.schemaVersion);

    this.ensureSchemaVersion();

    if (!this.storage.getItem(this.collectionKey) && options.initialRecords) {
      this.writeRecords(options.initialRecords);
    }
  }

  save(record: TRecord) {
    const records = this.readRecords();
    const nextRecords = records.some((candidate) => candidate.id === record.id)
      ? records.map((candidate) =>
          candidate.id === record.id ? structuredClone(record) : candidate,
        )
      : [...records, structuredClone(record)];

    this.writeRecords(nextRecords);
  }

  getById(recordId: string) {
    return this.readRecords().find((record) => record.id === recordId);
  }

  list() {
    return this.readRecords();
  }

  delete(recordId: string) {
    this.writeRecords(this.readRecords().filter((record) => record.id !== recordId));
  }

  private ensureSchemaVersion() {
    const currentVersion = this.storage.getItem(this.versionKey);

    if (!currentVersion) {
      this.storage.setItem(this.versionKey, this.schemaVersion);
      return;
    }

    if (currentVersion !== this.schemaVersion) {
      throw new LocalPersistenceError(
        "schema-version-unsupported",
        `Local data schema ${currentVersion} is not supported by schema ${this.schemaVersion}.`,
      );
    }
  }

  private readRecords(): TRecord[] {
    const raw = this.storage.getItem(this.collectionKey);

    if (!raw) {
      return [];
    }

    try {
      const parsed = JSON.parse(raw) as unknown;

      if (!Array.isArray(parsed)) {
        throw new Error("Expected an array of records.");
      }

      return parsed.map((record) => {
        if (!isRecordWithId(record)) {
          throw new Error("Record is missing an id.");
        }

        return structuredClone(record) as TRecord;
      });
    } catch (error) {
      throw new LocalPersistenceError(
        "records-corrupt",
        "Local records could not be read safely.",
        error,
      );
    }
  }

  private writeRecords(records: ReadonlyArray<TRecord>) {
    try {
      this.storage.setItem(this.collectionKey, JSON.stringify(records));
    } catch (error) {
      throw new LocalPersistenceError("write-failed", "Local records could not be saved.", error);
    }
  }
}

function isRecordWithId(value: unknown): value is { id: string } {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    typeof (value as { id: unknown }).id === "string"
  );
}
