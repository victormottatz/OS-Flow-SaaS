import { Request, Response } from "express";
import prisma from "../database/prisma";
import { eventBus } from "../events";
import { OSStateMachine } from "../domain/os/os.state-machine";
import { OSPolicies } from "../domain/os/os.policies";
import { OSStatus, WarrantyType } from "../types";
import { featureFlags } from "../services/FeatureFlagService";
import sharp from "sharp";

async function processLaudoFotos(laudoFotos: any[] | undefined | null): Promise<any[]> {
  if (!laudoFotos || !Array.isArray(laudoFotos)) return [];

  if (laudoFotos.length > 6) {
    throw new Error("Limite de 6 fotos por Ordem de Serviço atingido.");
  }

  const processed: any[] = [];
  for (const foto of laudoFotos) {
    if (!foto.dataUrl || typeof foto.dataUrl !== "string") {
      processed.push(foto);
      continue;
    }

    const match = foto.dataUrl.match(/^data:(image\/\w+);base64,(.+)$/);
    if (!match) {
      processed.push(foto);
      continue;
    }

    const base64Data = match[2];
    const buffer = Buffer.from(base64Data, "base64");

    try {
      const resizedBuffer = await sharp(buffer)
        .resize({ width: 800 })
        .jpeg({ quality: 80 })
        .toBuffer();

      processed.push({
        ...foto,
        dataUrl: `data:image/jpeg;base64,${resizedBuffer.toString("base64")}`
      });
    } catch (err) {
      console.error("[sharp] Erro ao redimensionar foto de entrada:", err);
      processed.push(foto);
    }
  }

  return processed;
}

function sanitizeOSData(os: any, showProfit: boolean): any {
  if (!os) return os;
  const usedParts = typeof os.usedParts === "string" ? JSON.parse(os.usedParts) : os.usedParts || [];

  const sanitizedParts = usedParts.map((part: any) => {
    if (!showProfit) {
      const { costSnapshot, ...rest } = part;
      return rest;
    }
    return part;
  });

  return {
    ...os,
    usedParts: sanitizedParts
  };
}

export function isDeviceIncomplete(device: any): boolean {
  if (!device) return true;
  const brand = (device.brand || "").trim().toLowerCase();
  const model = (device.model || "").trim().toLowerCase();
  const serial = (device.serialNumber || "").trim();
  
  return (
    !brand ||
    brand === "indefinido" ||
    !model ||
    model === "indefinido" ||
    !serial ||
    serial === ""
  );
}

export async function checkAndMarkRecurrence(deviceId: string, baseDate: Date): Promise<boolean> {
  const ninetyDaysAgo = new Date(baseDate.getTime() - 90 * 24 * 60 * 60 * 1000);
  
  const periodOS = await prisma.ordemServico.findMany({
    where: {
      deviceId,
      deletedAt: null,
      createdAt: {
        gte: ninetyDaysAgo,
        lte: baseDate
      }
    },
    orderBy: { createdAt: "asc" }
  });

  if (periodOS.length >= 3) {
    const idsToUpdate = periodOS.map(o => o.id);
    await prisma.ordemServico.updateMany({
      where: { id: { in: idsToUpdate } },
      data: { recurrent: true }
    });
    return true;
  }
  return false;
}

export async function getRecurrentAlert(os: any): Promise<any | null> {
  if (!os.recurrent) return null;

  const ninetyDaysAgo = new Date(os.createdAt);
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
  const ninetyDaysAfter = new Date(os.createdAt);
  ninetyDaysAfter.setDate(ninetyDaysAfter.getDate() + 90);

  const relatedOS = await prisma.ordemServico.findMany({
    where: {
      deviceId: os.deviceId,
      deletedAt: null,
      createdAt: {
        gte: ninetyDaysAgo,
        lte: ninetyDaysAfter
      }
    },
    select: {
      osNumber: true,
      createdAt: true
    },
    orderBy: {
      createdAt: "asc"
    }
  });

  if (relatedOS.length < 3) return null;

  return {
    count: relatedOS.length,
    previousOsNumbers: relatedOS.map((o: any) => o.osNumber)
  };
}

export async function getWarrantyNotice(os: any): Promise<any | null> {
  if (!os.clientId || !os.deviceId) return null;

  const priorOS = await prisma.ordemServico.findFirst({
    where: {
      clientId: os.clientId,
      deviceId: os.deviceId,
      id: os.id ? { not: os.id } : undefined,
      originalExitDate: { not: null },
      warrantyDate: { gte: os.createdAt },
      deletedAt: null
    },
    orderBy: {
      originalExitDate: "asc"
    }
  });

  if (!priorOS) return null;

  return {
    osNumber: priorOS.osNumber,
    originalExitDate: priorOS.originalExitDate,
    warrantyExpiresAt: priorOS.warrantyDate
  };
}

// ─── Etiqueta automática "Em Garantia" ──────────────────────────────────────
// Uma OS recebe (virtualmente — sem gravar no banco) a etiqueta "Em Garantia"
// quando o equipamento está coberto por garantia:
//   1) Reparo dentro da garantia MGV de 90 dias (existe OS anterior do mesmo
//      cliente+aparelho com warrantyDate >= createdAt desta OS); OU
//   2) Aparelho com garantia (warrantyExpiresAt) ainda vigente.
// A etiqueta é criada uma única vez como etiqueta da oficina (ownerId NULL).
const WARRANTY_TAG_NAME = "Em Garantia";
const WARRANTY_TAG_SCOPE = "ORDEM_SERVICO";
const WARRANTY_TAG_COLOR = "#0d9488";

let warrantyTagIdCache: string | null = null;
let warrantyTagIdPromise: Promise<string | null> | null = null;

async function getWarrantyTagId(): Promise<string | null> {
  if (warrantyTagIdCache) return warrantyTagIdCache;
  if (!warrantyTagIdPromise) {
    warrantyTagIdPromise = (async () => {
      try {
        let tag = await prisma.tag.findFirst({
          where: { name: WARRANTY_TAG_NAME, scope: WARRANTY_TAG_SCOPE as any }
        });
        if (!tag) {
          tag = await prisma.tag.create({
            data: {
              name: WARRANTY_TAG_NAME,
              scope: WARRANTY_TAG_SCOPE as any,
              colorHex: WARRANTY_TAG_COLOR,
              ownerId: null,
              description: "Equipamento em garantia (MGV 90 dias ou de fábrica). Adicionada automaticamente pelo sistema."
            }
          });
        }
        warrantyTagIdCache = tag.id;
        return tag.id;
      } catch (err) {
        console.error("[WarrantyTag] Falha ao garantir a etiqueta:", err);
        // Permite nova tentativa na próxima requisição (falha transitória do banco)
        warrantyTagIdPromise = null;
        return null;
      }
    })();
  }
  return warrantyTagIdPromise;
}

function ensureWarrantyTagOnOS(os: any, tagId: string): void {
  if (!Array.isArray(os.tags)) os.tags = [];
  if (!os.tags.some((t: any) => t.id === tagId)) {
    os.tags = [
      ...os.tags,
      {
        id: tagId,
        name: WARRANTY_TAG_NAME,
        colorHex: WARRANTY_TAG_COLOR,
        scope: WARRANTY_TAG_SCOPE,
        ownerId: null,
        description: "Equipamento em garantia (MGV 90 dias ou de fábrica)."
      }
    ];
  }
}

function isDeclaredWarranty(warrantyType?: WarrantyType | string | null): boolean {
  return warrantyType === "FABRICA" || warrantyType === "MGV";
}

