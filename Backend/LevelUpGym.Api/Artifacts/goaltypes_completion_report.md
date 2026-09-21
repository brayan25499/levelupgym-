# GoalTypes Completion Report

## Existing GoalTypes (before this migration)

| Id | Nombre | Direccion | Descripción (original seed) |
|----|--------|-----------|-----------------------------|
| 1 | Peso | MENOR | Alcanzar un peso corporal determinado. |
| 2 | IMC | MENOR | Alcanzar un índice de masa corporal determinado. |
| 3 | Cintura | MENOR | Reducir la medida de cintura. |
| 4 | Pecho | MAYOR | Aumentar la medida de pecho. |
| 5 | Brazo | MAYOR | Aumentar la medida de brazo. |
| 6 | Pierna | MAYOR | Aumentar la medida de pierna. |
| 7 | Porcentaje de grasa | MENOR | Reducir el porcentaje de grasa corporal. |

## GoalTypes added by the migration `FixGoalTypesAndSeedMissing`

| Nombre | Direccion | Descripción (added) |
|--------|-----------|----------------------|
| Peso | MAYOR | Aumentar el peso corporal. |
| IMC | MAYOR | Aumentar el índice de masa corporal. |
| Cintura | MAYOR | Aumentar la medida de cintura. |
| Pecho | MENOR | Reducir la medida de pecho. |
| Brazo | MENOR | Reducir la medida de brazo. |
| Pierna | MENOR | Reducir la medida de pierna. |

## Summary
- **Total GoalTypes before:** 7 (including the generic *Porcentaje de grasa* which is unrelated to the requested measurements).
- **GoalTypes added:** 6, completing the missing **Aumento** or **Disminución** direction for each of the six requested measurements (Peso, IMC, Cintura, Pecho, Brazo, Pierna).
- **No duplicates** were created; each `(Nombre, Direccion)` pair is now unique thanks to the new filtered unique index `IX_GoalTypes_Nombre_Direccion_Unique`.
- **Altura** was intentionally omitted.

The catalogue `GoalTypes` now contains a full set of logical objectives for every measurement that can be recorded in `ProgressReports`.
