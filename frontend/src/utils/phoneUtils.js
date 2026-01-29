import { parsePhoneNumber, isValidPhoneNumber } from 'libphonenumber-js';

/**
 * Validates a phone number and attempts to identify the carrier (Nicaragua focus).
 * @param {string} phoneNumber - The phone number to validate.
 * @param {string} countryCode - The ISO country code (default 'NI').
 * @returns {object} - { isValid, carrier, formatted, error, carrierLogo }
 */
export const validateAndIdentifyPhone = (phoneNumber, countryCode = 'NI') => {
    if (!phoneNumber) {
        return { isValid: false, carrier: null, formatted: '', error: null, carrierLogo: null };
    }

    let carrier = null;
    let carrierColor = '#757575'; // Grey
    let carrierLogo = '/operador-desconocido.webp'; // Default
    let isValid = false;
    let error = null;
    let formatted = phoneNumber;

    try {
        // 1. Prepare for Carrier Detection (Clean non-digits)
        const rawInput = phoneNumber.toString().replace(/\D/g, '');

        // Only attempt to guess if we have at least 2 digits
        if (countryCode === 'NI' && rawInput.length >= 2) {
            const prefix1 = rawInput.substring(0, 1);
            const prefix2 = rawInput.substring(0, 2);

            if (prefix1 === '5') {
                carrier = 'Claro (Probable)';
                carrierColor = '#b20f00ff';
                carrierLogo = 'https://w7.pngwing.com/pngs/901/902/png-transparent-claro-hd-logo-thumbnail.png';
            } else if (prefix1 === '7') {
                carrier = 'Tigo (Probable)';
                carrierColor = '#00377d';
                carrierLogo = 'https://images.seeklogo.com/logo-png/18/2/tigo-logo-png_seeklogo-187110.png';
            } else if (prefix1 === '8') {
                if (['84', '86', '88', '83'].includes(prefix2)) {
                    carrier = 'Claro (Probable)';
                    carrierColor = '#b20f00ff';
                    carrierLogo = 'https://w7.pngwing.com/pngs/901/902/png-transparent-claro-hd-logo-thumbnail.png';
                } else if (['81', '82', '85', '87', '89'].includes(prefix2)) {
                    carrier = 'Tigo (Probable)';
                    carrierColor = '#00377d';
                    carrierLogo = 'https://images.seeklogo.com/logo-png/18/2/tigo-logo-png_seeklogo-187110.png';
                } else {
                    carrier = 'Móvil (Carrier incierto)';
                    // Keep default unknown logo
                }
            } else if (prefix1 === '2') {
                carrier = 'Línea Fija (Claro/Otros)';
                carrierColor = '#e65100';
                // Keep default unknown logo
            }
        }

        // 2. Validate using libphonenumber-js
        if (isValidPhoneNumber(phoneNumber, countryCode)) {
            isValid = true;
            const parsedNumber = parsePhoneNumber(phoneNumber, countryCode);
            formatted = parsedNumber.formatNational();
        } else {
            isValid = false;
            error = 'Número inválido / incompleto';
        }

        return {
            isValid,
            carrier,
            carrierColor,
            carrierLogo,
            formatted,
            error
        };

    } catch (err) {
        return {
            isValid: false,
            carrier: null,
            formatted: phoneNumber,
            error: 'Formato inválido',
            carrierLogo: '/operador-desconocido.webp'
        };
    }
};
