export interface DirectoryEntry {
  name: string;
  path: string;
}

export interface BrowseResponse {
  path: string;
  parent: string | null;
  entries: DirectoryEntry[];
}
