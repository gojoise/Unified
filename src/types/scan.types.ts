/** Provenance d'un candidat — détermine la fiabilité et l'icône affichée. */
export type ScanSource = 'steam' | 'gog' | 'xbox' | 'folder'

/** Fiabilité du candidat : pilote la pré-sélection dans le dialogue de validation. */
export type ScanConfidence = 'high' | 'medium' | 'low'

/** Candidat retourné par le scan (miroir de electron/gameScanner.ts). */
export interface ScanCandidate {
  title: string
  exePath: string
  installDir: string
  gameIcon: string
  /** Icône issue d'un manifeste (logo Xbox) : elle survit à un changement d'exécutable. */
  iconFromManifest: boolean
  source: ScanSource
  confidence: ScanConfidence
  alternatives: string[]
}

/** Progression émise par le main process pendant le parcours. */
export interface ScanProgress {
  scanned: number
  total: number
  found: number
  current: string
}

/** Candidat enrichi de l'état d'édition du dialogue. */
export interface ScanEntry extends ScanCandidate {
  selected: boolean
  /**
   * Vrai dès que l'utilisateur a choisi l'exécutable lui-même. La fiabilité
   * calculée ne s'applique plus : elle notait le binaire élu par le score.
   */
  manualChoice: boolean
}

export const SCAN_SOURCE_LABELS: Record<ScanSource, { label: string; icon: string }> = {
  steam:  { label: 'Steam',   icon: 'mdi-steam' },
  gog:    { label: 'GOG',     icon: 'mdi-controller-classic' },
  xbox:   { label: 'Xbox',    icon: 'mdi-microsoft-xbox' },
  folder: { label: 'Dossier', icon: 'mdi-folder' },
}
