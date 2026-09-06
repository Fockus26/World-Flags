# TODO's

## 1. Repetición espaciada + práctica diaria (estilo Anki)
- Al pasar al PWA se pierde el progreso?
- [x] Modo practica solo se puede una vez por dia por continente
- [x] Practica diaria tiene que volver a mostrar las banderas que se les coloco otra vez, utilizar sistema de repetir de nuevo en la misma sesion en caso de no saber (también aplicado a la práctica por continente)
- [x] El timer se pasa al modo practica (ahora es un toggle activar/desactivar, no atado a la dificultad)
- [x] El competitivo es cronometrado, el que acierte mas banderas lo mas rapido posible

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
