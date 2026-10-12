export interface ArchitectureDiagram {
  id: string;
  title: string;
  description: string;
}

export interface ArchitectureCatalog {
  moduleId: string;
  title: string;
  revision: string;
  generatedAt: string;
  diagrams: ArchitectureDiagram[];
}
