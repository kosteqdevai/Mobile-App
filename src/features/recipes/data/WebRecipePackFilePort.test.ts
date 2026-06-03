import { afterEach, describe, expect, it, vi } from "vitest";

import { WebRecipePackFilePort } from "./WebRecipePackFilePort";

const capacitorFilesystemMocks = vi.hoisted(() => ({
  writeFile: vi.fn(async () => undefined),
  getUri: vi.fn(async () => ({ uri: "file://cache/comero-recipes.json" })),
}));

const capacitorShareMocks = vi.hoisted(() => ({
  canShare: vi.fn(async () => ({ value: true })),
  share: vi.fn(async () => undefined),
}));

vi.mock("@capacitor/filesystem", () => ({
  Directory: { Cache: "CACHE" },
  Encoding: { UTF8: "utf8" },
  Filesystem: capacitorFilesystemMocks,
}));

vi.mock("@capacitor/share", () => ({
  Share: capacitorShareMocks,
}));

const samplePack = {
  fileName: "comero-recipes-2026-06-02.json",
  json: '{"recipes":[]}',
  recipeCount: 0,
};

describe("WebRecipePackFilePort", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    capacitorFilesystemMocks.writeFile.mockClear();
    capacitorFilesystemMocks.getUri.mockClear();
    capacitorShareMocks.canShare.mockClear();
    capacitorShareMocks.share.mockClear();
  });

  it("writes and shares recipe packs through Capacitor on native Android", async () => {
    const documentMock = createDocumentMock();
    const port = new WebRecipePackFilePort({} as Navigator, documentMock, {
      Capacitor: { isNativePlatform: () => true, getPlatform: () => "android" },
    } as never);

    const result = await port.saveRecipePackFile({
      pack: samplePack,
      downloadUrl: "blob:lacucina-recipes",
    });

    expect(result).toEqual(
      expect.objectContaining({
        ok: true,
        value: expect.objectContaining({ mode: "native-share" }),
      }),
    );
    expect(capacitorFilesystemMocks.writeFile).toHaveBeenCalledWith({
      path: samplePack.fileName,
      data: samplePack.json,
      directory: "CACHE",
      encoding: "utf8",
    });
    expect(capacitorFilesystemMocks.getUri).toHaveBeenCalledWith({
      path: samplePack.fileName,
      directory: "CACHE",
    });
    expect(capacitorShareMocks.share).toHaveBeenCalledWith(
      expect.objectContaining({
        files: ["file://cache/comero-recipes.json"],
      }),
    );
    expect(documentMock.createdLink.click).not.toHaveBeenCalled();
  });

  it("starts browser download outside native webviews", async () => {
    const documentMock = createDocumentMock();
    const port = new WebRecipePackFilePort({} as Navigator, documentMock, {
      Capacitor: { isNativePlatform: () => false, getPlatform: () => "web" },
    } as never);

    const result = await port.saveRecipePackFile({
      pack: samplePack,
      downloadUrl: "blob:lacucina-recipes",
    });

    expect(result.ok).toBe(true);
    expect(result.ok ? result.value.mode : "").toBe("browser-download");
    expect(documentMock.createdLink.href).toBe("blob:lacucina-recipes");
    expect(documentMock.createdLink.download).toBe(samplePack.fileName);
    expect(documentMock.createdLink.click).toHaveBeenCalledTimes(1);
  });

  it("copies JSON when download is unavailable", async () => {
    const writeText = vi.fn(async () => undefined);
    const port = new WebRecipePackFilePort(
      { clipboard: { writeText } } as Navigator,
      {
        body: {
          appendChild: vi.fn(),
        },
        createElement: vi.fn(() => {
          throw new Error("download blocked");
        }),
      } as never,
      { Capacitor: { isNativePlatform: () => false, getPlatform: () => "web" } } as never,
    );

    const result = await port.saveRecipePackFile({
      pack: samplePack,
      downloadUrl: "blob:lacucina-recipes",
    });

    expect(result.ok).toBe(true);
    expect(result.ok ? result.value.mode : "").toBe("clipboard");
    expect(writeText).toHaveBeenCalledWith(samplePack.json);
  });
});

function createDocumentMock() {
  const createdLink = {
    click: vi.fn(),
    download: "",
    href: "",
    rel: "",
    remove: vi.fn(),
    style: { display: "" },
  };

  return {
    body: {
      appendChild: vi.fn(),
    },
    createElement: vi.fn(() => createdLink),
    createdLink,
  } as unknown as Pick<Document, "body" | "createElement"> & {
    createdLink: typeof createdLink;
  };
}
