import { User, UserRole, Client, Device, OrdemServico, Part } from "../../types";

/**
 * Usuário autenticado da sessão de demonstração do OS Flow.
 */
export const DEMO_USER: User = {
  id: "demo-user-001",
  name: "Visitante (Oficina Modelo)",
  email: "demo@osflow.com.br",
  role: UserRole.OWNER,
  createdAt: new Date().toISOString(),
  avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200"
};

/**
 * Lista de clientes fictícios cadastrados na demonstração.
 */
export const DEMO_CLIENTS: (Client & { devices: Device[] })[] = [
  {
    id: "client-demo-1",
    name: "Dra. Juliana Ramos",
    cpfCnpj: "341.890.123-45",
    phone: "(11) 99876-5432",
    email: "juliana.ramos@clinicaexemplo.com.br",
    address: "Av. Paulista, 1420 - Sala 42",
    city: "São Paulo",
    state: "SP",
    zipCode: "01310-100",
    devices: [
      {
        id: "dev-demo-1",
        clientId: "client-demo-1",
        type: "Smart TV",
        brand: "LG",
        model: "OLED 55 C2",
        serialNumber: "LG-OLED55-9871A",
        description: "Sem riscos aparentes, com controle original Magic."
      }
    ]
  },
  {
    id: "client-demo-2",
    name: "Carlos Eduardo Mendes",
    cpfCnpj: "452.123.789-10",
    phone: "(11) 99123-4567",
    email: "carlos.mendes@techcorp.com",
    address: "Rua Augusta, 890",
    city: "São Paulo",
    state: "SP",
    zipCode: "01305-100",
    devices: [
      {
        id: "dev-demo-2",
        clientId: "client-demo-2",
        type: "Notebook",
        brand: "Dell",
        model: "XPS 15 (9520)",
        serialNumber: "DELL-XPS15-4421X",
        description: "Aparelho com carregador Type-C original."
      }
    ]
  },
  {
    id: "client-demo-3",
    name: "Matheus Silva Prado",
    cpfCnpj: "289.456.123-88",
    phone: "(11) 98834-1122",
    email: "matheus.prado@gamerstudio.com",
    address: "Rua Vergueiro, 320",
    city: "São Paulo",
    state: "SP",
    zipCode: "04101-000",
    devices: [
      {
        id: "dev-demo-3",
        clientId: "client-demo-3",
        type: "Console",
        brand: "Sony",
        model: "PlayStation 5 Digital",
        serialNumber: "SONY-PS5-9012-BR",
        description: "Console com 1 controle DualSense branco."
      }
    ]
  },
  {
    id: "client-demo-4",
    name: "Renata Ferreira Lima",
    cpfCnpj: "198.765.432-11",
    phone: "(11) 99765-8899",
    email: "renata.lima@designstudio.com",
    address: "Av. Brigadeiro Faria Lima, 2100",
    city: "São Paulo",
    state: "SP",
    zipCode: "01451-000",
    devices: [
      {
        id: "dev-demo-4",
        clientId: "client-demo-4",
        type: "Notebook",
        brand: "Apple",
        model: "MacBook Air M2",
        serialNumber: "APPL-MBA-M2-3312",
        description: "Carcaça impecável na cor Midnight."
      }
    ]
  }
];

/**
 * Catálogo de peças com NCM higienizado para o simulador fiscal.
 */
export const DEMO_PARTS: Part[] = [
  {
    id: "part-demo-1",
    name: "Cooler Fan CPU Notebook Dell XPS",
    code: "PEC-COOL-001",
    sku: "COOLER-DELL-XPS",
    stock: 8,
    cost: 120.0,
    price: 350.0,
    ncm: "8414.59.90",
    unit: "UN",
    requiresSerial: true
  },
  {
    id: "part-demo-2",
    name: "Pasta Térmica Alta Condutividade 5g (Thermal Grizzly)",
    code: "PEC-PAST-002",
    sku: "PASTA-TG-5G",
    stock: 24,
    cost: 45.0,
    price: 110.0,
    ncm: "3824.99.89",
    unit: "UN",
    requiresSerial: false
  },
  {
    id: "part-demo-3",
    name: "Fonte Interna PS5 100-240V ADP-400DR",
    code: "PEC-PS5-FONT",
    sku: "FONTE-PS5-ORIG",
    stock: 4,
    cost: 280.0,
    price: 590.0,
    ncm: "8504.40.21",
    unit: "UN",
    requiresSerial: true
  },
  {
    id: "part-demo-4",
    name: "Placa Principal T-Con LG OLED 55",
    code: "PEC-LG-TCON",
    sku: "TCON-LGOLED-55",
    stock: 2,
    cost: 450.0,
    price: 980.0,
    ncm: "8529.90.20",
    unit: "UN",
    requiresSerial: true
  }
];

