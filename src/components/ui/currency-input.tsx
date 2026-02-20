import React, { useState, useEffect, FocusEvent, ChangeEvent } from 'react';
import { Input } from './input';
import { validateAndFormatCurrency, formatCurrencyInput } from '../../lib/currencyUtils';

interface CurrencyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
    value: number | string;
    onValueChange: (value: number) => void;
}

export function CurrencyInput({ value, onValueChange, className, ...props }: CurrencyInputProps) {
    const [displayValue, setDisplayValue] = useState('');
    const [isFocused, setIsFocused] = useState(false);

    // Sync with external value changes when not focused
    useEffect(() => {
        if (!isFocused) {
            const numValue = typeof value === 'string' ? parseFloat(value) : value;
            setDisplayValue(formatCurrencyInput(Number.isNaN(numValue) ? 0 : numValue));
        }
    }, [value, isFocused]);

    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        // Allow digits, comma, dot, minus
        const cleanValue = newValue.replace(/[^0-9,.-]/g, '');
        setDisplayValue(cleanValue);

        // Parse and notify parent
        const result = validateAndFormatCurrency(cleanValue);
        if (result.isValid) {
            onValueChange(result.value);
        }
    };

    const handleBlur = (e: FocusEvent<HTMLInputElement>) => {
        setIsFocused(false);
        const result = validateAndFormatCurrency(displayValue);
        setDisplayValue(result.formatted);
        onValueChange(result.value);
        props.onBlur?.(e);
    };

    const handleFocus = (e: FocusEvent<HTMLInputElement>) => {
        setIsFocused(true);
        props.onFocus?.(e);
    };

    return (
        <Input
            {...props}
            type="text"
            value={displayValue}
            onChange={handleChange}
            onBlur={handleBlur}
            onFocus={handleFocus}
            className={className}
        />
    );
}
