import { useState, useEffect, useCallback } from 'react';
import { currencyApi } from '../api/currencyApi';
import type { CurrencyInfo, CurrencyCode } from '../types/currency';

// Default live fallback rates relative to 1 EUR
const DEFAULT_EUR_RATES: Record<string, number> = {
  EUR: 1.0,
  USD: 1.16,
  MAD: 10.85,
};

/**
 * Universal Currency Conversion Formula for MAD, EUR, USD
 * Converts amount from any currency (from) to any currency (to).
 */
export function convertCurrency(
  amount: number,
  from: string,
  to: string,
  eurRates: Record<string, number> = DEFAULT_EUR_RATES
): { converted: number; rate: number; isConverted: boolean } {
  if (!amount || isNaN(amount) || amount === 0) {
    return { converted: 0, rate: 1, isConverted: false };
  }

  const cleanFrom = (from || 'MAD').toUpperCase().trim();
  const cleanTo = (to || 'MAD').toUpperCase().trim();

  if (cleanFrom === cleanTo) {
    return { converted: amount, rate: 1, isConverted: false };
  }

  const eurToFrom = eurRates[cleanFrom] ?? DEFAULT_EUR_RATES[cleanFrom] ?? 1.0;
  const eurToTarget = eurRates[cleanTo] ?? DEFAULT_EUR_RATES[cleanTo] ?? 1.0;

  if (eurToFrom <= 0) {
    return { converted: amount, rate: 1, isConverted: false };
  }

  // 1 unit of 'from' in 'to'
  const unitRate = eurToTarget / eurToFrom;
  const converted = Math.round(amount * unitRate * 100) / 100;

  return {
    converted,
    rate: Math.round(unitRate * 10000) / 10000,
    isConverted: true,
  };
}

export function useCurrencyConverter(targetCurrency: string = 'MAD') {
  const [eurRates, setEurRates] = useState<Record<string, number>>(DEFAULT_EUR_RATES);
  const [currencies, setCurrencies] = useState<CurrencyInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load supported currencies & latest EUR rates on mount
  useEffect(() => {
    currencyApi
      .getCurrencies()
      .then((res) => {
        if (Array.isArray(res.data)) {
          setCurrencies(res.data);
        }
      })
      .catch((err) => {
        console.warn('Could not load currencies list:', err);
      });

    setIsLoading(true);
    // Fetch live rates relative to EUR
    currencyApi
      .getRates('EUR')
      .then((res) => {
        if (res.data && Object.keys(res.data).length > 0) {
          setEurRates((prev) => ({
            ...prev,
            ...res.data,
            EUR: 1.0,
          }));
        }
      })
      .catch((err) => {
        console.warn('Using default fallback rates for EUR:', err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  /**
   * Converts an amount from source currency into target currency.
   */
  const convertToTarget = useCallback(
    (amount: number, fromCurrency: string, customTarget?: string) => {
      const target = customTarget || targetCurrency || 'MAD';
      return convertCurrency(amount, fromCurrency, target, eurRates);
    },
    [eurRates, targetCurrency]
  );

  return {
    rates: eurRates,
    currencies,
    isLoadingRates: isLoading,
    convertToTarget,
    convertCurrency: (amount: number, from: string, to: string) =>
      convertCurrency(amount, from, to, eurRates),
  };
}