/**
 * Ordens de Serviço demonstrativas distribuídas pelos estágios do Kanban.
 */
export const DEMO_ORDERS: OrdemServico[] = [
  {
    id: "os-demo-1",
    osNumber: "2492",
    clientId: "client-demo-1",
    deviceId: "dev-demo-1",
    reportedDefect: "Aparelho liga, sai som normal mas a tela fica totalmente preta.",
    accessoriesLeft: "Controle Magic + Cabo de Força",
    physicalState: "Excelente estado, sem riscos",
    status: "AGUARDANDO_AVALIACAO",
    laborCost: 250.0,
    totalCost: 1230.0,
    billingStatus: "PENDENTE",
    financialStatus: "PENDENTE",
    warrantyType: "NENHUMA",
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    checklistEntrada: [
      { id: "power", label: "Liga na tomada", status: "OK" },
      { id: "audio", label: "Som nos alto-falantes", status: "OK" },
      { id: "screen", label: "Display", status: "AVARIA" }
    ],
    usedParts: [
      { id: "part-demo-4", partId: "part-demo-4", name: "Placa Principal T-Con LG OLED 55", price: 980.0, quantity: 1 }
    ],
    diagnostic: "Falha na placa T-Con após surto na rede elétrica. Substituição recomendada."
  },
  {
    id: "os-demo-2",
    osNumber: "2490",
    clientId: "client-demo-2",
    deviceId: "dev-demo-2",
    reportedDefect: "Aquecimento excessivo, ventoinha fazendo barulho alto e desligamento repentino.",
    accessoriesLeft: "Carregador Original 130W",
    physicalState: "Bom estado, pequenas marcas de uso",
    status: "EM_MANUTENCAO",
    laborCost: 500.0,
    totalCost: 850.0,
    billingStatus: "PENDENTE",
    financialStatus: "PENDENTE",
    warrantyType: "FABRICA",
    createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
    stressTestStartedAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    usedParts: [
      { id: "part-demo-1", partId: "part-demo-1", name: "Cooler Fan CPU Notebook Dell XPS", price: 350.0, quantity: 1 }
    ],
    diagnostic: "Cooler primário com rolamento travado. Realizada substituição do cooler e troca de pasta térmica."
  },
  {
    id: "os-demo-3",
    osNumber: "2488",
    clientId: "client-demo-3",
    deviceId: "dev-demo-3",
    reportedDefect: "Console não liga após queda de raio.",
    accessoriesLeft: "1 Controle DualSense",
    physicalState: "Sem marcas de queda",
    status: "PRONTO_RETIRADA",
    laborCost: 200.0,
    totalCost: 790.0,
    billingStatus: "PENDENTE",
    financialStatus: "PENDENTE",
    warrantyType: "NENHUMA",
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    usedParts: [
      { id: "part-demo-3", partId: "part-demo-3", name: "Fonte Interna PS5 100-240V ADP-400DR", price: 590.0, quantity: 1 }
    ],
    diagnostic: "Fonte interna em curto-circuito. Substituída fonte original e aprovado no teste de estresse de 30 minutos em bancada."
  },
  {
    id: "os-demo-4",
    osNumber: "2485",
    clientId: "client-demo-4",
    deviceId: "dev-demo-4",
    reportedDefect: "Limpeza preventiva anual e troca de pasta térmica.",
    accessoriesLeft: "Capa protetora",
    physicalState: "Impecável",
    status: "FINALIZADO",
    laborCost: 320.0,
    totalCost: 430.0,
    billingStatus: "FATURADO",
    financialStatus: "PAGO",
    warrantyType: "FABRICA",
    createdAt: new Date(Date.now() - 3600000 * 48).toISOString(),
    usedParts: [
      { id: "part-demo-2", partId: "part-demo-2", name: "Pasta Térmica Alta Condutividade 5g (Thermal Grizzly)", price: 110.0, quantity: 1 }
    ],
    diagnostic: "Limpeza química interna realizada, desobstrução de dutos e aplicação de pasta térmica de alta performance."
  }
];

/**
 * Conversas simuladas de WhatsApp para o módulo Demo (zeradas).
 */
export const DEMO_WHATSAPP_CHATS: any[] = [];

/**
 * Histórico de mensagens simuladas por conversa na demonstração (zerado).
 */
export const DEMO_WHATSAPP_MESSAGES: Record<string, any[]> = {};

