/**
 * Utility for Nicaraguan ID (Cédula de Identidad) validation
 */

/**
 * Validates a Nicaraguan ID number and returns the status
 * Format: 001-290590-0005T or 0012905900005T
 * 
 * @param {string} cedula 
 * @returns {Object} { isValid: boolean, error: string | null }
 */
export const validateNicaraguanCedula = (cedula) => {
    if (!cedula) return { isValid: false, error: 'El número de cédula es obligatorio' };

    // Format: 001-290590-0005T
    const cedulaRegex = /^(\d{3})-?(\d{2})(\d{2})(\d{2})-?(\d{4})([A-Z])$/i;
    const match = cedula.match(cedulaRegex);

    if (!match) {
        return {
            isValid: false,
            error: 'Formato inválido. Debe ser: 000-000000-0000X'
        };
    }

    const [full, dpt, day, month, year, seq, letter] = match;

    // 1. Validar Código de Departamento/Municipio (Rango aproximado 001-615)
    const dptInt = parseInt(dpt);
    if (dptInt === 0 || dptInt > 615) {
        return { isValid: false, error: 'Código de departamento/municipio inválido' };
    }

    // 2. Validar que la PARTE DE LA FECHA sea coherente
    const dayInt = parseInt(day);
    const monthInt = parseInt(month);
    // Nota: El año es YY, no podemos validar el siglo exacto pero sí el rango 01-12 en meses
    if (monthInt < 1 || monthInt > 12) {
        return { isValid: false, error: 'Mes de nacimiento inválido en la cédula' };
    }
    if (dayInt < 1 || dayInt > 31) {
        return { isValid: false, error: 'Día de nacimiento inválido en la cédula' };
    }

    // 3. Algoritmo Módulo 23 (Dígito verificador)
    const digitsOnly = dpt + day + month + year + seq;
    const inputLetter = letter.toUpperCase();
    const letters = "ABCDEFGHJKLMNPQRSTUVWXY";

    try {
        const number = parseInt(digitsOnly, 10);
        const remainder = number % 23;
        const expectedLetter = letters[remainder];

        if (inputLetter !== expectedLetter) {
            return {
                isValid: false,
                error: `Cédula no válida (Dígito '${inputLetter}' no coincide)`
            };
        }

        return { isValid: true, error: null };
    } catch (e) {
        return { isValid: false, error: 'Error al procesar el número de cédula' };
    }
};

/**
 * Formats a raw string into a Nicaraguan ID format XXX-XXXXXX-XXXXX
 * 
 * @param {string} value 
 * @returns {string}
 */
export const formatCedula = (value) => {
    // Remove everything that isn't a digit or a letter
    let cleaned = value.replace(/[^0-9A-Za-z]/g, '').toUpperCase();

    // Slice to maximum length (13 digits + 1 letter)
    if (cleaned.length > 14) cleaned = cleaned.slice(0, 14);

    let formatted = '';
    if (cleaned.length > 0) {
        formatted += cleaned.substring(0, Math.min(cleaned.length, 3));
    }
    if (cleaned.length > 3) {
        formatted += '-' + cleaned.substring(3, Math.min(cleaned.length, 9));
    }
    if (cleaned.length > 9) {
        formatted += '-' + cleaned.substring(9, Math.min(cleaned.length, 13));
    }
    if (cleaned.length > 13) {
        formatted += cleaned.substring(13, 14);
    }

    return formatted;
};

/**
 * Validates an email address format
 * 
 * @param {string} email 
 * @returns {Object} { isValid: boolean, error: string | null }
 */
export const validateEmail = (email) => {
    if (!email) return { isValid: false, error: 'El correo electrónico es obligatorio' };

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

    if (!emailRegex.test(email)) {
        return {
            isValid: false,
            error: 'Correo electrónico no válido (ej: usuario@correo.com)'
        };
    }

    return { isValid: true, error: null };
};
