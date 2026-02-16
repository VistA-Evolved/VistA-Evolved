/**
 * TypeScript types for CPRS contract data (design/contracts/cprs/v1/).
 * These mirror the JSON structures produced by Phase 10 extraction.
 */

/* ------------------------------------------------------------------ */
/* Tabs contract                                                       */
/* ------------------------------------------------------------------ */

export interface ContractTab {
  constant: string;
  label: string;
  creationOrder: number;
  conditional: boolean;
  id: number;
  description: string;
  tabPosition: string;
  align: string;
  isBottomTab: boolean;
}

export interface TabsContract {
  _meta: { source: string; extractedAt: string; description: string };
  mainTabControl: {
    component: string;
    type: string;
    tabPosition: string;
    align: string;
    isBottomTabs: boolean;
  };
  mainTabs: ContractTab[];
  subTabs: Array<{
    file: string;
    controlName: string;
    controlType: string;
    tabPosition?: string;
    caption?: string;
  }>;
}

/* ------------------------------------------------------------------ */
/* Menus contract                                                      */
/* ------------------------------------------------------------------ */

export interface ContractMenuItem {
  name: string;
  caption: string;
  isSeparator: boolean;
  shortcut: string | null;
  tag: number | null;
  onClick: string | null;
  visible: boolean;
  enabled: boolean;
  children: ContractMenuItem[];
}

export interface ContractMainMenu {
  file: string;
  name: string;
  type: string;
  items: ContractMenuItem[];
}

export interface MenusContract {
  _meta: { source: string; extractedAt: string; description: string };
  mainMenus: ContractMainMenu[];
}

/* ------------------------------------------------------------------ */
/* Forms contract                                                      */
/* ------------------------------------------------------------------ */

export interface ContractForm {
  file: string;
  formName: string;
  formClass: string;
  declaration: string;
  caption: string;
  childComponentCount: number;
  features: {
    hasGrid: boolean;
    hasTree: boolean;
    hasMemo: boolean;
    hasListBox: boolean;
    hasPageControl: boolean;
  };
}

export interface FormsContract {
  _meta: { source: string; extractedAt: string; description: string };
  forms: ContractForm[];
}

/* ------------------------------------------------------------------ */
/* RPC Catalog contract                                                */
/* ------------------------------------------------------------------ */

export interface ContractRpcCallSite {
  file: string;
  line: number;
  procedure: string;
}

export interface ContractRpc {
  name: string;
  callSiteCount: number;
  callSites: ContractRpcCallSite[];
  patterns: string[];
  isContext: boolean;
}

export interface RpcCatalogContract {
  _meta: { source: string; extractedAt: string; description: string };
  rpcs: Record<string, ContractRpc>;
}

/* ------------------------------------------------------------------ */
/* Screen Registry contract                                            */
/* ------------------------------------------------------------------ */

export interface ScreenRpcEntry {
  callSiteCount: number;
  callSites: ContractRpcCallSite[];
  patterns: string[];
  isContext: boolean;
}

export interface ContractScreen {
  tab: string | null;
  sourceFiles: string[];
  rpcs: Record<string, ScreenRpcEntry>;
}

export interface ScreenRegistryContract {
  _meta: { source: string; extractedAt: string; description: string };
  screens: Record<string, ContractScreen>;
}
