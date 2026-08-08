# State & persistence

- Estado de juego en memoria: src/context/GameContext.tsx (GameProvider + useGame())
- Persistencia real (localStorage): src/utils/learning-storage.ts — única puerta de entrada a window.localStorage
- Patrón para nuevos campos persistidos:
  1. Agregar campo a UserLearningData en types/progress.ts
  2. Default en DEFAULT_DATA + fallback en getLearningData()
  3. Función saveX() dedicada que hace getLearningData() → merge → saveLearningData()
  4. GameContext expone la acción y hace setLearningData(updatedData)
- Nunca leer/escribir localStorage fuera de learning-storage.ts