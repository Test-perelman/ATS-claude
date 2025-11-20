/**
 * Auto-Deduplication Logic
 * Fuzzy matching for candidates, vendors, clients, etc.
 */

import Fuse from 'fuse.js';
import { supabase } from '@/lib/supabase/client';

// Fuzzy matching configuration
const FUZZY_THRESHOLD = 0.4; // Lower = stricter matching

/**
 * Find duplicate candidates based on email, phone, name, or passport
 */
export async function findDuplicateCandidates(candidateData: {
  email_address?: string;
  phone_number?: string;
  first_name?: string;
  last_name?: string;
  passport_number?: string;
}) {
  const { email_address, phone_number, first_name, last_name, passport_number } = candidateData;

  // Direct match on unique fields
  const { data: exactMatches, error } = await supabase
    .from('candidates')
    .select('*')
    .or(
      `email_address.eq.${email_address || ''},phone_number.eq.${phone_number || ''},passport_number.eq.${passport_number || ''}`
    );

  if (exactMatches && exactMatches.length > 0) {
    return { found: true, matches: exactMatches, matchType: 'exact' };
  }

  // Fuzzy match on name
  if (first_name && last_name) {
    const { data: allCandidates } = await supabase
      .from('candidates')
      .select('*')
      .limit(1000);

    if (allCandidates && allCandidates.length > 0) {
      const fuse = new Fuse(allCandidates, {
        keys: ['first_name', 'last_name'],
        threshold: FUZZY_THRESHOLD,
        includeScore: true,
      });

      const fuzzyResults = fuse.search(`${first_name} ${last_name}`);

      if (fuzzyResults.length > 0 && fuzzyResults[0].score! < FUZZY_THRESHOLD) {
        return {
          found: true,
          matches: fuzzyResults.map((r) => r.item),
          matchType: 'fuzzy',
          confidence: 1 - fuzzyResults[0].score!,
        };
      }
    }
  }

  return { found: false, matches: [], matchType: 'none' };
}

/**
 * Find duplicate vendors based on name, email, or phone
 */
export async function findDuplicateVendors(vendorData: {
  vendor_name?: string;
  contact_email?: string;
  contact_phone?: string;
}) {
  const { vendor_name, contact_email, contact_phone } = vendorData;

  // Direct match on email or phone
  if (contact_email || contact_phone) {
    const { data: exactMatches } = await supabase
      .from('vendors')
      .select('*')
      .or(`contact_email.eq.${contact_email || ''},contact_phone.eq.${contact_phone || ''}`);

    if (exactMatches && exactMatches.length > 0) {
      return { found: true, matches: exactMatches, matchType: 'exact' };
    }
  }

  // Fuzzy match on vendor name
  if (vendor_name) {
    const { data: allVendors } = await supabase.from('vendors').select('*').limit(500);

    if (allVendors && allVendors.length > 0) {
      const fuse = new Fuse(allVendors, {
        keys: ['vendor_name'],
        threshold: FUZZY_THRESHOLD,
        includeScore: true,
      });

      const fuzzyResults = fuse.search(vendor_name);

      if (fuzzyResults.length > 0 && fuzzyResults[0].score! < FUZZY_THRESHOLD) {
        return {
          found: true,
          matches: fuzzyResults.map((r) => r.item),
          matchType: 'fuzzy',
          confidence: 1 - fuzzyResults[0].score!,
        };
      }
    }
  }

  return { found: false, matches: [], matchType: 'none' };
}

/**
 * Find duplicate clients based on name, email, or phone
 */
export async function findDuplicateClients(clientData: {
  client_name?: string;
  primary_contact_email?: string;
  primary_contact_phone?: string;
}) {
  const { client_name, primary_contact_email, primary_contact_phone } = clientData;

  // Direct match on email or phone
  if (primary_contact_email || primary_contact_phone) {
    const { data: exactMatches } = await supabase
      .from('clients')
      .select('*')
      .or(
        `primary_contact_email.eq.${primary_contact_email || ''},primary_contact_phone.eq.${primary_contact_phone || ''}`
      );

    if (exactMatches && exactMatches.length > 0) {
      return { found: true, matches: exactMatches, matchType: 'exact' };
    }
  }

  // Fuzzy match on client name
  if (client_name) {
    const { data: allClients } = await supabase.from('clients').select('*').limit(500);

    if (allClients && allClients.length > 0) {
      const fuse = new Fuse(allClients, {
        keys: ['client_name'],
        threshold: FUZZY_THRESHOLD,
        includeScore: true,
      });

      const fuzzyResults = fuse.search(client_name);

      if (fuzzyResults.length > 0 && fuzzyResults[0].score! < FUZZY_THRESHOLD) {
        return {
          found: true,
          matches: fuzzyResults.map((r) => r.item),
          matchType: 'fuzzy',
          confidence: 1 - fuzzyResults[0].score!,
        };
      }
    }
  }

  return { found: false, matches: [], matchType: 'none' };
}

/**
 * Merge candidate data (append new fields to existing record)
 */
export function mergeCandidateData(existing: any, newData: any) {
  const merged = { ...existing };

  Object.keys(newData).forEach((key) => {
    if (newData[key] !== null && newData[key] !== undefined && newData[key] !== '') {
      // Append to existing field if it's empty
      if (!merged[key] || merged[key] === '') {
        merged[key] = newData[key];
      }
      // For skills and notes, concatenate
      else if (
        key === 'skills_primary' ||
        key === 'skills_secondary' ||
        key === 'notes_internal'
      ) {
        if (!merged[key].includes(newData[key])) {
          merged[key] = `${merged[key]}; ${newData[key]}`;
        }
      }
      // For other fields, keep the newer value
      else {
        merged[key] = newData[key];
      }
    }
  });

  return merged;
}

/**
 * Generic merge function for any entity
 */
export function mergeEntityData(existing: any, newData: any, appendFields: string[] = []) {
  const merged = { ...existing };

  Object.keys(newData).forEach((key) => {
    if (newData[key] !== null && newData[key] !== undefined && newData[key] !== '') {
      if (!merged[key] || merged[key] === '') {
        merged[key] = newData[key];
      } else if (appendFields.includes(key)) {
        if (!merged[key].includes(newData[key])) {
          merged[key] = `${merged[key]}; ${newData[key]}`;
        }
      } else {
        merged[key] = newData[key];
      }
    }
  });

  return merged;
}
