export const LOCAL_DATABASE_NAME = "lacucina";
export const LOCAL_DATABASE_SCHEMA_VERSION = 3;

export const LOCAL_DATABASE_STORE_NAMES = [
  "recipes",
  "cookbooks",
  "mealPlans",
  "recipeComponents",
] as const;

export type LocalDatabaseStoreName = (typeof LOCAL_DATABASE_STORE_NAMES)[number];

export type LocalDatabaseRecord = {
  id: string;
};

export type LocalDatabaseErrorCode = "database-unavailable" | "records-corrupt" | "write-failed";

export class LocalDatabaseError extends Error {
  constructor(
    readonly code: LocalDatabaseErrorCode,
    message: string,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = "LocalDatabaseError";
  }
}

export type LocalDatabase = {
  get<TRecord extends LocalDatabaseRecord>(
    storeName: LocalDatabaseStoreName,
    recordId: string,
  ): Promise<TRecord | undefined>;
  list<TRecord extends LocalDatabaseRecord>(
    storeName: LocalDatabaseStoreName,
  ): Promise<ReadonlyArray<TRecord>>;
  put<TRecord extends LocalDatabaseRecord>(
    storeName: LocalDatabaseStoreName,
    record: TRecord,
  ): Promise<void>;
  delete(storeName: LocalDatabaseStoreName, recordId: string): Promise<void>;
};

export class MemoryLocalDatabase implements LocalDatabase {
  private readonly stores = new Map<LocalDatabaseStoreName, Map<string, LocalDatabaseRecord>>();

  constructor() {
    LOCAL_DATABASE_STORE_NAMES.forEach((storeName) => {
      this.stores.set(storeName, new Map());
    });
  }

  async get<TRecord extends LocalDatabaseRecord>(
    storeName: LocalDatabaseStoreName,
    recordId: string,
  ) {
    const record = this.storeFor(storeName).get(recordId);
    return record ? (structuredClone(record) as TRecord) : undefined;
  }

  async list<TRecord extends LocalDatabaseRecord>(storeName: LocalDatabaseStoreName) {
    return Array.from(this.storeFor(storeName).values()).map(
      (record) => structuredClone(record) as TRecord,
    );
  }

  async put<TRecord extends LocalDatabaseRecord>(
    storeName: LocalDatabaseStoreName,
    record: TRecord,
  ) {
    this.storeFor(storeName).set(record.id, structuredClone(record));
  }

  async delete(storeName: LocalDatabaseStoreName, recordId: string) {
    this.storeFor(storeName).delete(recordId);
  }

  private storeFor(storeName: LocalDatabaseStoreName) {
    const store = this.stores.get(storeName);

    if (!store) {
      throw new LocalDatabaseError(
        "database-unavailable",
        `Local database store ${storeName} is not available.`,
      );
    }

    return store;
  }
}

export class MigratingLocalDatabase implements LocalDatabase {
  private migrationPromise: Promise<void> | undefined;

  constructor(
    private readonly database: LocalDatabase,
    private readonly migrate: () => Promise<void>,
  ) {}

  async get<TRecord extends LocalDatabaseRecord>(
    storeName: LocalDatabaseStoreName,
    recordId: string,
  ) {
    await this.ensureReady();
    return this.database.get<TRecord>(storeName, recordId);
  }

  async list<TRecord extends LocalDatabaseRecord>(storeName: LocalDatabaseStoreName) {
    await this.ensureReady();
    return this.database.list<TRecord>(storeName);
  }

  async put<TRecord extends LocalDatabaseRecord>(
    storeName: LocalDatabaseStoreName,
    record: TRecord,
  ) {
    await this.ensureReady();
    await this.database.put(storeName, record);
  }

  async delete(storeName: LocalDatabaseStoreName, recordId: string) {
    await this.ensureReady();
    await this.database.delete(storeName, recordId);
  }

  private async ensureReady() {
    this.migrationPromise ??= this.migrate().catch((error: unknown) => {
      this.migrationPromise = undefined;
      throw error;
    });

    await this.migrationPromise;
  }
}

export class BrowserIndexedDbDatabase implements LocalDatabase {
  private databasePromise: Promise<IDBDatabase> | undefined;

  constructor(
    private readonly databaseName = LOCAL_DATABASE_NAME,
    private readonly schemaVersion = LOCAL_DATABASE_SCHEMA_VERSION,
  ) {}