async function isOSInWarranty(os: { id?: string; clientId?: string | null; deviceId?: string | null; createdAt: Date | string; warrantyType?: WarrantyType | string | null }): Promise<boolean> {
  if (!os.clientId || !os.deviceId) return false;
  const created = new Date(os.createdAt);

  // 0) Garantia declarada na própria OS (FABRICA ou MGV) — como a recepção registra
  if (isDeclaredWarranty(os.warrantyType)) return true;

  // 1) Reparo dentro da garantia MGV de 90 dias.
  // IMPORTANTE: exclui a própria OS — na finalização o update de status já gravou
  // originalExitDate/warrantyDate (+90 dias), o que faria a OS casar consigo mesma.
  const prior = await prisma.ordemServico.findFirst({
    where: {
      clientId: os.clientId,
      deviceId: os.deviceId,
      id: os.id ? { not: os.id } : undefined,
      originalExitDate: { not: null },
      warrantyDate: { gte: created },
      deletedAt: null
    },
    select: { id: true }
  });
  if (prior) return true;

  // 2) Garantia do aparelho ainda vigente
  const device = await prisma.device.findUnique({
    where: { id: os.deviceId },
    select: { warrantyExpiresAt: true }
  });
  return !!device?.warrantyExpiresAt && new Date(device.warrantyExpiresAt) > new Date();
}

async function applyWarrantyTagToOSList(osList: any[]): Promise<void> {
  if (!Array.isArray(osList) || osList.length === 0) return;
  const tagId = await getWarrantyTagId();
  if (!tagId) return;

  const active = osList.filter((o: any) => o.clientId && o.deviceId);
  if (active.length === 0) return;

  // Pares únicos (clientId + deviceId) → uma única consulta em lote
  const pairMap = new Map<string, { clientId: string; deviceId: string }>();
  for (const o of active) pairMap.set(`${o.clientId}|${o.deviceId}`, { clientId: o.clientId, deviceId: o.deviceId });
  const pairs = Array.from(pairMap.values());

  const warrantyOsIds = new Set<string>();

  // 1) Reparo em garantia — lote
  if (pairs.length > 0) {
    const priorOS = await prisma.ordemServico.findMany({
      where: {
        deletedAt: null,
        originalExitDate: { not: null },
        warrantyDate: { not: null },
        OR: pairs.map(p => ({ clientId: p.clientId, deviceId: p.deviceId }))
      },
      select: { id: true, clientId: true, deviceId: true, warrantyDate: true }
    });
    const byPair = new Map<string, { id: string; d: Date }[]>();
    for (const p of priorOS) {
      if (!p.warrantyDate) continue;
      const key = `${p.clientId}|${p.deviceId}`;
      const arr = byPair.get(key) || [];
      arr.push({ id: p.id, d: p.warrantyDate });
      byPair.set(key, arr);
    }
    for (const o of active) {
      const arr = byPair.get(`${o.clientId}|${o.deviceId}`) || [];
      const created = new Date(o.createdAt);
      // Exclui a própria OS (na finalização ela já tem warrantyDate própria)
      if (arr.some(e => e.id !== o.id && e.d >= created)) warrantyOsIds.add(o.id);
    }
  }

  // 2) Garantia do aparelho — lote
  const deviceIds = Array.from(new Set(active.map((o: any) => o.deviceId as string)));
  const deviceInWarranty = new Set<string>();
  if (deviceIds.length > 0) {
    const devices = await prisma.device.findMany({
      where: { id: { in: deviceIds } },
      select: { id: true, warrantyExpiresAt: true }
    });
    const now = new Date();
    for (const d of devices) {
      if (d.warrantyExpiresAt && new Date(d.warrantyExpiresAt) > now) deviceInWarranty.add(d.id);
    }
  }

  for (const o of osList) {
    // Garantia declarada na própria OS (FABRICA/MGV) OU coberta por OS anterior OU aparelho vigente
    const declaredWarranty = isDeclaredWarranty(o.warrantyType);
    if (warrantyOsIds.has(o.id) || (o.deviceId && deviceInWarranty.has(o.deviceId)) || declaredWarranty) {
      ensureWarrantyTagOnOS(o, tagId);
    }
  }
}

