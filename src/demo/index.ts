/**
 * Módulo Dedicado de Demonstração (Demo) do OS Flow
 * 
 * Centraliza os dados simulados, componentes visuais e regras
 * da experiência interativa de demonstração pública do SaaS OS Flow.
 */

export * from "./data/mockData";
export { default as DemoShowcaseView } from "./components/DemoShowcaseView";
export { default as DemoBanner } from "./components/DemoBanner";
export { demoStateService } from "./services/demoState.service";
