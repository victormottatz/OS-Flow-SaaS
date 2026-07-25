import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { MdbReadError } from "../src/errors.js";

const { mockGetTableNames, mockGetTable, mockFsStat, mockFsRead, mockMdbConstructorThrow } = vi.hoisted(
  () => {
    const mockMdbConstructorThrow = { value: false };
    return {
      mockGetTableNames: vi.fn(),
      mockGetTable: vi.fn(),
      mockFsStat: vi.fn(),
      mockFsRead: vi.fn(),
      mockMdbConstructorThrow,
    };
  },
);

vi.mock("mdb-reader", () => ({
  default: class MockMDBReader {
    getTableNames = mockGetTableNames;
    getTable = mockGetTable;
    constructor() {
      if (mockMdbConstructorThrow.value) {
        throw new Error("Corrupted MDB file");
      }
    }
  },
}));

vi.mock("fs", () => ({
  statSync: mockFsStat,
  readFileSync: mockFsRead,
}));

describe("MdbReader", () => {
  let MdbReader: Awaited<
    typeof import("../src/readers/mdb-reader.js")
  >["MdbReader"];

  beforeEach(async () => {
    vi.clearAllMocks();
    mockMdbConstructorThrow.value = false;
    const mod = await import("../src/readers/mdb-reader.js");
    MdbReader = mod.MdbReader;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("constructor", () => {
    it("should set default options when none provided", () => {
      const reader = new MdbReader();
      expect(reader).toBeInstanceOf(MdbReader);
    });

    it("should accept custom options", () => {
      const reader = new MdbReader({ tables: ["CLIENTES"], batchSize: 500 });
      expect(reader).toBeInstanceOf(MdbReader);
    });

    it("should accept password option", () => {
      const reader = new MdbReader({ password: "test123" });
      expect(reader).toBeInstanceOf(MdbReader);
    });
  });

  describe("read", () => {
    it("should read MDB file and return tables", async () => {
      mockFsStat.mockReturnValue({ isFile: () => true, size: 1024 });
      mockFsRead.mockReturnValue(Buffer.alloc(1024));
      mockGetTableNames.mockReturnValue(["CLIENTES", "EQUIPAMENTOS"]);

      const mockDataClientes = [{ id: 1, nome: "Cliente A" }];
      const mockDataEquip = [{ id: 1, descricao: "Equip X" }];

      mockGetTable.mockImplementation((name: string) => {
        const data = name === "CLIENTES" ? mockDataClientes : mockDataEquip;
        return { getData: () => data };
      });

      const reader = new MdbReader();
      const result = await reader.read("/path/to/test.mdb");

      expect(result.tables).toHaveLength(2);
      expect(result.tables[0].name).toBe("CLIENTES");
      expect(result.tables[0].rows).toEqual(mockDataClientes);
      expect(result.tables[1].name).toBe("EQUIPAMENTOS");
      expect(result.hash).toHaveLength(64);
      expect(result.sizeBytes).toBe(1024);
      expect(result.extractedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it("should filter tables when tables option provided", async () => {
      mockFsStat.mockReturnValue({ isFile: () => true, size: 512 });
      mockFsRead.mockReturnValue(Buffer.from("data"));
      mockGetTableNames.mockReturnValue(["CLIENTES", "EQUIPAMENTOS", "OS"]);
      mockGetTable.mockReturnValue({ getData: () => [{ id: 1 }] });

      const reader = new MdbReader({ tables: ["CLIENTES", "OS"] });
      const result = await reader.read("/path/to/test.mdb");

      expect(result.tables).toHaveLength(2);
      expect(result.tables[0].name).toBe("CLIENTES");
      expect(result.tables[1].name).toBe("OS");
    });

    it("should throw MdbReadError when file does not exist", async () => {
      mockFsStat.mockImplementation(() => {
        throw new Error("ENOENT: no such file or directory");
      });

      const reader = new MdbReader();
      await expect(reader.read("/nonexistent.mdb")).rejects.toThrow(
        MdbReadError,
      );
    });

    it("should throw MdbReadError when file is empty", async () => {
      mockFsStat.mockReturnValue({ isFile: () => true, size: 0 });

      const reader = new MdbReader();
      await expect(reader.read("/empty.mdb")).rejects.toThrow("empty");
    });

    it("should throw MdbReadError when path is a directory", async () => {
      mockFsStat.mockReturnValue({ isFile: () => false, size: 4096 });

      const reader = new MdbReader();
      await expect(reader.read("/directory")).rejects.toThrow(MdbReadError);
    });

    it("should throw MdbReadError when table is not found", async () => {
      mockFsStat.mockReturnValue({ isFile: () => true, size: 512 });
      mockFsRead.mockReturnValue(Buffer.from("data"));
      mockGetTableNames.mockReturnValue(["CLIENTES", "EQUIPAMENTOS"]);

      const reader = new MdbReader({ tables: ["NONEXISTENT"] });
      await expect(reader.read("/path/test.mdb")).rejects.toThrow(
        MdbReadError,
      );
    });

    it("should throw MdbReadError when MDBReader constructor fails", async () => {
      mockFsStat.mockReturnValue({ isFile: () => true, size: 512 });
      mockFsRead.mockReturnValue(Buffer.from("corrupted"));
      mockMdbConstructorThrow.value = true;

      const reader = new MdbReader();
      await expect(reader.read("/corrupted.mdb")).rejects.toThrow(
        MdbReadError,
      );
    });

    it("should handle empty table list in MDB", async () => {
      mockFsStat.mockReturnValue({ isFile: () => true, size: 128 });
      mockFsRead.mockReturnValue(Buffer.from("empty-db"));
      mockGetTableNames.mockReturnValue([]);

      const reader = new MdbReader();
      const result = await reader.read("/empty-tables.mdb");

      expect(result.tables).toHaveLength(0);
    });
  });
});
