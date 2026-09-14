/**
 * Valores fijos que se usan en varios lugares del backend.
 * Los dejo todos juntos aca para no repetir strings sueltos por el codigo.
 */

// Roles posibles de un usuario.
//  - 'none'     -> se acaba de registrar, el admin todavia no lo aprobo.
//                  No puede usar nada de la app hasta que lo aprueben.
//  - 'empleado' -> usuario normal aprobado.
//  - 'admin'    -> ademas puede aprobar usuarios y cambiar roles.
export const ROLES = ['none', 'empleado', 'admin'] as const;
export type Role = (typeof ROLES)[number];

// Tipos de guardia. 'otra' queda como comodin para casos raros.
export const SHIFT_TYPES = ['12h', '24h', 'pasiva', 'otra'] as const;
export type ShiftType = (typeof SHIFT_TYPES)[number];

// Estados de una solicitud de intercambio.
export const SWAP_STATUS = ['pending', 'accepted', 'rejected', 'cancelled'] as const;
export type SwapStatus = (typeof SWAP_STATUS)[number];

// Modo de calculo del cobro.
//  - 'hora'    -> total = horas trabajadas * valorHora
//  - 'guardia' -> total = suma del precio fijo de cada tipo de guardia
export const RATE_MODES = ['hora', 'guardia'] as const;
export type RateMode = (typeof RATE_MODES)[number];

// Sugerencias de sector para el selector de la app.
// El campo en la base es texto libre, asi que si a alguien le falta
// el suyo lo puede escribir igual.
export const SECTOR_SUGGESTIONS = [
  'Guardia',
  'Terapia Intensiva',
  'Clinica Medica',
  'Cirugia',
  'Pediatria',
  'Maternidad',
  'Enfermeria',
  'Laboratorio',
  'Imagenes',
  'Administracion',
];
