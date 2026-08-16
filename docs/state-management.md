# State & persistence

- Estado de juego en memoria: Redux Toolkit (`src/store/`)
  - `store/index.ts` — `configureStore` con slices `auth`, `game`, `theme`; exporta `RootState`/`AppDispatch`
  - `store/hooks.ts` — `useAppDispatch`/`useAppSelector` tipados (`.withTypes<>()`, patrón RTK 2.x/react-redux 9.x)
  - `store/slices/` — `authSlice.ts`, `gameSlice.ts`, `themeSlice.ts` (createSlice + PayloadAction, sin mutación directa fuera de Immer)
  - `hooks/useGame.ts`, `hooks/useAuth.ts`, `hooks/useTheme.ts` — reemplazan a los antiguos `useGame()`/`useAuth()`/`useTheme()` de Context; misma interfaz pública, así que los componentes consumidores solo cambian el import
- Efectos de arranque (montados una vez en la raíz, `src/components/app/`):
  - `Providers.tsx` — envuelve la app en `<Provider store={store}>` + monta los 3 Effects
  - `AuthEffects.tsx` — listener de sesión de Supabase, despacha `setAuthState`
  - `GameEffects.tsx` — hidratación inicial desde localStorage, sync al iniciar sesión (`syncOnLogin`), limpieza al volver a invitado, push debounced a Supabase (800ms)
  - `ThemeEffects.tsx` — persistencia de tema + listener de `prefers-color-scheme`
- Persistencia real (localStorage): `src/utils/learning-storage.ts` — única puerta de entrada a `window.localStorage`
- Sync con Supabase: `src/utils/cloud-storage.ts` (`fetchRemoteLearningData`/`pushLearningData`/`mergeLearningData`/`syncOnLogin`), invocado desde `GameEffects.tsx`
- Patrón para nuevos campos persistidos:
  1. Agregar campo a `UserLearningData` en `types/progress.ts`
  2. Default en `DEFAULT_DATA` + fallback en `getLearningData()`
  3. Función `saveX()` dedicada que hace `getLearningData()` → merge → `saveLearningData()`
  4. El hook correspondiente (`useGame`, etc.) llama la acción del slice (`dispatch(setLearningData(updatedData))`)
- Nunca leer/escribir localStorage fuera de `learning-storage.ts`
- Nunca leer/escribir el store de Redux fuera de `store/slices/` — los componentes usan los hooks de `src/hooks/`, no `useAppDispatch`/`useAppSelector` directo (salvo dentro de los propios hooks/Effects)