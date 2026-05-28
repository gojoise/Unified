import { ref, onMounted } from 'vue';
import { useLibrary } from '../services/library.service'

export default {
  setup() {
    const { sortedLibrary, loading, load, add, launch, remove } = useLibrary();

    onMounted(() => {
      load();
    });

    const options = ref([
      { title: 'Supprimer', action: (path: string) => remove(path) },
      { title: 'Autre option' },
    ]);

    return {
      library: sortedLibrary,
      loadingGames: loading,
      options,
      onAddGame: add,
      onLaunchGame: launch,
    };
  },
};
