const DATABASE_NAME = "zielplaner-appearance";
const DATABASE_VERSION = 1;
const STORE_NAME = "assets";
const BACKGROUND_KEY = "custom-background";
const MAX_SOURCE_BYTES = 25 * 1024 * 1024;
const MAX_IMAGE_DIMENSION = 2560;
const WEBP_QUALITY = 0.84;

const acceptedTypes = new Set([
  "image/avif",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

function openDatabase() {
  if (!globalThis.indexedDB) {
    throw new Error("Lokale Bildspeicherung wird von diesem Browser nicht unterstützt.");
  }

  return new Promise((resolve, reject) => {
    const request = globalThis.indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Bildspeicher konnte nicht geöffnet werden."));
  });
}

function runStoreRequest(mode, createRequest) {
  return openDatabase().then((database) => new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, mode);
    const request = createRequest(transaction.objectStore(STORE_NAME));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Bildspeicher konnte nicht aktualisiert werden."));
    transaction.oncomplete = () => database.close();
    transaction.onabort = () => {
      database.close();
      reject(transaction.error ?? new Error("Bildspeicher konnte nicht aktualisiert werden."));
    };
  }));
}

export async function loadBackgroundImage() {
  const entry = await runStoreRequest("readonly", (store) => store.get(BACKGROUND_KEY));
  return entry?.blob instanceof Blob ? entry.blob : null;
}

export async function storeBackgroundImage(blob) {
  if (!(blob instanceof Blob)) {
    throw new Error("Das Hintergrundbild konnte nicht gespeichert werden.");
  }
  await runStoreRequest("readwrite", (store) => store.put({
    id: BACKGROUND_KEY,
    blob,
    updatedAt: new Date().toISOString(),
  }));
  return blob;
}

export async function removeBackgroundImage() {
  await runStoreRequest("readwrite", (store) => store.delete(BACKGROUND_KEY));
}

export function validateBackgroundFile(file) {
  if (!(file instanceof File) || !acceptedTypes.has(file.type)) {
    throw new Error("Bitte ein Bild im Format JPG, PNG, WebP oder AVIF auswählen.");
  }
  if (file.size > MAX_SOURCE_BYTES) {
    throw new Error("Das ausgewählte Bild darf höchstens 25 MB groß sein.");
  }
  return file;
}

export async function optimizeBackgroundImage(file) {
  validateBackgroundFile(file);
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");

  if (!context) {
    bitmap.close();
    throw new Error("Das Hintergrundbild konnte nicht verarbeitet werden.");
  }

  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const optimizedBlob = await new Promise((resolve) => {
    canvas.toBlob(resolve, "image/webp", WEBP_QUALITY);
  });
  if (!optimizedBlob) {
    throw new Error("Das Hintergrundbild konnte nicht komprimiert werden.");
  }
  return optimizedBlob;
}
