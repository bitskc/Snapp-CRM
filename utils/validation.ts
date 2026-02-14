/**
 * Input validation utilities for Lead data
 */

export interface ValidationResult {
    isValid: boolean;
    errors: string[];
}

export const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

export const validateURL = (url: string): boolean => {
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
};

export const validatePhone = (phone: string): boolean => {
    // Basic phone validation - at least 10 digits
    const digitsOnly = phone.replace(/\D/g, '');
    return digitsOnly.length >= 10;
};

export const validateLead = (lead: any): ValidationResult => {
    const errors: string[] = [];

    if (!lead.companyName || !lead.companyName.trim()) {
        errors.push('Company name is required');
    }

    if (lead.email && !validateEmail(lead.email)) {
        errors.push('Invalid email address');
    }

    if (lead.phone && !validatePhone(lead.phone)) {
        errors.push('Invalid phone number (must be at least 10 digits)');
    }

    if (lead.website && !validateURL(lead.website)) {
        errors.push('Invalid website URL');
    }

    return {
        isValid: errors.length === 0,
        errors
    };
};
