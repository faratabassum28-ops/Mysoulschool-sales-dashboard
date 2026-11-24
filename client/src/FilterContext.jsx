import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api } from './api.js';

const Ctx = createContext(null);

export function FilterProvider({ children }) {
  const [meta, setMeta] = useState(null);
  const [metaError, setMetaError] = useState(null);
  const [filters, setFilters] = useState({ from: '', to: '', programs: [], closers: [] });

  useEffect(() => {
    api('/meta').then(setMeta).catch(setMetaError);
  }, []);

  const value = useMemo(() => ({
    meta,
    metaError,
    filters,
    setFilters: (patch) => setFilters((f) => ({ ...f, ...patch })),
  }), [meta, metaError, filters]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useFilters = () => useContext(Ctx);