export class OSController {
  async getAll(req: Request, res: Response) {
    try {
      // Parse query parameters for pagination, filtering, sorting
      const page = Math.max(1, Number(req.query.page) || 1);
      const pageSize = Math.min(5000, Math.max(1, Number(req.query.pageSize) || 100));
      const cursor = req.query.cursor as string | undefined;
      const status = req.query.status as string;
      const search = (req.query.search as string)?.trim().toLowerCase() || "";
      const sortBy = (req.query.sortBy as string) || "createdAt";
      const sortOrder = (req.query.sortOrder as string) === "asc" ? "asc" : "desc";
      const includeRelations = req.query.includeRelations === "true";

      const userRole = req.headers["x-user-role"] as string;
      const isProfitEnabled = await featureFlags.isEnabled("OS_PROFITABILITY_CALC");
      const showProfit = userRole === "OWNER" && isProfitEnabled;

      // Build where clause
      const where: any = { deletedAt: null };

      if (status && status !== "ALL") {
        where.status = status;
      }

      if (search) {
        where.OR = [
          { osNumber: { contains: search, mode: "insensitive" } },
          { reportedDefect: { contains: search, mode: "insensitive" } },
          { diagnostic: { contains: search, mode: "insensitive" } },
          { client: { name: { contains: search, mode: "insensitive" } } },
          { device: { brand: { contains: search, mode: "insensitive" } } },
          { device: { model: { contains: search, mode: "insensitive" } } },
          { device: { type: { contains: search, mode: "insensitive" } } },
        ];
      }

      // Build orderBy
      const orderBy: any = {};
      const allowedSortFields = ["createdAt", "osNumber", "status", "updatedAt"];
      const safeSortBy = allowedSortFields.includes(sortBy) ? sortBy : "createdAt";
      orderBy[safeSortBy] = sortOrder;

      // Cursor-based pagination support
      if (cursor) {
        where.id = { lt: cursor }; // cursor is the last seen ID
      }

      // Select minimal fields for list view (projection)
      const select = {
        id: true,
        osNumber: true,
        clientId: true,
        deviceId: true,
        reportedDefect: true,
        accessoriesLeft: true,
        physicalState: true,
        status: true,
        diagnostic: true,
        laudoMacro: true,
        usedParts: true,
        laborCost: true,
        discount: true,
        paymentMethod: true,
        totalCost: true,
        billingStatus: true,
        blingId: true,
        blingKey: true,
        sefazErrorMessage: true,
        pdfUrl: true,
        checklistSaida: true,
        createdAt: true,
        originalExitDate: true,
        closingReason: true,
        recurrent: true,
        technicianLaborHours: true,
        technicianHourlyRate: true,
        partsCost: true,
        travelCost: true,
        thirdPartyCost: true,
        otherCost: true,
        warrantyType: true,
        financialStatus: true,
        financialDueDate: true,
        tags: true,
        ...(includeRelations && {
          client: {
            select: { id: true, name: true, cpfCnpj: true, phone: true, phone2: true, email: true, address: true }
          },
          device: {
            select: { id: true, type: true, brand: true, model: true, serialNumber: true, description: true }
          }
        })
      };

      // Fetch total count (for pagination UI)
      const total = await prisma.ordemServico.count({ where });

      // Fetch paginated data
      let data: any[] = [];
      let hasMore = false;
      let nextCursor: string | undefined = undefined;

      if (!status || status === "ALL") {
        const operationalStatuses = ["ORCAMENTO", "AGUARDANDO_AVALIACAO", "AGUARDANDO_AUTORIZACAO", "AGUARDANDO_PECA", "EM_MANUTENCAO", "PRONTO_RETIRADA", "PAGO_PRONTO_RETIRADA"];
        const opQueries = operationalStatuses.map(s => 
          prisma.ordemServico.findMany({
            where: { ...where, status: s as any },
            select,
            orderBy,
            take: pageSize
          })
        );

        // Subdivide o status FINALIZADO pelos status financeiros para garantir 100 (pageSize) cards por coluna do pipe financeiro
        const financialStatuses = ["PENDENTE", "CREDIARIO", "PAGAR_DEPOIS", "PAGO", "INADIMPLENTE"];
        const finQueries = financialStatuses.map(fs => {
          const finWhere = { ...where, status: "FINALIZADO" as any };
          return prisma.ordemServico.findMany({
            where: {
              ...finWhere,
              financialStatus: fs as any
            },
            select,
            orderBy,
            take: pageSize
          });
        });

        const results = await Promise.all([...opQueries, ...finQueries]);
        data = results.flat();
      } else {
        const osList = await prisma.ordemServico.findMany({
          where,
          select,
          orderBy,
          take: pageSize + 1,
          skip: cursor ? 1 : (page - 1) * pageSize,
        });
        hasMore = osList.length > pageSize;
        data = hasMore ? osList.slice(0, pageSize) : osList;
        nextCursor = hasMore ? data[data.length - 1].id : undefined;
      }

      // Batch fetch recurrent alerts for all OS in single query (avoid N+1)
      const recurrentOsIds = data.filter((os: any) => os.recurrent).map((os: any) => os.id);
      const recurrentAlertsMap = new Map<string, any>();
      
      if (recurrentOsIds.length > 0) {
        // Get all related OS for recurrent devices in one query
        const recurrentData = await prisma.ordemServico.findMany({
          where: {
            id: { in: recurrentOsIds },
            deletedAt: null
          },
          select: {
            id: true,
            deviceId: true,
            createdAt: true,
            osNumber: true
          }
        });

        const deviceIds = recurrentData.map((os: any) => os.deviceId).filter((id: any): id is string => !!id);
        
        if (deviceIds.length > 0) {
          const allRelatedOSs = await prisma.ordemServico.findMany({
            where: {
              deviceId: { in: deviceIds },
              deletedAt: null
            },
            select: {
              deviceId: true,
              osNumber: true,
              createdAt: true
            },
            orderBy: { createdAt: "asc" }
          });

          const relatedByDeviceMap = new Map<string, Array<{ osNumber: string; createdAt: Date }>>();
          for (const rel of allRelatedOSs) {
            if (!rel.deviceId) continue;
            let list = relatedByDeviceMap.get(rel.deviceId);
            if (!list) {
              list = [];
              relatedByDeviceMap.set(rel.deviceId, list);
            }
            list.push({ osNumber: rel.osNumber, createdAt: rel.createdAt });
          }

          for (const os of recurrentData) {
            if (!os.deviceId) continue;
            const deviceOSs = relatedByDeviceMap.get(os.deviceId) || [];
            
            const ninetyDaysAgo = new Date(os.createdAt);
            ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
            const ninetyDaysAfter = new Date(os.createdAt);
            ninetyDaysAfter.setDate(ninetyDaysAfter.getDate() + 90);

            const filtered = deviceOSs.filter(o => o.createdAt >= ninetyDaysAgo && o.createdAt <= ninetyDaysAfter);

            if (filtered.length >= 3) {
              recurrentAlertsMap.set(os.id, {
                count: filtered.length,
                previousOsNumbers: filtered.map(o => o.osNumber)
              });
            }
          }
        }
      }

      // Transform response
      const responseData = data.map((os: any) => {
        const rawOS = {
          id: os.id,
          osNumber: os.osNumber,
          clientId: os.clientId,
          deviceId: os.deviceId,
          reportedDefect: os.reportedDefect,
          accessoriesLeft: os.accessoriesLeft,
          physicalState: os.physicalState,
          status: os.status,
          diagnostic: os.diagnostic,
          laudoMacro: os.laudoMacro || "",
          usedParts: typeof os.usedParts === "string" ? JSON.parse(os.usedParts) : os.usedParts,
          laborCost: os.laborCost,
          totalCost: os.totalCost,
          billingStatus: os.billingStatus,
          blingId: os.blingId,
          blingKey: os.blingKey,
          sefazErrorMessage: os.sefazErrorMessage,
          pdfUrl: os.pdfUrl,
          billingLogs: [],
          checklistEntrada: [],
          checklistSaida: typeof os.checklistSaida === "string" ? JSON.parse(os.checklistSaida || "[]") : os.checklistSaida || [],
          laudoFotos: [],
          createdAt: os.createdAt.toISOString(),
          deletedAt: null,
          originalExitDate: os.originalExitDate ? os.originalExitDate.toISOString() : null,
          closingReason: os.closingReason,
          warrantyType: os.warrantyType,
          financialStatus: os.financialStatus,
          financialDueDate: os.financialDueDate ? os.financialDueDate.toISOString() : null,
          client: os.client ? { id: os.client.id, name: os.client.name, cpfCnpj: os.client.cpfCnpj, phone: os.client.phone, phone2: os.client.phone2, email: os.client.email, address: os.client.address } : null,
          device: os.device ? { id: os.device.id, type: os.device.type, brand: os.device.brand, model: os.device.model, serialNumber: os.device.serialNumber, description: os.device.description } : null,
          recurrent: os.recurrent,
          recurrentAlert: recurrentAlertsMap.get(os.id) || null,
          technicianLaborHours: os.technicianLaborHours,
          technicianHourlyRate: os.technicianHourlyRate,
          partsCost: os.partsCost,
          travelCost: os.travelCost,
          thirdPartyCost: os.thirdPartyCost,
          otherCost: os.otherCost,
          discount: os.discount,
          paymentMethod: os.paymentMethod,
          tags: Array.isArray(os.tags) ? os.tags : [],
        };
        return sanitizeOSData(rawOS, showProfit);
      });

      // Fetch status counts matching the current search criteria but ignoring current status/pagination filters
      const whereForCounts = { ...where };
      delete whereForCounts.status;
      delete whereForCounts.id;

      const statusCounts = await prisma.ordemServico.groupBy({
        by: ['status'],
        where: whereForCounts,
        _count: {
          id: true
        }
      });

      const countsByStatus = {
        ORCAMENTO: 0,
        AGUARDANDO_AVALIACAO: 0,
        AGUARDANDO_AUTORIZACAO: 0,
        AGUARDANDO_PECA: 0,
        EM_MANUTENCAO: 0,
        PRONTO_RETIRADA: 0,
        PAGO_PRONTO_RETIRADA: 0,
        FINALIZADO: 0
      };

      statusCounts.forEach((item) => {
        if (item.status in countsByStatus) {
          countsByStatus[item.status as keyof typeof countsByStatus] = item._count.id;
        }
      });

      // Etiqueta automática de garantia (lote — evita N+1)
      await applyWarrantyTagToOSList(responseData);

      res.json({
        data: responseData,
        total,
        page,
        pageSize,
        hasMore,
        nextCursor,
        totalPages: Math.ceil(total / pageSize),
        countsByStatus
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  async getById(req: Request, res: Response) {
    const { id } = req.params;
    try {
      const os = await prisma.ordemServico.findUnique({
        where: { id },
        include: {
          client: true,
          device: true,
          tags: {
            include: { owner: { select: { id: true, name: true } } }
          }
        }
      });
      if (!os || os.deletedAt) {
        res.status(404).json({ error: "Ordem de Serviço não encontrada." });
        return;
      }

      if (os.osNumber) {
        // Busca as peças e serviços do MDB importados que estejam vinculados a essa OS
        const parts = await prisma.partUsage.findMany({
          where: { osLegacyId: os.osNumber }
        });
        const services = await prisma.serviceItem.findMany({
          where: { osLegacyId: os.osNumber }
        });

        const currentParts = typeof os.usedParts === "string"
          ? JSON.parse(os.usedParts)
          : (os.usedParts || []) as any[];

        let changed = false;
        const updatedParts = [...currentParts];

        // Sincroniza peças (categoria PECA)
        for (const part of parts) {
          const alreadyExists = updatedParts.some(p => p.id === part.id);
          if (!alreadyExists) {
            const price = parseFloat(part.value || "0");
            const cost = parseFloat(part.cost || "0");
            updatedParts.push({
              id: part.id,
              name: part.description || "Peça importada",
              quantity: part.quantity || 1,
              price: price,
              costSnapshot: cost,
              isAvulso: true,
              category: "PECA",
              serialNumber: part.serialInfo || undefined
            });
            changed = true;
          }
        }

        // Sincroniza serviços (categoria SERVICO)
        for (const service of services) {
          const alreadyExists = updatedParts.some(s => s.id === service.id);
          if (!alreadyExists) {
            const total = parseFloat(service.total || "0");
            const cost = parseFloat(service.cost || "0");
            const qty = parseFloat(service.quantity || "1");
            updatedParts.push({
              id: service.id,
              name: service.description || "Serviço importado",
              quantity: qty,
              price: qty > 0 ? (total / qty) : total,
              costSnapshot: cost,
              isAvulso: true,
              category: "SERVICO"
            });
            changed = true;
          }
        }

        if (changed) {
          const computedPartsCost = updatedParts
            .filter(p => p.category === "PECA")
            .reduce((sum, p) => sum + (p.price * p.quantity), 0);

          const computedLaborCost = updatedParts
            .filter(s => s.category === "SERVICO")
            .reduce((sum, s) => sum + (s.price * s.quantity), 0);

          const computedTotalCost = computedPartsCost + computedLaborCost;

          await prisma.ordemServico.update({
            where: { id: os.id },
            data: {
              usedParts: updatedParts as any,
              partsCost: computedPartsCost,
              laborCost: computedLaborCost,
              totalCost: computedTotalCost
            }
          });

          os.usedParts = updatedParts as any;
          os.partsCost = computedPartsCost;
          os.laborCost = computedLaborCost;
          os.totalCost = computedTotalCost;
        }
      }

      const userRole = req.headers["x-user-role"] as string;
      const isProfitEnabled = await featureFlags.isEnabled("OS_PROFITABILITY_CALC");
      const showProfit = userRole === "OWNER" && isProfitEnabled;

      const recurrentAlert = await getRecurrentAlert(os);
      const rawOS = {
        id: os.id,
        osNumber: os.osNumber,
        clientId: os.clientId,
        deviceId: os.deviceId,
        reportedDefect: os.reportedDefect,
        accessoriesLeft: os.accessoriesLeft,
        physicalState: os.physicalState,
        status: os.status,
        diagnostic: os.diagnostic,
        laudoMacro: os.laudoMacro || "",
        usedParts: typeof os.usedParts === "string" ? JSON.parse(os.usedParts) : os.usedParts,
        laborCost: os.laborCost,
        totalCost: os.totalCost,
        billingStatus: os.billingStatus,
        blingId: os.blingId,
        blingKey: os.blingKey,
        sefazErrorMessage: os.sefazErrorMessage,
        pdfUrl: os.pdfUrl,
        billingLogs: typeof os.billingLogs === "string" ? JSON.parse(os.billingLogs) : os.billingLogs,
        checklistEntrada: typeof os.checklistEntrada === "string" ? JSON.parse(os.checklistEntrada || "[]") : os.checklistEntrada || [],
        checklistSaida: typeof os.checklistSaida === "string" ? JSON.parse(os.checklistSaida || "[]") : os.checklistSaida || [],
        laudoFotos: typeof os.laudoFotos === "string" ? JSON.parse(os.laudoFotos || "[]") : os.laudoFotos || [],
        createdAt: os.createdAt.toISOString(),
        deletedAt: null,
        originalExitDate: os.originalExitDate ? os.originalExitDate.toISOString() : null,
        closingReason: os.closingReason,
        warrantyType: os.warrantyType,
        financialStatus: os.financialStatus,
        financialDueDate: os.financialDueDate ? os.financialDueDate.toISOString() : null,
        client: os.client ? { id: os.client.id, name: os.client.name, cpfCnpj: os.client.cpfCnpj, phone: os.client.phone, phone2: os.client.phone2, email: os.client.email, address: os.client.address } : null,
        device: os.device ? { id: os.device.id, type: os.device.type, brand: os.device.brand, model: os.device.model, serialNumber: os.device.serialNumber, description: os.device.description } : null,
        recurrent: os.recurrent,
        recurrentAlert,
        discount: os.discount,
        paymentMethod: os.paymentMethod,
        tags: (os as any).tags || []
      };

      // Etiqueta automática de garantia
      const warrantyTagId = await getWarrantyTagId();
      if (warrantyTagId && await isOSInWarranty(os)) {
        ensureWarrantyTagOnOS(rawOS, warrantyTagId);
      }

      res.json(sanitizeOSData(rawOS, showProfit));
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  async create(req: Request, res: Response) {
    const { clientId, deviceId, reportedDefect, accessoriesLeft, physicalState, checklistEntrada, laudoFotos, warrantyType, tagIds } = req.body;
    
    if (!clientId || !deviceId || !reportedDefect) {
      res.status(422).json({ error: "O preenchimento do Cliente, Dispositivo e Defeito Relatado é estritamente obrigatório." });
      return;
    }

    try {
      const processedPhotos = await processLaudoFotos(laudoFotos);
      
      // Busca o maior número sequencial numérico ativo na tabela de OSs
      const lastOS = await prisma.$queryRaw<{ max_os: number }[]>`
        SELECT COALESCE(MAX(CAST(NULLIF(regexp_replace("osNumber", '[^0-9]', '', 'g'), '') AS INTEGER)), 0) as max_os 
        FROM ordem_servicos
      `;
      
      const nextSeq = (lastOS[0]?.max_os || 0) + 1;
      const osNumber = `OS-${String(nextSeq).padStart(4, "0")}`;

      const newOS = await prisma.ordemServico.create({
        data: {
          osNumber,
          clientId,
          deviceId,
          reportedDefect,
          accessoriesLeft: accessoriesLeft || "Nenhum acessório deixado.",
          physicalState: physicalState || "Sem avarias aparentes.",
          status: "AGUARDANDO_AVALIACAO",
          diagnostic: "",
          laudoMacro: "",
          usedParts: [],
          laborCost: 0,
          totalCost: 0,
          checklistEntrada: checklistEntrada || [],
          laudoFotos: processedPhotos,
          billingStatus: "PENDENTE",
          billingLogs: [],
          warrantyType: warrantyType || "NENHUMA",
          tags: tagIds && tagIds.length > 0 ? {
            connect: tagIds.map((id: string) => ({ id }))
          } : undefined
        }
      });

      // Calcula e marca recorrência se necessário
      const isRecurrent = await checkAndMarkRecurrence(deviceId, newOS.createdAt);
      if (isRecurrent) {
        newOS.recurrent = true;
      }

      // Dispara evento de auditoria
      eventBus.emit("OS_CREATED" as any, {
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        aggregateId: newOS.id,
        aggregateType: "OrdemServico",
        actor: (req as any).user?.id || "SYSTEM",
        payload: newOS,
        version: 1
      });

      const createdResponse: any = {
        ...newOS,
        laudoMacro: "",
        usedParts: [],
        billingLogs: [],
        checklistEntrada: newOS.checklistEntrada || [],
        checklistSaida: newOS.checklistSaida || [],
        laudoFotos: newOS.laudoFotos || [],
        createdAt: newOS.createdAt.toISOString(),
        recurrent: newOS.recurrent,
        warrantyType: newOS.warrantyType,
        financialStatus: newOS.financialStatus,
        financialDueDate: newOS.financialDueDate ? newOS.financialDueDate.toISOString() : null,
        recurrentAlert: isRecurrent ? await getRecurrentAlert(newOS) : null,
        warrantyNotice: await getWarrantyNotice(newOS),
        tags: []
      };

      // Etiqueta automática de garantia
      const warrantyTagId = await getWarrantyTagId();
      if (warrantyTagId && await isOSInWarranty(newOS)) {
        ensureWarrantyTagOnOS(createdResponse, warrantyTagId);
      }

      res.status(201).json(createdResponse);
    } catch (err: any) {
      if (err.message && err.message.includes("Limite de 6 fotos")) {
        res.status(400).json({ error: err.message });
        return;
      }
      res.status(500).json({ error: err.message });
    }
  }

  async update(req: Request, res: Response) {
    const { id } = req.params;
    const { diagnostic, laudoMacro, usedParts, laborCost, technicianLaborHours, technicianHourlyRate, checklistEntrada, laudoFotos, warrantyType, financialStatus, financialDueDate, discount, tagIds, benchLocation, returnMethod, packagingCleaned } = req.body;

    try {
      const currentOS = await prisma.ordemServico.findUnique({
        where: { id }
      });
      if (!currentOS || currentOS.deletedAt) {
        res.status(404).json({ error: "Ordem de Serviço não encontrada." });
        return;
      }

      if (usedParts && Array.isArray(usedParts) && usedParts.length > 0) {
        const device = await prisma.device.findUnique({
          where: { id: currentOS.deviceId }
        });
        if (device && isDeviceIncomplete(device)) {
          res.status(422).json({
            error: "Aparelho com cadastro incompleto. Por favor, complete a marca, modelo e número de série antes de alocar peças.",
            code: "DEVICE_INCOMPLETE",
            device
          });
          return;
        }
      }

      if (currentOS.status === "FINALIZADO" && (checklistEntrada !== undefined || laudoFotos !== undefined)) {
        res.status(400).json({ error: "Não é permitido alterar o laudo fotográfico ou checklist de uma Ordem de Serviço finalizada." });
        return;
      }

      const processedPhotos = laudoFotos !== undefined ? await processLaudoFotos(laudoFotos) : undefined;

      if (usedParts && Array.isArray(usedParts)) {
        const prevParts: any[] = typeof currentOS.usedParts === "string" ? JSON.parse(currentOS.usedParts) : currentOS.usedParts || [];
        
        // Identifica IDs legados que foram excluídos (garantindo formato UUID para evitar erros no banco)
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        const currentIds = new Set(usedParts.map((p: any) => p.id).filter(Boolean));
        const deletedLegacyIds: string[] = [];
        for (const prevItem of prevParts) {
          if (prevItem.id && !currentIds.has(prevItem.id)) {
            if (uuidRegex.test(String(prevItem.id))) {
              deletedLegacyIds.push(prevItem.id);
            }
          }
        }

        // Otimização e Concorrência (Rule 02 & Rule 03): Transação atômica e busca filtrada por IDs
        const partIdsToFetch = Array.from(new Set([
          ...prevParts.filter((p: any) => !p.isAvulso && p.partId).map((p: any) => p.partId),
          ...usedParts.filter((p: any) => !p.isAvulso && p.partId).map((p: any) => p.partId)
        ]));

        try {
          await prisma.$transaction(async (tx) => {
            if (deletedLegacyIds.length > 0) {
              await tx.partUsage.deleteMany({
                where: { id: { in: deletedLegacyIds } }
              });
              await tx.serviceItem.deleteMany({
                where: { id: { in: deletedLegacyIds } }
              });
            }

            const targetParts = partIdsToFetch.length > 0
              ? await tx.part.findMany({ where: { id: { in: partIdsToFetch } } })
              : [];

            for (const prevItem of prevParts) {
              if (prevItem.isAvulso || !prevItem.partId) continue;
              const part = targetParts.find((p: any) => p.id === prevItem.partId);
              if (part) {
                await tx.part.update({
                  where: { id: part.id },
                  data: { stock: { increment: prevItem.quantity } }
                });
              }
            }

            for (const item of usedParts) {
              if (item.isAvulso || !item.partId) continue;
              const freshPart = await tx.part.findUnique({ where: { id: item.partId } });
              if (!freshPart) continue;

              if (freshPart.stock < item.quantity) {
                throw new Error(`Estoque insuficiente para a peça '${freshPart.name}'. Estoque disponível: ${freshPart.stock}`);
              }
              await tx.part.update({
                where: { id: freshPart.id },
                data: { stock: { decrement: item.quantity } }
              });
              if (item.costSnapshot === undefined) {
                const prevItemMatch = prevParts.find((p: any) => p.id === item.id && p.partId === item.partId);
                item.costSnapshot = prevItemMatch?.costSnapshot !== undefined ? prevItemMatch.costSnapshot : (freshPart.cost || 0);
              }
            }
          });
        } catch (txError: any) {
          res.status(400).json({ error: txError.message || "Erro de validação ao atualizar estoque" });
          return;
        }
      }

      const partsList = usedParts !== undefined ? usedParts : (typeof currentOS.usedParts === "string" ? JSON.parse(currentOS.usedParts) : currentOS.usedParts || []);
      
      const computedPartsCost = (partsList || [])
        .filter((p: any) => p.category !== "SERVICO")
        .reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0);

      const computedLaborCost = (partsList || [])
        .filter((p: any) => p.category === "SERVICO")
        .reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0);

      const resolvedDiscount = discount !== undefined ? Number(discount) : currentOS.discount;
      const resolvedTotal = Math.max(0, computedPartsCost + computedLaborCost - resolvedDiscount);

      const updated = await prisma.ordemServico.update({
        where: { id },
        data: {
          diagnostic: diagnostic !== undefined ? diagnostic : currentOS.diagnostic,
          laudoMacro: laudoMacro !== undefined ? laudoMacro : currentOS.laudoMacro,
          usedParts: usedParts !== undefined ? usedParts : currentOS.usedParts,
          partsCost: computedPartsCost,
          laborCost: computedLaborCost,
          technicianLaborHours: currentOS.technicianLaborHours,
          technicianHourlyRate: currentOS.technicianHourlyRate,
          discount: resolvedDiscount,
          totalCost: resolvedTotal,
          checklistEntrada: checklistEntrada !== undefined ? checklistEntrada : currentOS.checklistEntrada,
          laudoFotos: processedPhotos !== undefined ? processedPhotos : currentOS.laudoFotos,
          warrantyType: warrantyType !== undefined ? warrantyType : currentOS.warrantyType,
          financialStatus: financialStatus !== undefined ? financialStatus : currentOS.financialStatus,
          financialDueDate: financialDueDate !== undefined ? (financialDueDate ? new Date(financialDueDate) : null) : currentOS.financialDueDate,
          benchLocation: benchLocation !== undefined ? benchLocation : currentOS.benchLocation,
          returnMethod: returnMethod !== undefined ? returnMethod : currentOS.returnMethod,
          packagingCleaned: packagingCleaned !== undefined ? packagingCleaned : currentOS.packagingCleaned,
          tags: tagIds !== undefined ? { set: tagIds.map((id: string) => ({ id })) } : undefined
        },
        ...(tagIds !== undefined && {
          include: {
            tags: { include: { owner: { select: { id: true, name: true } } } }
          }
        })
      });

      // Auditoria
      eventBus.emit("OS_UPDATED" as any, {
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        aggregateId: updated.id,
        aggregateType: "OrdemServico",
        actor: (req as any).user?.id || "SYSTEM",
        payload: { old: currentOS, new: updated },
        version: 1
      });

      const userRole = req.headers["x-user-role"] as string;
      const isProfitEnabled = await featureFlags.isEnabled("OS_PROFITABILITY_CALC");
      const showProfit = userRole === "OWNER" && isProfitEnabled;

      const rawOS = {
        ...updated,
        laudoMacro: updated.laudoMacro || "",
        usedParts: typeof updated.usedParts === "string" ? JSON.parse(updated.usedParts) : updated.usedParts,
        billingLogs: typeof updated.billingLogs === "string" ? JSON.parse(updated.billingLogs) : updated.billingLogs,
        checklistEntrada: typeof updated.checklistEntrada === "string" ? JSON.parse(updated.checklistEntrada || "[]") : updated.checklistEntrada || [],
        checklistSaida: typeof updated.checklistSaida === "string" ? JSON.parse(updated.checklistSaida || "[]") : updated.checklistSaida || [],
        laudoFotos: typeof updated.laudoFotos === "string" ? JSON.parse(updated.laudoFotos || "[]") : updated.laudoFotos || [],
        createdAt: updated.createdAt.toISOString(),
        recurrent: updated.recurrent,
        warrantyType: updated.warrantyType,
        financialStatus: updated.financialStatus,
        financialDueDate: updated.financialDueDate ? updated.financialDueDate.toISOString() : null,
        recurrentAlert: await getRecurrentAlert(updated),
        tags: Array.isArray((updated as any).tags) ? (updated as any).tags : []
      };

      // Etiqueta automática de garantia
      const warrantyTagId = await getWarrantyTagId();
      if (warrantyTagId && await isOSInWarranty(updated)) {
        ensureWarrantyTagOnOS(rawOS, warrantyTagId);
      }

      res.json(sanitizeOSData(rawOS, showProfit));
    } catch (err: any) {
      if (err.message && err.message.includes("Limite de 6 fotos")) {
        res.status(400).json({ error: err.message });
        return;
      }
      res.status(500).json({ error: err.message });
    }
  }

  async updateLaudoFotos(req: Request, res: Response) {
    const { id } = req.params;
    const { checklistEntrada, laudoFotos, accessoriesLeft, physicalState } = req.body;

    try {
      const currentOS = await prisma.ordemServico.findUnique({
        where: { id }
      });
      if (!currentOS || currentOS.deletedAt) {
        res.status(404).json({ error: "Ordem de Serviço não encontrada." });
        return;
      }

      if (currentOS.status === "FINALIZADO") {
        res.status(400).json({ error: "Não é permitido alterar o laudo fotográfico ou checklist de uma Ordem de Serviço finalizada." });
        return;
      }

      const processedPhotos = laudoFotos !== undefined ? await processLaudoFotos(laudoFotos) : undefined;

      const updated = await prisma.ordemServico.update({
        where: { id },
        data: {
          checklistEntrada: checklistEntrada !== undefined ? checklistEntrada : currentOS.checklistEntrada,
          laudoFotos: processedPhotos !== undefined ? processedPhotos : currentOS.laudoFotos,
          accessoriesLeft: accessoriesLeft !== undefined ? accessoriesLeft : currentOS.accessoriesLeft,
          physicalState: physicalState !== undefined ? physicalState : currentOS.physicalState
        }
      });

      eventBus.emit("OS_UPDATED" as any, {
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        aggregateId: updated.id,
        aggregateType: "OrdemServico",
        actor: (req as any).user?.id || "SYSTEM",
        payload: { old: currentOS, new: updated },
        version: 1
      });

      const userRole = req.headers["x-user-role"] as string;
      const isProfitEnabled = await featureFlags.isEnabled("OS_PROFITABILITY_CALC");
      const showProfit = userRole === "OWNER" && isProfitEnabled;

      const rawOS = {
        ...updated,
        usedParts: typeof updated.usedParts === "string" ? JSON.parse(updated.usedParts) : updated.usedParts,
        billingLogs: typeof updated.billingLogs === "string" ? JSON.parse(updated.billingLogs) : updated.billingLogs,
        checklistEntrada: typeof updated.checklistEntrada === "string" ? JSON.parse(updated.checklistEntrada || "[]") : updated.checklistEntrada || [],
        checklistSaida: typeof updated.checklistSaida === "string" ? JSON.parse(updated.checklistSaida || "[]") : updated.checklistSaida || [],
        laudoFotos: typeof updated.laudoFotos === "string" ? JSON.parse(updated.laudoFotos || "[]") : updated.laudoFotos || [],
        createdAt: updated.createdAt.toISOString()
      };

      res.json(sanitizeOSData(rawOS, showProfit));
    } catch (err: any) {
      if (err.message && err.message.includes("Limite de 6 fotos")) {
        res.status(400).json({ error: err.message });
        return;
      }
      res.status(500).json({ error: err.message });
    }
  }

  async updateChecklistSaida(req: Request, res: Response) {
    const { id } = req.params;
    const { checklistSaida } = req.body;

    if (!checklistSaida || !Array.isArray(checklistSaida)) {
      res.status(400).json({ error: "Checklist de saída é obrigatório e deve ser uma lista." });
      return;
    }

    try {
      const currentOS = await prisma.ordemServico.findUnique({
        where: { id }
      });
      if (!currentOS || currentOS.deletedAt) {
        res.status(404).json({ error: "Ordem de Serviço não encontrada." });
        return;
      }

      if (currentOS.status === "FINALIZADO") {
        res.status(400).json({ error: "Não é permitido alterar o checklist de saída de uma Ordem de Serviço finalizada." });
        return;
      }

      const updated = await prisma.ordemServico.update({
        where: { id },
        data: {
          checklistSaida: checklistSaida
        }
      });

      eventBus.emit("OS_UPDATED" as any, {
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        aggregateId: updated.id,
        aggregateType: "OrdemServico",
        actor: (req as any).user?.id || "SYSTEM",
        payload: { old: currentOS, new: updated },
        version: 1
      });

      const userRole = req.headers["x-user-role"] as string;
      const isProfitEnabled = await featureFlags.isEnabled("OS_PROFITABILITY_CALC");
      const showProfit = userRole === "OWNER" && isProfitEnabled;

      const rawOS = {
        ...updated,
        usedParts: typeof updated.usedParts === "string" ? JSON.parse(updated.usedParts) : updated.usedParts,
        billingLogs: typeof updated.billingLogs === "string" ? JSON.parse(updated.billingLogs) : updated.billingLogs,
        checklistEntrada: typeof updated.checklistEntrada === "string" ? JSON.parse(updated.checklistEntrada || "[]") : updated.checklistEntrada || [],
        checklistSaida: typeof updated.checklistSaida === "string" ? JSON.parse(updated.checklistSaida || "[]") : updated.checklistSaida || [],
        laudoFotos: typeof updated.laudoFotos === "string" ? JSON.parse(updated.laudoFotos || "[]") : updated.laudoFotos || [],
        createdAt: updated.createdAt.toISOString()
      };

      res.json(sanitizeOSData(rawOS, showProfit));
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  async updateStatus(req: Request, res: Response) {
    const { id } = req.params;
    const { status, closingReason, paymentMethod, invoiceType, paymentNotes, paymentDate, paymentDetails, syncClientWithErp } = req.body;

    if (!status) {
      res.status(400).json({ error: "Status é obrigatório." });
      return;
    }

    try {
      const currentOS = await prisma.ordemServico.findUnique({
        where: { id },
        include: { tags: true }
      });
      if (!currentOS || currentOS.deletedAt) {
        res.status(404).json({ error: "Ordem de Serviço não encontrada." });
        return;
      }

      const previousStatus = currentOS.status as OSStatus;
      const targetStatus = status as OSStatus;

      // Identifica se é um encerramento sem reparo
      const isSemReparo = closingReason === 'ORCAMENTO_RECUSADO'
        || closingReason === 'SEM_CONSERTO'
        || closingReason === 'DESCARTE_CLIENTE_RETIRA'
        || closingReason === 'DESCARTE_OFICINA'
        || closingReason === 'EQUIPAMENTO_SEM_DEFEITO';

      // Validação de dispositivo incompleto (Lazy Loading / Base Instalada)
      // Bypassa se for um encerramento sem conserto/sem defeito
      if (previousStatus !== targetStatus && !isSemReparo) {
        const device = await prisma.device.findUnique({
          where: { id: currentOS.deviceId }
        });
        if (device && isDeviceIncomplete(device)) {
          res.status(422).json({
            error: "Aparelho com cadastro incompleto. Por favor, complete a marca, modelo e número de série antes de avançar.",
            code: "DEVICE_INCOMPLETE",
            device
          });
          return;
        }
      }

      // DDD: Validação de Máquina de Estados Finita (FSM) 
      // DESATIVADA PARA PERMITIR MOVIMENTAÇÃO LIVRE E REABERTURA DE O.S. (Solicitação do Trello - Fase 5)
      /* 
      const userRole = req.headers["x-user-role"] as string;
      const isManager = userRole === "OWNER" || userRole === "ADMIN" || userRole === "SUPERVISOR";
      if (!isManager && !await OSStateMachine.canTransition(previousStatus, targetStatus)) {
        res.status(422).json({
          error: `Transição de status inválida: Não é permitido mover de '${previousStatus}' para '${targetStatus}'.`,
          code: "INVALID_STATE_TRANSITION"
        });
        return;
      }
      */

      const osUsedParts = typeof currentOS.usedParts === "string" ? JSON.parse(currentOS.usedParts) : currentOS.usedParts || [];

      if (targetStatus === "FINALIZADO" || targetStatus === "PRONTO_RETIRADA") {
        // Se NÃO for sem reparo, aplica as travas de laudo técnico, custo e serialização
        if (!isSemReparo) {
          // DDD: Policy pattern
          const policyCheck = await OSPolicies.canFinishOS(osUsedParts);
          if (!policyCheck.allowed) {
            res.status(422).json({
              error: policyCheck.error,
              code: "SERIAL_REQUIRED",
              missingParts: policyCheck.missingSerials
            });
            return;
          }

          // Busca a configuração de obrigatoriedade de diagnóstico para Pronto Retirada
          const diagnosticSetting = await prisma.officeSetting.findUnique({
            where: { key: "DIAGNOSTIC_REQUIRED_PRONTO_RETIRADA" }
          });
          const isDiagnosticRequiredForPronto = diagnosticSetting ? diagnosticSetting.value === "true" : true;

          // Exige diagnóstico obrigatoriamente para FINALIZADO ou se for PRONTO_RETIRADA com a config ativada
          const needsDiagnostic = targetStatus === "FINALIZADO" || (targetStatus === "PRONTO_RETIRADA" && isDiagnosticRequiredForPronto);

          if (needsDiagnostic && (!currentOS.diagnostic || currentOS.diagnostic.trim() === "")) {
            res.status(422).json({
              error: "Bloqueio: É obrigatório preencher o Laudo Técnico antes de finalizar ou disponibilizar a OS.",
              code: "DIAGNOSTIC_REQUIRED"
            });
            return;
          }
          
          const hasManualTag = currentOS.tags && currentOS.tags.some((t: any) => t.name === "Em Garantia" || t.name === "Garantia");
          const isWarranty = currentOS.warrantyType !== "NENHUMA" || hasManualTag || await isOSInWarranty(currentOS);
          const labor = currentOS.laborCost || 0;
          if (!isWarranty && labor === 0 && osUsedParts.length === 0) {
            res.status(422).json({
              error: "Bloqueio: A Ordem de Serviço está sem Custo de Mão de Obra e sem Peças. Preencha os valores no laudo antes de avançar.",
              code: "COST_REQUIRED"
            });
            return;
          }
        }
      }

      const isDeliveryStatus =
        targetStatus === "PRONTO_RETIRADA" ||
        targetStatus === "PAGO_PRONTO_RETIRADA" ||
        targetStatus === "FINALIZADO";

      const firstExitDate = currentOS.originalExitDate || new Date();
      const warrantyExpires = new Date(firstExitDate);
      warrantyExpires.setDate(warrantyExpires.getDate() + 90);

      let profitValue: number | null = null;
      let profitMarginPercent: number | null = null;

      if (targetStatus === "FINALIZADO") {
        const partsCostValue = osUsedParts.reduce((sum: number, item: any) => sum + ((item.costSnapshot || 0) * (item.quantity || 1)), 0);
        const laborCostValue = (currentOS.technicianLaborHours || 0) * (currentOS.technicianHourlyRate || 0);
        const opsCost = partsCostValue + laborCostValue;
        
        profitValue = currentOS.totalCost - opsCost;
        if (currentOS.totalCost > 0) {
          profitMarginPercent = (profitValue / currentOS.totalCost) * 100;
        } else {
          profitMarginPercent = 0;
        }
      }

      const updated = await prisma.ordemServico.update({
        where: { id },
        data: {
          status: targetStatus,
          paymentMethod: paymentMethod !== undefined ? paymentMethod : undefined,
          paymentNotes: paymentNotes !== undefined ? paymentNotes : undefined,
          paymentDate: paymentDate ? new Date(paymentDate) : undefined,
          paymentDetails: paymentDetails !== undefined ? paymentDetails : undefined,
          ...(isDeliveryStatus
            ? {
                originalExitDate: firstExitDate,
                warrantyDate: warrantyExpires,
                ...(targetStatus === "FINALIZADO"
                  ? { 
                      closingReason: closingReason || 'REPARO_CONCLUIDO',
                      profitValue,
                      profitMarginPercent
                    }
                  : targetStatus === "PRONTO_RETIRADA" && closingReason // Mantém a recusa se enviada
                  ? { closingReason }
                  : { closingReason: null })
              }
            : {
                // Se reabriu ou mudou para outro status, resetamos o closingReason para null
                closingReason: null
              })
        }
      });

      // Emite Evento de Domínio: OS_STATUS_CHANGED
      eventBus.emit("OS_STATUS_CHANGED" as any, {
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        aggregateId: updated.id,
        aggregateType: "OrdemServico",
        actor: (req as any).user?.id || "SYSTEM",
        payload: { previousStatus, newStatus: targetStatus, closingReason: updated.closingReason },
        version: 1
      });

      // INTEGRAÇÃO WHATSAPP (Automática)
      // Dispara para PRONTO_RETIRADA ou FINALIZADO sem reparo (orçamento recusado, descarte)
      if (
        targetStatus === "PRONTO_RETIRADA" || 
        (targetStatus === "FINALIZADO" && isSemReparo)
      ) {
        import("../services/whatsapp").then(({ triggerWhatsAppNotification }) => {
          triggerWhatsAppNotification(updated.id, targetStatus).catch(err => {
            console.error("[WhatsApp] Erro em background disparando notificação:", err);
          });
        });
      }

      if (targetStatus === "FINALIZADO" && previousStatus !== "FINALIZADO") {
        if (isSemReparo) {
          // Encerramentos sem reparo: Não faturam no Bling, marcamos como DISPENSADO
          await prisma.ordemServico.update({
            where: { id },
            data: {
              billingStatus: "DISPENSADO",
              billingLogs: ["Status alterado para FINALIZADO sem reparo.", "Faturamento do Bling dispensado."]
            }
          });
        } else if (await isOSInWarranty(currentOS)) {
          // Equipamento em garantia → sem cobrança: faturamento e pagamento dispensados
          // automaticamente (não chama o Bling nem gera nota fiscal).
          await prisma.ordemServico.update({
            where: { id },
            data: {
              billingStatus: "DISPENSADO",
              financialStatus: "PAGO",
              // Defesa em profundidade: garante que nenhum dado de pagamento fique
              // registrado numa OS em garantia (mesmo se um cliente antigo enviar).
              paymentMethod: null,
              paymentNotes: null,
              paymentDate: null,
              paymentDetails: [],
              billingLogs: [
                "Status alterado para FINALIZADO.",
                "Equipamento em garantia — faturamento e cobrança dispensados automaticamente."
              ]
            }
          });
        } else if (invoiceType === "nenhum") {
          // Usuário marcou para não emitir nada
          await prisma.ordemServico.update({
            where: { id },
            data: {
              billingStatus: "DISPENSADO",
              billingLogs: ["Status alterado para FINALIZADO.", "Integração fiscal e faturamento dispensados (opção 'Não emitir' selecionada)."]
            }
          });
        } else {
          const initialLogs = [
            "Status alterado para FINALIZADO.",
            "Iniciando integração de faturamento no Bling síncrono..."
          ];
          
          await prisma.ordemServico.update({
            where: { id },
            data: {
              billingStatus: "PROCESSANDO",
              billingLogs: initialLogs
            }
          });
          
          const clientSnapshot = await prisma.client.findUnique({
            where: { id: updated.clientId }
          });
          const partsDbSnapshot = await prisma.part.findMany();

          import("../services/osToBling").then(async ({ sendOsToBling }) => {
            try {
              const osSnapshot = {
                ...updated,
                status: targetStatus,
                billingStatus: "PROCESSANDO",
                billingLogs: initialLogs,
                usedParts: osUsedParts
              };

              const result = await sendOsToBling(osSnapshot, clientSnapshot, partsDbSnapshot, true, { invoiceType, syncClientWithErp });
              if (result.success) {
                let sefazMsg = "";
                if (result.notaFiscalId) sefazMsg += `NF-e/NFC-e: ${result.notaFiscalId}. `;
                if (result.servicesNotaFiscalId) sefazMsg += `NFS-e: ${result.servicesNotaFiscalId}.`;
                if (!sefazMsg) sefazMsg = "Faturamento realizado com sucesso no Bling.";
                if (result.error) sefazMsg += ` (${result.error})`;

                const keyParts: string[] = [];
                if (result.notaFiscalId) keyParts.push(`NFe:${result.notaFiscalId}`);
                if (result.servicesNotaFiscalId) keyParts.push(`NFSe:${result.servicesNotaFiscalId}`);
                const finalBlingKey = keyParts.length > 0 ? keyParts.join(" | ") : (result.notaFiscalId || result.servicesNotaFiscalId || null);

                await prisma.ordemServico.update({
                  where: { id: updated.id },
                  data: {
                    billingStatus: "FATURADO",
                    blingId: result.blingId || result.servicesBlingId,
                    blingKey: finalBlingKey || undefined,
                    sefazErrorMessage: sefazMsg,
                    billingLogs: [...initialLogs, `Sucesso: Pedido ${result.blingId || result.servicesBlingId || 'N/A'} gerado.`, `Nota Fiscal: ${finalBlingKey || 'N/A'}`]
                  }
                }).catch((err) => console.warn("[Bling Worker] Ignorando falha de update assíncrono (OS deletada):", err.message));
              } else {
                await prisma.ordemServico.update({
                  where: { id: updated.id },
                  data: {
                    billingStatus: "REJEITADO",
                    sefazErrorMessage: result.error,
                    billingLogs: [...initialLogs, `Erro de faturamento: ${result.error}`]
                  }
                }).catch((err) => console.warn("[Bling Worker] Ignorando falha de update assíncrono (OS deletada):", err.message));
              }
            } catch (e: any) {
              console.error("[Bling Worker Error]", e);
              await prisma.ordemServico.update({
                where: { id: updated.id },
                data: {
                  billingStatus: "REJEITADO",
                  sefazErrorMessage: e.message,
                  billingLogs: [...initialLogs, `Erro crítico: ${e.message}`]
                }
              }).catch((err) => console.warn("[Bling Worker Error] Ignorando falha de update assíncrono no tratamento de erro:", err.message));
            }
          });
        }
      }

      // Re-lê o estado pós-faturamento para a resposta refletir DISPENSADO/PROCESSANDO/REJEITADO
      // (o snapshot `updated` é anterior ao bloco de faturamento acima).
      const postBilling = await prisma.ordemServico.findUnique({
        where: { id },
        select: { billingStatus: true, billingLogs: true, financialStatus: true, financialDueDate: true }
      });
      if (postBilling) {
        updated.billingStatus = postBilling.billingStatus;
        updated.billingLogs = postBilling.billingLogs;
        updated.financialStatus = postBilling.financialStatus;
        updated.financialDueDate = postBilling.financialDueDate;
      }

      const isProfitEnabled = await featureFlags.isEnabled("OS_PROFITABILITY_CALC");
      const showProfit = userRole === "OWNER" && isProfitEnabled;

      const rawOS = {
        ...updated,
        usedParts: typeof updated.usedParts === "string" ? JSON.parse(updated.usedParts) : updated.usedParts,
        billingLogs: typeof updated.billingLogs === "string" ? JSON.parse(updated.billingLogs) : updated.billingLogs,
        checklistEntrada: typeof updated.checklistEntrada === "string" ? JSON.parse(updated.checklistEntrada || "[]") : updated.checklistEntrada || [],
        checklistSaida: typeof updated.checklistSaida === "string" ? JSON.parse(updated.checklistSaida || "[]") : updated.checklistSaida || [],
        laudoFotos: typeof updated.laudoFotos === "string" ? JSON.parse(updated.laudoFotos || "[]") : updated.laudoFotos || [],
        createdAt: updated.createdAt.toISOString(),
        tags: Array.isArray((updated as any).tags) ? (updated as any).tags : []
      };

      // Etiqueta automática de garantia
      const warrantyTagId = await getWarrantyTagId();
      if (warrantyTagId && await isOSInWarranty(updated)) {
        ensureWarrantyTagOnOS(rawOS, warrantyTagId);
      }

      res.json(sanitizeOSData(rawOS, showProfit));
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  async deleteBatch(req: Request, res: Response) {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      res.status(400).json({ error: "Lista de IDs inválida ou vazia." });
      return;
    }

    try {
      // Fetch matching active OSs
      const activeOSs = await prisma.ordemServico.findMany({
        where: { id: { in: ids }, deletedAt: null }
      });

      if (activeOSs.length === 0) {
        res.status(404).json({ error: "Nenhuma Ordem de Serviço ativa correspondente encontrada." });
        return;
      }

      const activeIds = activeOSs.map(os => os.id);

      // Perform soft delete in batch
      await prisma.ordemServico.updateMany({
        where: { id: { in: activeIds } },
        data: { deletedAt: new Date() }
      });

      // Emit event for each OS
      for (const os of activeOSs) {
        eventBus.emit("OS_DELETED" as any, {
          id: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
          aggregateId: os.id,
          aggregateType: "OrdemServico",
          actor: (req as any).user?.id || "SYSTEM",
          payload: os,
          version: 1
        });
      }

      res.json({ message: `${activeIds.length} Ordens de Serviço excluídas com sucesso!`, count: activeIds.length });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  async delete(req: Request, res: Response) {
    const { id } = req.params;
    try {
      const os = await prisma.ordemServico.findUnique({
        where: { id }
      });
      if (!os || os.deletedAt) {
        res.status(404).json({ error: "Ordem de Serviço não encontrada." });
        return;
      }

      await prisma.ordemServico.update({
        where: { id },
        data: { deletedAt: new Date() }
      });

      eventBus.emit("OS_DELETED" as any, {
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        aggregateId: os.id,
        aggregateType: "OrdemServico",
        actor: (req as any).user?.id || "SYSTEM",
        payload: os,
        version: 1
      });

      res.json({ message: "Ordem de Serviço excluída (soft delete) com sucesso!" });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
}

export const osController = new OSController();