  async get<TRecord extends LocalDatabaseRecord>(
    storeName: LocalDatabaseStoreName,
    recordId: string,
  ) {
    const record = await this.runRequest<unknown>(storeName, "readonly", (store) =>
      store.get(recordId),
    );

    if (record === undefined) {
      return undefined;
    }

    if (!isLocalDatabaseRecord(record)) {
      throw new LocalDatabaseError(
        "records-corrupt",
        `Local database record ${recordId} in ${storeName} is missing an id.`,
      );
    }

    return structuredClone(record) as TRecord;
  }

  async list<TRecord extends LocalDatabaseRecord>(storeName: LocalDatabaseStoreName) {
    const records = await this.runRequest<unknown[]>(storeName, "readonly", (store) =>
      store.getAll(),
    );

    if (!Array.isArray(records) || !records.every(isLocalDatabaseRecord)) {
      throw new LocalDatabaseError(
        "records-corrupt",
        `Local database store ${storeName} has unreadable records.`,
      );
    }

    return records.map((record) => structuredClone(record) as TRecord);
  }

  async put<TRecord extends LocalDatabaseRecord>(
    storeName: LocalDatabaseStoreName,
    record: TRecord,
  ) {
    await this.runRequest<IDBValidKey>(storeName, "readwrite", (store) =>
      store.put(structuredClone(record)),
    );
  }

  async delete(storeName: LocalDatabaseStoreName, recordId: string) {
    await this.runRequest<undefined>(storeName, "readwrite", (store) => store.delete(recordId));
  }

  private openDatabase() {
    if (!globalThis.indexedDB) {
      throw new LocalDatabaseError(
        "database-unavailable",
        "IndexedDB is not available in this browser context.",
      );
    }

    this.databasePromise ??= new Promise<IDBDatabase>((resolve, reject) => {
      const request = globalThis.indexedDB.open(this.databaseName, this.schemaVersion);

      request.onupgradeneeded = () => {
        const database = request.result;

        LOCAL_DATABASE_STORE_NAMES.forEach((storeName) => {
          if (!database.objectStoreNames.contains(storeName)) {
            database.createObjectStore(storeName, { keyPath: "id" });
          }
        });
      };

      request.onsuccess = () => {
        const database = request.result;
        database.onversionchange = () => {
          database.close();
          this.databasePromise = undefined;
        };
        resolve(database);
      };

      request.onerror = () => {
        reject(
          new LocalDatabaseError(
            "database-unavailable",
            "IndexedDB could not be opened.",
            request.error,
          ),
        );
      };

      request.onblocked = () => {
        reject(
          new LocalDatabaseError(
            "database-unavailable",
            "IndexedDB upgrade is blocked by another open LaCucina tab.",
          ),
        );
      };
    }).catch((error: unknown) => {
      this.databasePromise = undefined;
      throw error;
    });

    return this.databasePromise;
  }

  private async runRequest<TResult>(
    storeName: LocalDatabaseStoreName,
    mode: IDBTransactionMode,
    createRequest: (store: IDBObjectStore) => IDBRequest<TResult>,
  ) {
    const database = await this.openDatabase();

    return new Promise<TResult>((resolve, reject) => {
      let result: TResult | undefined;

      try {
        const transaction = database.transaction(storeName, mode);
        const store = transaction.objectStore(storeName);
        const request = createRequest(store);

        request.onsuccess = () => {
          result = request.result;
        };

        request.onerror = () => {
          reject(
            new LocalDatabaseError(
              mode === "readonly" ? "records-corrupt" : "write-failed",
              `IndexedDB request failed for ${storeName}.`,
              request.error,
            ),
          );
        };

        transaction.oncomplete = () => {
          resolve(result as TResult);
        };

        transaction.onerror = () => {
          reject(
            new LocalDatabaseError(
              mode === "readonly" ? "records-corrupt" : "write-failed",
              `IndexedDB transaction failed for ${storeName}.`,
              transaction.error,
            ),
          );
        };

        transaction.onabort = () => {
          reject(
            new LocalDatabaseError(
              mode === "readonly" ? "records-corrupt" : "write-failed",
              `IndexedDB transaction was aborted for ${storeName}.`,
              transaction.error,
            ),
          );
        };
      } catch (error) {
        reject(
          new LocalDatabaseError(
            "database-unavailable",
            `IndexedDB store ${storeName} is not available.`,
            error,
          ),
        );
      }
    });
  }
}

function isLocalDatabaseRecord(value: unknown): value is LocalDatabaseRecord {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    typeof (value as { id: unknown }).id === "string"
  );
}
