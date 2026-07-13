(function () {
  "use strict";

  const root = window.RE59;
  const DB_NAME = "59RealEstateDemoDB";
  const DB_VERSION = 1;
  const STORE_NAMES = ["properties", "units", "tenants", "contracts", "payments", "auditLogs", "settings"];
  let database = null;

  function requestToPromise(request) {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error("IndexedDB request failed."));
    });
  }

  function transactionDone(transaction) {
    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error || new Error("IndexedDB transaction failed."));
      transaction.onabort = () => reject(transaction.error || new Error("IndexedDB transaction was aborted."));
    });
  }

  async function open() {
    if (database) return database;
    database = await new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains("properties")) db.createObjectStore("properties", { keyPath: "id" });
        if (!db.objectStoreNames.contains("units")) {
          const store = db.createObjectStore("units", { keyPath: "id" });
          store.createIndex("propertyId", "propertyId", { unique: false });
          store.createIndex("status", "status", { unique: false });
        }
        if (!db.objectStoreNames.contains("tenants")) {
          const store = db.createObjectStore("tenants", { keyPath: "id" });
          store.createIndex("currentUnitId", "currentUnitId", { unique: false });
          store.createIndex("status", "status", { unique: false });
        }
        if (!db.objectStoreNames.contains("contracts")) {
          const store = db.createObjectStore("contracts", { keyPath: "id" });
          store.createIndex("unitId", "unitId", { unique: false });
          store.createIndex("tenantId", "tenantId", { unique: false });
          store.createIndex("status", "status", { unique: false });
        }
        if (!db.objectStoreNames.contains("payments")) {
          const store = db.createObjectStore("payments", { keyPath: "id" });
          store.createIndex("contractId", "contractId", { unique: false });
          store.createIndex("unitId", "unitId", { unique: false });
          store.createIndex("status", "status", { unique: false });
        }
        if (!db.objectStoreNames.contains("auditLogs")) {
          const store = db.createObjectStore("auditLogs", { keyPath: "id" });
          store.createIndex("entityId", "entityId", { unique: false });
          store.createIndex("createdAt", "createdAt", { unique: false });
        }
        if (!db.objectStoreNames.contains("settings")) db.createObjectStore("settings", { keyPath: "key" });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error("Unable to open the local database."));
    });
    database.onversionchange = () => {
      database.close();
      database = null;
    };
    return database;
  }

  async function get(storeName, key) {
    const db = await open();
    const transaction = db.transaction(storeName, "readonly");
    return requestToPromise(transaction.objectStore(storeName).get(key));
  }

  async function getAll(storeName) {
    const db = await open();
    const transaction = db.transaction(storeName, "readonly");
    return requestToPromise(transaction.objectStore(storeName).getAll());
  }

  async function getAllByIndex(storeName, indexName, value) {
    const db = await open();
    const transaction = db.transaction(storeName, "readonly");
    const index = transaction.objectStore(storeName).index(indexName);
    return requestToPromise(index.getAll(IDBKeyRange.only(value)));
  }

  async function put(storeName, value) {
    const db = await open();
    const transaction = db.transaction(storeName, "readwrite");
    transaction.objectStore(storeName).put(value);
    await transactionDone(transaction);
    return value;
  }

  async function bulkPut(storeName, values) {
    const db = await open();
    const transaction = db.transaction(storeName, "readwrite");
    const store = transaction.objectStore(storeName);
    values.forEach((value) => store.put(value));
    await transactionDone(transaction);
    return values.length;
  }

  async function remove(storeName, key) {
    const db = await open();
    const transaction = db.transaction(storeName, "readwrite");
    transaction.objectStore(storeName).delete(key);
    await transactionDone(transaction);
  }

  async function clear(storeName) {
    const db = await open();
    const transaction = db.transaction(storeName, "readwrite");
    transaction.objectStore(storeName).clear();
    await transactionDone(transaction);
  }

  async function clearAll() {
    const db = await open();
    const transaction = db.transaction(STORE_NAMES, "readwrite");
    STORE_NAMES.forEach((name) => transaction.objectStore(name).clear());
    await transactionDone(transaction);
  }

  async function exportAll() {
    const output = {};
    for (const store of STORE_NAMES) output[store] = await getAll(store);
    return {
      app: "59 Real Estate",
      version: root.config.version,
      exportedAt: new Date().toISOString(),
      data: output
    };
  }

  async function importAll(payload) {
    if (!payload?.data) throw new Error("Invalid backup file.");
    await clearAll();
    for (const store of STORE_NAMES) {
      const rows = Array.isArray(payload.data[store]) ? payload.data[store] : [];
      if (rows.length) await bulkPut(store, rows);
    }
  }

  root.dbProvider = {
    DB_NAME,
    STORE_NAMES,
    open,
    get,
    getAll,
    getAllByIndex,
    put,
    bulkPut,
    remove,
    clear,
    clearAll,
    exportAll,
    importAll
  };
})();
