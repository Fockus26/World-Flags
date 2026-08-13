# TODO's

## 1. Repetición espaciada + práctica diaria (estilo Anki)
- Refuerza banderas falladas, retrasa las ya dominadas.
- Feedback inmediato por respuesta.
- Jugable 100% con teclado.
- Nota de arquitectura: `isCountryLearned()` hoy es una heurística simple
  (≥1 acierto en los últimos 3 intentos), sin fechas de repaso ni
  intervalos — no es todavía un algoritmo de repetición espaciada real.
  Este feature probablemente empieza ahí: diseñar el modelo de intervalos
  antes de tocar UI.
- El modo de práctica diaria probablemente necesita un patrón de
  interacción nuevo (autoevaluación tipo Anki: mostrar la respuesta y que
  el usuario califique con una tecla, en vez de escribir el nombre) — no
  asumas que el `AnswerForm` actual de texto libre aplica igual aquí.

## 2. Estadísticas sociales + logros
- Leaderboard: top 5 de otros jugadores.
- Logros: ej. "aprender un continente", "primeras 100 banderas",
  "todo el mundo".
- Nota de arquitectura: la tabla `user_learning_data` de Supabase es
  privada por usuario — un leaderboard público necesita una tabla/vista
  agregada nueva con sus propias políticas RLS, no reutilizar esa tabla
  directo.

## 3. Nuevos modos de juego
- **Todos los países de un tirón**: elegir alcance (continente o mundo),
  temporizador, escribir todos los países de ese alcance, conteo de
  aciertos.
- **Capitales**: se muestra el país, se responde la capital.
- **Ubicar en el mapa**: se muestra el país, se hace clic en su ubicación
  en un mapa mundial (que se va coloreando).
- **Modo Burst**: variante a contrarreloj — aplicable tanto a los modos
  nuevos como al juego de banderas actual.
- Cada modo nuevo probablemente sigue el mismo patrón de carpeta
  (`components/game/<modo>/` con su propia configuración), reutilizando
  las piezas de `ui/` ya existentes.
