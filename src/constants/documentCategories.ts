export type DocumentItem = {
  id: string;
  title: string;
};

export type DocumentCategory = {
  id: string;
  title: string;
  symbol: string;
  documents: DocumentItem[];
};

export const documentCategories: DocumentCategory[] = [
  {
    id: "diarios",
    title: "DIÁRIOS",
    symbol: "▤",
    documents: [
      { id: "diarioAndrew1", title: "Diário de Andrew — 01" },
      { id: "diarioAndrew2", title: "Diário de Andrew — 02" },
      { id: "diarioAndrew3", title: "Diário de Andrew — 03" },
      { id: "diarioAndrew4", title: "Diário de Andrew — 04" },
      { id: "diarioObsidiana", title: "Diário da Lucilla" },
    ],
  },
  {
    id: "admissoes",
    title: "FICHAS DE ADMISSÃO",
    symbol: "▣",
    documents: [
      { id: "admissao005", title: "Admissão #005" },
      { id: "admissao007", title: "Admissão #007" },
      { id: "admissao041", title: "Admissão #041" },
      { id: "admissao089", title: "Admissão #089" },
      { id: "admissao230", title: "Admissão #230" },
      { id: "admissaoHorn", title: "Admissão — Horn Silverskin" },
      { id: "admissaoReymond", title: "Admissão — Reymond Sunfury" },
    ],
  },
  {
    id: "mapas",
    title: "MAPAS E PLANTAS",
    symbol: "⌖",
    documents: [{ id: "sessao1", title: "Mapa da Ala de Contenção" }],
  },
  {
    id: "interrogatorios",
    title: "INTERROGATÓRIOS",
    symbol: "◉",
    documents: [
      { id: "transcricaoInterrogatorio", title: "Transcrição — Reymond Sunfury" },
    ],
  },
  {
    id: "experimentos",
    title: "EXPERIMENTOS",
    symbol: "⌬",
    documents: [
      { id: "experimento01", title: "Experimento 01" },
      { id: "experimentoBanshee", title: "Experimento Banshee" },
      { id: "experimentoInchado", title: "Experimento Inchado" },
      { id: "experimentoMastodonte", title: "Experimento Mastodonte" },
    ],
  },
  {
    id: "correspondencias",
    title: "CARTAS E E-MAILS",
    symbol: "✉",
    documents: [
      { id: "cartaHarold", title: "Carta Dupla de Harold Valtesia" },
      { id: "emailRoyHana", title: "E-mail — Pressão da Câmara Roy / Hana" },
      { id: "emailRoyOliver", title: "E-mail — Liberação Roy / Oliver" },
      { id: "emailRhJordan", title: "E-mail — RH e Jordan" },
    ],
  },
  {
    id: "relatorios",
    title: "RELATÓRIOS E REGISTROS",
    symbol: "▥",
    documents: [
      { id: "advertenciaKasper", title: "Advertência — Kasper" },
      { id: "memorandoMilitar", title: "Memorando Militar do Grande Leste" },
      { id: "orcamentoObsidiana", title: "Orçamento Industrial de Obsidiana" },
      { id: "transferenciaCompostos", title: "Transferência Interna — Compostos" },
    ],
  },
  {
    id: "fotografias",
    title: "FOTOGRAFIAS",
    symbol: "▧",
    documents: [
      { id: "ciborgueEnfaixado", title: "Ciborgue Enfaixado" },
      { id: "laboratorioCibernetica", title: "Laboratório de Augmentação Cibernética" },
      { id: "montagemCibernetica", title: "Montagem Cibernética — Laboratório Valtesia" },
      { id: "lochlanRefem", title: "Lochlan — Refém" },
      { id: "kiaraRefem", title: "Kiara — Refém" },
    ],
  },
  {
    id: "bilhetes",
    title: "BILHETES E ANOTAÇÕES",
    symbol: "✎",
    documents: [
      { id: "lochlanKiara01", title: "Bilhetes Lochlan / Kiara — 01" },
      { id: "lochlanKiara02", title: "Bilhetes Lochlan / Kiara — 02" },
      { id: "kasperDrakeRoy", title: "Pedido de Drake" },
      { id: "arsenalAlice", title: "Arsenal da Ala Leste — Armário Alice" },
      { id: "objetivo", title: "Como Ativar o Elevador de Emergência" },
    ],
  },
];

export const allDocuments = documentCategories.flatMap((category) =>
  category.documents.map((document) => ({
    ...document,
    categoryId: category.id,
    categoryTitle: category.title,
    categorySymbol: category.symbol,
  })),
);
