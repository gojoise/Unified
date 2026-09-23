import { computed } from 'vue';
import { useScan } from '../services/scan.service';
import {
  SCAN_SOURCE_LABELS,
  type ScanConfidence,
  type ScanEntry,
} from '../types/scan.types';

interface Badge {
  color: string;
  label: string;
  icon: string;
}

/** Puce de fiabilité — `high` n'en affiche aucune, c'est le cas nominal. */
const CONFIDENCE_BADGES: Record<ScanConfidence, Badge | null> = {
  high: null,
  medium: { color: 'warning', label: 'À vérifier', icon: 'mdi-alert-outline' },
  low: { color: 'error', label: 'Peu sûr', icon: 'mdi-alert-outline' },
};

/** Un exécutable choisi à la main n'est plus jugé par le score. */
const MANUAL_BADGE: Badge = {
  color: 'primary',
  label: 'Choix manuel',
  icon: 'mdi-cursor-default-click-outline',
};

export default {
  setup() {
    const {
      scan,
      selectedCount,
      allSelected,
      cancelScan,
      confirmSelection,
      revealEntry,
      ignoreEntry,
      chooseExecutable,
      toggleAll,
      closeDialog,
    } = useScan();

    const progressPercent = computed(() =>
      scan.progress.total > 0
        ? (scan.progress.scanned / scan.progress.total) * 100
        : 0
    );

    // Valider sans rien cocher reste une décision : tout est écarté. Le bouton le
    // dit plutôt que de rester désactivé sans expliquer pourquoi.
    const confirmLabel = computed(() =>
      selectedCount.value === 0
        ? 'Tout écarter'
        : `Ajouter ${selectedCount.value} jeu${selectedCount.value > 1 ? 'x' : ''}`
    );

    /** Nom de fichier seul, pour le menu des exécutables alternatifs. */
    const exeName = (exePath: string) =>
      exePath.split(/[\\/]/).pop() ?? exePath;

    /** Chemin de l'exécutable relatif au dossier d'installation, plus lisible. */
    const relativeExe = (entry: ScanEntry) => {
      const suffix = entry.exePath
        .slice(entry.installDir.length)
        .replace(/^[\\/]/, '');
      return entry.exePath.startsWith(entry.installDir)
        ? suffix
        : entry.exePath;
    };

    const sourceOf = (entry: ScanEntry) => SCAN_SOURCE_LABELS[entry.source];
    /**
     * La fiabilité affichée note l'exécutable élu par le score. Dès que
     * l'utilisateur en choisit un autre, ce jugement ne s'applique plus : c'est
     * lui qui fait autorité, afficher « Peu sûr » sur sa décision n'aurait pas
     * de sens — et recalculer le score serait trompeur, un binaire correct peut
     * très bien scorer bas.
     */
    const badgeOf = (entry: ScanEntry) =>
      entry.manualChoice ? MANUAL_BADGE : CONFIDENCE_BADGES[entry.confidence];

    return {
      scan,
      selectedCount,
      allSelected,
      progressPercent,
      confirmLabel,
      exeName,
      relativeExe,
      sourceOf,
      badgeOf,
      onCancelScan: cancelScan,
      onReveal: revealEntry,
      onConfirm: confirmSelection,
      onIgnore: ignoreEntry,
      onChooseExecutable: chooseExecutable,
      onToggleAll: toggleAll,
      onClose: closeDialog,
    };
  },
};
