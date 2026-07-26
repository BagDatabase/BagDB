import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Search, Filter, Info, Upload, X, Check, ChevronDown, Package, Shield, ExternalLink, Menu, SlidersHorizontal, Link as LinkIcon } from 'lucide-react';

// --- IMPORTANT: Vercel Analytics ---
// The following line is commented out because third-party packages like 
// @vercel/analytics cannot be installed or compiled in this live preview environment. 
// When you deploy this code to Vercel locally, you can safely uncomment this line 
// and the <Analytics /> tag at the very bottom of the file!
import { Analytics } from '@vercel/analytics/react';

// --- CSV Parser Utility ---
function parseCSV(text) {
  const result = [];
  let row = [];
  let inQuotes = false;
  let currentValue = '';
  
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];
    
    if (char === '"' && inQuotes && nextChar === '"') {
      currentValue += '"';
      i++;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      row.push(currentValue.trim());
      currentValue = '';
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') i++;
      row.push(currentValue.trim());
      if (row.length > 0 && row.some(v => v !== '')) result.push(row);
      row = [];
      currentValue = '';
    } else {
      currentValue += char;
    }
  }
  if (currentValue || row.length > 0) {
    row.push(currentValue.trim());
    if (row.some(v => v !== '')) result.push(row);
  }
  
  if (result.length < 2) return [];
  const headers = result[0];
  const data = result.slice(1).map(rowArray => {
    const obj = {};
    headers.forEach((header, index) => {
      obj[header] = rowArray[index] || '';
    });
    return obj;
  });
  
  return data;
}

// --- Initial Data Fallback ---
const initialCsvString = `BRAND & NAME,Quick Access Pocket (#),Additional Notes,Bag Style Opening,Compression Straps,Depth (inches),Expandable,Expandable Volume,Handles,Height (inches),LINKS,Laptop Access,Lash Points (outside),Load Lifters,Luggage Pass Through / Trolley Sleeve,Material,Max. Laptop Size (in),Org Slots/Pockets,Origin of Company,Packable,Picture,Price (USD),QAP Location,Sternum Strap,Type,Volume (liters),WBP Location,Warranty,Water Bottle Pockets (#),Weight (lbs),Width (inches)
5.11 Rush 12 2.0,2,"External front and side molle.",Clamshell,2,6.5,No,No,1,18,https://www.511tactical.com,Internal sleeve,4,No,No,1050D nylon,15,No,USA,No,https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&q=80&w=400,109,top,Yes,Backpack,24,No,Lifetime,0,3.15,11
Mystery Ranch 2-Day Assault,2,"Adjustable yoke",Toploader & Clamshell,2,11.25,No,,1,21,https://mysteryranch.com,External compartment,5,Yes,No,500D Cordura,15,Yes,USA,No,https://images.unsplash.com/photo-1622560480605-d83c853bc5c3?auto=format&fit=crop&q=80&w=400,249,top,Yes,Backpack,27,No,Lifetime,2,3,12
Mystery Ranch Blitz 30,3,"Horseshoe zip",Clamshell,3,13.5,No,,1,20.5,https://mysteryranch.com,External compartment,0,Yes,No,Cordura,15,Yes,USA,No,https://images.unsplash.com/photo-1581605405669-fcdf81165afa?auto=format&fit=crop&q=80&w=400,289,front & top,Yes,Backpack,29,No,Lifetime,2,3.8,11.5
Aer City Sling 2,1,"Great organization",Clamshell,No,3.5,No,,1,6.5,https://aersf.com,No,0,No,No,1680D Cordura,No,Yes,USA,No,https://images.unsplash.com/photo-1590874103328-eac38a683ce7?auto=format&fit=crop&q=80&w=400,95,front,No,Sling,2.5,No,Lifetime,0,0.9,13`;

// --- Default Filters State ---
const defaultFilters = {
  brandName: '', volume: { min: 0, max: 100 }, price: { min: 0, max: 1000 },
  laptopSize: { min: 0, max: 20 }, laptopAccess: [], qap: { min: 0, max: 10 },
  qapLocation: [], wbp: { min: 0, max: 5 }, luggagePass: [], openingStyle: [],
  orgSlots: 'All', compression: 'All', loadLifters: 'All', sternum: 'All',
  material: '', warranty: [], weight: { min: 0, max: 15 }, height: { min: 0, max: 30 },
  width: { min: 0, max: 20 }, depth: { min: 0, max: 15 }, expandable: 'All', packable: 'All', origin: []
};

// --- UI Components ---
const RangeFilter = ({ label, min, max, value, onChange, unit = "" }) => {
  const isActive = (value.min !== '' && Number(value.min) !== min) || (value.max !== '' && Number(value.max) !== max);
  const inputClass = `w-full px-2 py-1 border rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none placeholder-slate-400 transition-colors ${
    isActive 
      ? 'bg-blue-50 border-blue-300 text-blue-900' 
      : 'bg-white border-slate-300 text-slate-900'
  }`;

  return (
    <div className="mb-4">
      <div className="flex justify-between items-center mb-1">
        <label className={`text-sm font-medium text-left ${isActive ? 'text-blue-700' : 'text-slate-700'}`}>{label}</label>
        <span className={`text-xs font-mono px-2 py-1 rounded transition-colors ${isActive ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-500'}`}>
          {value.min === '' ? min : value.min} - {value.max === '' ? max : value.max} {unit}
        </span>
      </div>
      <div className="flex gap-2 items-center">
        <input
          type="number"
          min={min}
          max={value.max === '' ? max : value.max}
          value={value.min}
          onChange={(e) => {
            const val = e.target.value;
            onChange({ ...value, min: val === '' ? '' : Number(val) });
          }}
          className={inputClass}
          placeholder="Min"
        />
        <span className="text-slate-400">-</span>
        <input
          type="number"
          min={value.min === '' ? min : value.min}
          max={max}
          value={value.max}
          onChange={(e) => {
            const val = e.target.value;
            onChange({ ...value, max: val === '' ? '' : Number(val) });
          }}
          className={inputClass}
          placeholder="Max"
        />
      </div>
    </div>
  );
};

const CheckboxGroup = ({ label, options, selected, onChange }) => {
  const isActive = selected.length > 0;
  return (
    <div className="mb-4">
      <label className={`text-sm font-medium block mb-2 text-left w-full ${isActive ? 'text-blue-700' : 'text-slate-700'}`}>{label}</label>
      <div className={`space-y-1 max-h-40 overflow-y-auto p-2 rounded-lg border transition-colors ${isActive ? 'border-blue-200 bg-blue-50/50' : 'border-transparent'}`}>
        {options.map((opt) => {
          const isSelected = selected.includes(opt);
          return (
            <label key={opt} className="flex items-center gap-2 cursor-pointer group">
              <input
                type="checkbox"
                checked={isSelected}
                onChange={(e) => {
                  if (e.target.checked) onChange([...selected, opt]);
                  else onChange(selected.filter((item) => item !== opt));
                }}
                className="rounded border-slate-300 bg-white text-blue-600 focus:ring-blue-500"
              />
              <span className={`text-sm transition-colors ${isSelected ? 'text-blue-700 font-medium' : 'text-slate-600 group-hover:text-slate-900'}`}>{opt || 'Unknown'}</span>
            </label>
          )
        })}
      </div>
    </div>
  );
};

const RadioGroup = ({ label, options, selected, onChange }) => {
  const isActive = selected !== 'All';
  return (
    <div className="mb-4">
      <label className={`text-sm font-medium block mb-2 text-left w-full ${isActive ? 'text-blue-700' : 'text-slate-700'}`}>{label}</label>
      <div className="flex bg-slate-100 p-1 rounded-lg">
        {options.map((opt) => {
          const isSelected = selected === opt;
          const isHighlighted = isSelected && opt !== 'All';
          return (
            <button
              key={opt}
              onClick={() => onChange(opt)}
              className={`flex-1 text-xs py-1.5 rounded-md font-medium transition-colors ${
                isHighlighted
                  ? 'bg-blue-100 text-blue-800 shadow-sm'
                  : isSelected 
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
              }`}
            >
              {opt}
            </button>
          )
        })}
      </div>
    </div>
  );
};

const MultiSelectDropdown = ({ label, options, selected, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef(null);
  const isActive = selected.length > 0;

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (ref.current && !ref.current.contains(event.target)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="mb-4 relative" ref={ref}>
      <label className={`text-sm font-medium block mb-1 text-left w-full ${isActive ? 'text-blue-700' : 'text-slate-700'}`}>{label}</label>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex justify-between items-center px-3 py-2 border rounded text-sm text-left transition-colors ${
          isActive 
            ? 'bg-blue-50 border-blue-300 text-blue-900'
            : 'bg-white border-slate-300 hover:bg-slate-50 text-slate-600'
        }`}
      >
        <span className="truncate">
          {selected.length === 0 ? "Select options..." : `${selected.length} selected`}
        </span>
        <ChevronDown size={16} className={isActive ? "text-blue-500" : "text-slate-400"} />
      </button>
      
      {isOpen && (
        <div className="absolute z-10 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
          <div className="p-2 space-y-1">
            {options.map((opt) => {
              const isSelected = selected.includes(opt);
              return (
                <label key={opt} className="flex items-center gap-2 p-1.5 hover:bg-slate-50 rounded cursor-pointer text-left">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(e) => {
                      if (e.target.checked) onChange([...selected, opt]);
                      else onChange(selected.filter((item) => item !== opt));
                    }}
                    className="rounded border-slate-300 bg-white text-blue-600 focus:ring-blue-500"
                  />
                  <span className={`text-sm ${isSelected ? 'text-blue-700 font-medium' : 'text-slate-700'}`}>{opt || 'Unknown'}</span>
                </label>
              )
            })}
          </div>
        </div>
      )}
    </div>
  );
};

// --- Main App Component ---
export default function App() {
  const [data, setData] = useState([]);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [selectedBag, setSelectedBag] = useState(null);
  const [copied, setCopied] = useState(false);

  // State parsed from URL parameters
  const getParam = (key, defaultVal) => {
    try {
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        return params.get(key) || defaultVal;
      }
    } catch (e) {}
    return defaultVal;
  };

  const [currentView, setCurrentView] = useState(() => getParam('view', 'database'));
  const [activeTab, setActiveTab] = useState(() => getParam('tab', 'Backpack'));
  const [searchQuery, setSearchQuery] = useState(() => getParam('q', ''));

  const [filters, setFilters] = useState(() => {
    try {
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        const parsedFilters = { ...defaultFilters };
        
        for (const [key, defaultVal] of Object.entries(defaultFilters)) {
          const paramVal = params.get(key);
          if (paramVal !== null) {
            if (typeof defaultVal === 'string') {
              parsedFilters[key] = paramVal;
            } else if (Array.isArray(defaultVal)) {
              parsedFilters[key] = paramVal ? paramVal.split(',') : [];
            } else if (typeof defaultVal === 'object' && defaultVal !== null) {
              const [minStr, maxStr] = paramVal.split('-');
              parsedFilters[key] = { 
                min: minStr === '' ? '' : Number(minStr), 
                max: maxStr === '' ? '' : Number(maxStr) 
              };
            }
          }
        }
        return parsedFilters;
      }
    } catch (e) {}
    return defaultFilters;
  });

  // Sync state to URL 
  useEffect(() => {
    try {
      if (typeof window === 'undefined') return;
      const params = new URLSearchParams();
      
      if (currentView !== 'database') params.set('view', currentView);
      if (activeTab !== 'Backpack') params.set('tab', activeTab);
      if (searchQuery) params.set('q', searchQuery);
      
      Object.entries(filters).forEach(([key, value]) => {
        const defaultVal = defaultFilters[key];
        if (typeof value === 'string' && value !== defaultVal) {
          params.set(key, value);
        } else if (Array.isArray(value) && value.length > 0) {
          params.set(key, value.join(','));
        } else if (typeof value === 'object' && value !== null) {
          if (value.min !== defaultVal.min || value.max !== defaultVal.max) {
            params.set(key, `${value.min === '' ? '' : value.min}-${value.max === '' ? '' : value.max}`);
          }
        }
      });
      
      const newUrl = `${window.location.pathname}${params.toString() ? '?' + params.toString() : ''}`;
      window.history.replaceState(null, '', newUrl);
    } catch (e) {
      // Ignore errors in sandboxed environments (like the Canvas live preview)
    }
  }, [currentView, activeTab, searchQuery, filters]);

// Fetch actual CSV from the public folder
  useEffect(() => {
    fetch('/BagDB Data.csv')
      .then(response => response.text())
      .then(text => {
        const parsed = parseCSV(text);
        if (parsed.length > 0) setData(parsed);
      })
      .catch(err => {
        console.error("Error loading CSV:", err);
        setData(parseCSV(initialCsvString)); // Fallback if it fails
      });
  }, []);


  const handleCopyLink = () => {
    try {
      let url = window.location.href;
      
      // Fallback builder for sandboxed iframe environments
      if (url === 'about:srcdoc') {
        const params = new URLSearchParams();
        if (currentView !== 'database') params.set('view', currentView);
        if (activeTab !== 'Backpack') params.set('tab', activeTab);
        if (searchQuery) params.set('q', searchQuery);
        
        Object.entries(filters).forEach(([key, value]) => {
          const defaultVal = defaultFilters[key];
          if (typeof value === 'string' && value !== defaultVal) params.set(key, value);
          else if (Array.isArray(value) && value.length > 0) params.set(key, value.join(','));
          else if (typeof value === 'object' && value !== null && (value.min !== defaultVal.min || value.max !== defaultVal.max)) {
            params.set(key, `${value.min === '' ? '' : value.min}-${value.max === '' ? '' : value.max}`);
          }
        });
        url = `https://your-site.vercel.app/?${params.toString()}`;
      }
      
      const textArea = document.createElement("textarea");
      textArea.value = url;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  // Extract unique options for dropdowns/checkboxes based on CURRENT tab type
  const options = useMemo(() => {
    const currentData = data.filter(d => (d.Type || 'Backpack').toLowerCase() === activeTab.toLowerCase());
    
    const getUnique = (key) => {
      const vals = currentData.map(d => d[key]?.trim()).filter(Boolean);
      // Split by commas for things that might have multiple in a cell
      const splitVals = vals.flatMap(v => v.split(',').map(s => s.trim()));
      return [...new Set(splitVals)].sort();
    };

    const warrantyRanks = (w) => {
      const lower = (w || '').toLowerCase();
      if (lower === 'lifetime') return 1;
      if (lower.includes('limited lifetime')) return 2;
      const match = lower.match(/(\d+)\s*year/);
      if (match) return 10 + parseInt(match[1]);
      return 100;
    };

    const sortedWarranty = getUnique('Warranty').sort((a, b) => warrantyRanks(a) - warrantyRanks(b));

    return {
      laptopAccess: getUnique('Laptop Access'),
      qapLocation: getUnique('QAP Location'),
      openingStyle: getUnique('Bag Style Opening'),
      warranty: sortedWarranty,
      origin: getUnique('Origin of Company')
    };
  }, [data, activeTab]);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const parsed = parseCSV(event.target.result);
        if (parsed.length > 0) setData(parsed);
      };
      reader.readAsText(file);
    }
  };

  const checkYesNo = (val, filterVal) => {
    if (filterVal === 'All') return true;
    const cleanVal = (val || '').toString().toLowerCase().trim();
    const isYes = cleanVal === 'yes' || cleanVal === 'y' || cleanVal === 'true' || parseInt(cleanVal) > 0;
    if (filterVal === 'Yes') return isYes;
    if (filterVal === 'No') return !isYes;
    return true;
  };

  const getNum = (val) => {
    const num = parseFloat(val);
    return isNaN(num) ? 0 : num;
  };

  // Helper to allow clear input (empty string) values in filters gracefully
  const checkRange = (val, range) => {
    const min = range.min === '' ? 0 : range.min;
    const max = range.max === '' ? Infinity : range.max;
    return val >= min && val <= max;
  };

  // Apply Filters
  const filteredData = useMemo(() => {
    return data.filter(bag => {
      if ((bag.Type || 'Backpack').toLowerCase() !== activeTab.toLowerCase()) return false;

      if (searchQuery) {
        const searchLower = searchQuery.toLowerCase();
        const matchesGlobal = Object.values(bag).some(val => 
          val && val.toString().toLowerCase().includes(searchLower)
        );
        if (!matchesGlobal) return false;
      }

      if (filters.brandName && !(bag['BRAND & NAME'] || '').toLowerCase().includes(filters.brandName.toLowerCase())) return false;
      if (filters.material && !(bag['Material'] || '').toLowerCase().includes(filters.material.toLowerCase())) return false;

      const vol = getNum(bag['Volume (liters)']);
      if (!checkRange(vol, filters.volume)) return false;

      const price = getNum(bag['Price (USD)']);
      if (!checkRange(price, filters.price)) return false;

      const lapSize = getNum(bag['Max. Laptop Size (in)']);
      if (lapSize > 0 && !checkRange(lapSize, filters.laptopSize)) return false;

      const qapNum = getNum(bag['Quick Access Pocket (#)']);
      if (!checkRange(qapNum, filters.qap)) return false;

      const wbpNum = getNum(bag['Water Bottle Pockets (#)']);
      if (!checkRange(wbpNum, filters.wbp)) return false;

      const weight = getNum(bag['Weight (lbs)']);
      if (!checkRange(weight, filters.weight)) return false;

      const h = getNum(bag['Height (inches)']);
      if (!checkRange(h, filters.height)) return false;

      const w = getNum(bag['Width (inches)']);
      if (!checkRange(w, filters.width)) return false;

      const d = getNum(bag['Depth (inches)']);
      if (!checkRange(d, filters.depth)) return false;

      if (filters.laptopAccess.length > 0 && !filters.laptopAccess.some(a => (bag['Laptop Access']||'').includes(a))) return false;
      if (filters.qapLocation.length > 0 && !filters.qapLocation.some(a => (bag['QAP Location']||'').includes(a))) return false;
      if (filters.openingStyle.length > 0 && !filters.openingStyle.some(a => (bag['Bag Style Opening']||'').includes(a))) return false;
      if (filters.warranty.length > 0 && !filters.warranty.some(a => (bag['Warranty']||'').includes(a))) return false;
      if (filters.origin.length > 0 && !filters.origin.some(a => (bag['Origin of Company']||'').includes(a))) return false;
      if (filters.luggagePass.length > 0 && !filters.luggagePass.some(a => (bag['Luggage Pass Through / Trolley Sleeve']||'').toLowerCase().includes(a.toLowerCase()))) return false;

      if (!checkYesNo(bag['Org Slots/Pockets'], filters.orgSlots)) return false;
      if (!checkYesNo(bag['Compression Straps'], filters.compression)) return false;
      if (!checkYesNo(bag['Load Lifters'], filters.loadLifters)) return false;
      if (!checkYesNo(bag['Sternum Strap'], filters.sternum)) return false;
      if (!checkYesNo(bag['Expandable'], filters.expandable)) return false;
      if (!checkYesNo(bag['Packable'], filters.packable)) return false;

      return true;
    });
  }, [data, activeTab, searchQuery, filters]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    Object.keys(filters).forEach(key => {
      const val = filters[key];
      const def = defaultFilters[key];
      
      if (typeof val === 'string') {
        if (val !== def) count++;
      } else if (Array.isArray(val)) {
        if (val.length > 0) count++;
      } else if (typeof val === 'object' && val !== null) {
        if ((val.min !== '' && Number(val.min) !== def.min) || (val.max !== '' && Number(val.max) !== def.max)) {
          count++;
        }
      }
    });
    return count;
  }, [filters]);

  const resetFilters = () => {
    setFilters(defaultFilters);
  };

  // Render Functions for Different Views
  const renderDatabase = () => (
    <main className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-6 flex justify-between items-center text-slate-600 text-sm">
        <span>Showing <strong>{filteredData.length}</strong> {activeTab === 'Pouch' ? 'pouches' : activeTab.toLowerCase() + 's'}</span>
      </div>

      {filteredData.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl border border-dashed border-slate-300">
          <Package size={48} className="mx-auto text-slate-300 mb-4" />
          <h3 className="text-lg font-medium text-slate-900">No bags found</h3>
          <p className="text-slate-500 mt-1">Try adjusting your filters or search query.</p>
          <button onClick={resetFilters} className="mt-4 text-blue-600 hover:underline text-sm font-medium">Clear all filters</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredData.map((bag, idx) => {
            const features = [];
            const isSling = (bag.Type || '').toLowerCase() === 'sling';
            const isPouch = (bag.Type || '').toLowerCase() === 'pouch';
            const deviceTerm = isSling ? 'Device' : 'Laptop';

            if (isPouch) {
              const handles = getNum(bag['Handles']);
              if (handles > 0) features.push(`${handles} Handle${handles > 1 ? 's' : ''}`);
            } else {
              const orgSlots = getNum(bag['Org Slots/Pockets']);
              if (orgSlots > 0 || checkYesNo(bag['Org Slots/Pockets'], 'Yes')) {
                 features.push('Tech Org');
              }
              const luggage = (bag['Luggage Pass Through / Trolley Sleeve'] || '').trim();
              if (luggage && luggage.toLowerCase() !== 'no' && luggage.toLowerCase() !== '0' && luggage.toLowerCase() !== 'false') {
                 features.push(`${luggage} Luggage Pass Through`);
              }
              if (checkYesNo(bag['Sternum Strap'], 'Yes')) features.push('Sternum Strap');
              const handles = getNum(bag['Handles']);
              if (handles > 0) features.push(`${handles} Handle${handles > 1 ? 's' : ''}`);
              const lash = getNum(bag['Lash Points (outside)']);
              if (lash > 0) features.push(`${lash} Lash Point${lash > 1 ? 's' : ''}`);
              
              const compStr = (bag['Compression Straps'] || '').toLowerCase();
              if (compStr !== 'no' && compStr !== '0' && compStr !== '') {
                const numMatch = compStr.match(/\d+/);
                if (numMatch) {
                  features.push(`${numMatch[0]} Compression Strap${numMatch[0] !== '1' ? 's' : ''}`);
                } else {
                  features.push('Compression Straps');
                }
              }
            }

            const warrantyText = bag['Warranty'] || 'No';
            const isLifetime = warrantyText.toLowerCase().includes('lifetime');

            return (
              <div 
                key={idx} 
                onClick={() => setSelectedBag(bag)}
                className="bg-slate-100 rounded-xl border border-slate-200 overflow-hidden hover:shadow-lg transition-all cursor-pointer group flex flex-col"
              >
                <div className="aspect-[4/3] bg-white relative overflow-hidden border-b border-slate-200">
                  {bag.Picture && bag.Picture.trim() !== '' ? (
                    <img 
                      src={bag.Picture} 
                      alt={bag['BRAND & NAME']} 
                      className="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform duration-500"
                      onError={(e) => { e.target.onerror = null; e.target.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="%23cbd5e1" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>'; }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300">
                       <Package size={48} />
                    </div>
                  )}
                  <div className="absolute top-3 right-3 bg-black px-3 py-1.5 rounded-md text-sm text-white font-bold shadow-sm">
                    ${bag['Price (USD)'] || 'N/A'}
                  </div>
                </div>
                
                <div className="p-4 flex-1 flex flex-col text-sm">
                  <h3 className="font-bold text-sm text-slate-900 leading-tight mb-3 group-hover:text-blue-600 transition-colors text-left">
                    {bag['BRAND & NAME'] || 'Unknown Bag'}
                  </h3>
                  
                  <div className="space-y-1.5 text-xs text-slate-600 flex-1 border-t border-slate-200 pt-3">
                    <p className="flex justify-between items-center text-left gap-2">
                      <span className="text-slate-400 whitespace-nowrap">Volume:</span> 
                      <span className="text-slate-700 text-right">{bag['Volume (liters)']}L</span>
                    </p>

                    <p className="flex justify-between items-center text-left gap-2">
                      <span className="text-slate-400 whitespace-nowrap">Weight:</span> 
                      <span className="text-slate-700 text-right">{bag['Weight (lbs)']} lbs</span>
                    </p>
                    
                    {!isSling && !isPouch && (
                      <p className="flex justify-between items-start text-left gap-2">
                        <span className="text-slate-400 whitespace-nowrap">Opening:</span> 
                        <span className="text-slate-700 text-right">{bag['Bag Style Opening']}</span>
                      </p>
                    )}

                    <p className="flex justify-between items-start text-left gap-2">
                      <span className="text-slate-400 whitespace-nowrap">Dimensions:</span> 
                      <span className="text-slate-700 text-right">{bag['Height (inches)']}″H x {bag['Width (inches)']}″W x {bag['Depth (inches)']}″D</span>
                    </p>
                    
                    {!isPouch && (
                      <p className="flex justify-between items-start text-left gap-2">
                        <span className="text-slate-400 whitespace-nowrap">{deviceTerm}:</span> 
                        <span className="text-slate-700 text-right">Max {bag['Max. Laptop Size (in)']}″ {bag['Laptop Access'] ? `/ ${bag['Laptop Access']}` : ''}</span>
                      </p>
                    )}
                    
                    <p className="flex justify-between items-start text-left gap-2">
                      <span className="text-slate-400 whitespace-nowrap">{isPouch ? 'Organisation Pockets/Slots:' : 'QAP:'}</span> 
                      <span className="text-slate-700 text-right">{bag['Quick Access Pocket (#)']} {!isPouch && `(${bag['QAP Location'] || 'None'})`}</span>
                    </p>

                    {!isPouch && (
                      <p className="flex justify-between items-start text-left gap-2">
                        <span className="text-slate-400 whitespace-nowrap">WBP:</span> 
                        <span className="text-slate-700 text-right">{bag['Water Bottle Pockets (#)']}</span>
                      </p>
                    )}
                  </div>

                  <div className="pt-3 mt-3 border-t border-slate-200 text-slate-500 leading-relaxed text-left text-xs">
                    {features.length > 0 ? features.join(' • ') : 'No extra strap features listed'}
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between text-xs font-medium text-slate-500">
                     <span className="flex items-center gap-1">
                       <Shield size={14} className={isLifetime ? "text-green-500 fill-green-500" : ""} /> 
                       {warrantyText} Warranty
                     </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );

  const renderMaterialAging = () => (
    <main className="max-w-4xl mx-auto px-4 py-12">
      <h2 className="text-2xl font-bold mb-6 text-slate-900 text-left">MATERIAL AGING PROCESS <span className="text-slate-400 font-medium text-lg ml-2">(ULTRA, ZIPPERS etc.)</span></h2>
      <p className="text-slate-700 mb-10 text-sm leading-relaxed bg-white p-6 rounded-xl border border-slate-200 shadow-sm text-left">
        X-Pac and Ultra aging process will create crinkles/grid pattern, Ecopak bumps in the fabric over time, some times quicker, some times slower. These materials will also be affected by delamination, just like aquaguard / TPU-coated zippers.
      </p>

      <div className="space-y-12 text-left">
        <section className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-xl font-bold text-slate-800 mb-4 border-b border-slate-100 pb-3">Ultra / X-PAC Crinkles</h3>
          <p className="text-slate-600 mb-4 text-sm leading-relaxed">
            The images below are from <a href="https://www.reddit.com/r/ManyBaggers/s/Ntqqla931V" target="_blank" rel="noreferrer" className="text-blue-600 hover:text-blue-800 hover:underline font-medium">Reddit</a> and <a href="https://www.reddit.com/r/ManyBaggers/s/IhI3VbBXVv" target="_blank" rel="noreferrer" className="text-blue-600 hover:text-blue-800 hover:underline font-medium">here</a>, first one is the AER CPP2 Ultra after 2 months of use, the 2nd one is the Able Carry Daily Plus VX21.
          </p>
          <div className="grid sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <img src="aercppultra.jpeg" onError={(e) => { e.target.src = "aercppultra.jpg"; e.target.onerror = null; }} alt="AER CPP2 Ultra Crinkles" className="rounded-lg border border-slate-200 w-full object-contain bg-slate-50 max-h-[400px]" />
              <p className="text-xs text-left text-slate-500 font-medium mt-2">AER CPP2 Ultra</p>
            </div>
            <div className="space-y-2">
              <img src="acdailyplusvx21.jpeg" onError={(e) => { e.target.src = "acdailyplusvx21.jpg"; e.target.onerror = null; }} alt="Able Carry Daily Plus VX21 Crinkles" className="rounded-lg border border-slate-200 w-full object-contain bg-slate-50 max-h-[400px]" />
              <p className="text-xs text-left text-slate-500 font-medium mt-2">Able Carry Daily Plus VX21</p>
            </div>
          </div>
        </section>

        <section className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-xl font-bold text-slate-800 mb-4 border-b border-slate-100 pb-3">Delamination</h3>
          <p className="text-slate-600 mb-4 text-sm leading-relaxed">
            Ultra can also be affected by some extreme delamination, see video here: <a href="https://youtu.be/XsR2vojl7sk?feature=shared" target="_blank" rel="noreferrer" className="text-blue-600 hover:text-blue-800 hover:underline break-all">https://youtu.be/XsR2vojl7sk?feature=shared</a>
          </p>
          <img src="ultra.jpeg" onError={(e) => { e.target.src = "ultra.jpg"; e.target.onerror = null; }} alt="Ultra Delamination" className="rounded-lg border border-slate-200 w-full object-contain bg-slate-50 max-h-[500px]" />
        </section>

        <section className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-xl font-bold text-slate-800 mb-4 border-b border-slate-100 pb-3">Ecopak Bumps</h3>
          <p className="text-slate-600 mb-4 text-sm leading-relaxed">
            Ecopak developing bumps, from <a href="https://www.reddit.com/r/ManyBaggers/s/GffjRNTrwr" target="_blank" rel="noreferrer" className="text-blue-600 hover:text-blue-800 hover:underline font-medium">Reddit</a>:
          </p>
          <img src="ecopakbumps.jpeg" onError={(e) => { e.target.src = "ecopakbumps.jpg"; e.target.onerror = null; }} alt="Ecopak Bumps" className="rounded-lg border border-slate-200 w-full object-contain bg-slate-50 max-h-[500px]" />
        </section>

        <section className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-xl font-bold text-slate-800 mb-4 border-b border-slate-100 pb-3">Aquaguard Zipper Delamination</h3>
          <p className="text-slate-600 mb-4 text-sm leading-relaxed">
            While Aquaguard / TPU-coated zippers look sleek and nice out the box, they are also prone to delaminate. Picture below from <a href="https://www.reddit.com/r/ManyBaggers/comments/1ld14by/aquaguard_zippers_peeling_aer_tp3/" target="_blank" rel="noreferrer" className="text-blue-600 hover:text-blue-800 hover:underline font-medium">Reddit</a> of the aquaguard zippers on a AER TP3.
          </p>
          <img src="aquaguardzippers.jpeg" onError={(e) => { e.target.src = "aquaguardzippers.jpg"; e.target.onerror = null; }} alt="Aquaguard Zipper Delamination" className="rounded-lg border border-slate-200 w-full object-contain bg-slate-50 max-h-[500px]" />
        </section>
      </div>
    </main>
  );

  const renderCustomMakers = () => (
    <main className="max-w-4xl mx-auto px-4 py-12">
      <h2 className="text-3xl font-bold mb-8 text-slate-900 text-left">Custom Makers Directory</h2>
      
      <div className="space-y-10">
        <section>
          <h3 className="text-xl font-bold text-slate-800 mb-4 pb-2 border-b border-slate-200 flex items-end gap-3 text-left w-full">
            Full Custom Makers <span className="text-sm font-normal text-slate-500 mb-0.5">(some also sell their own standard backpacks)</span>
          </h3>
          <ul className="grid sm:grid-cols-2 gap-4">
            <li><a href="https://www.voyagerbagworks.com/custom" target="_blank" rel="noreferrer" className="flex items-center gap-3 p-4 bg-white rounded-xl border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all text-slate-700 hover:text-blue-700 font-medium"><span className="text-2xl leading-none">🇺🇸</span> Voyager Bag Works</a></li>
            <li><a href="https://www.innesbags.com/workshop/" target="_blank" rel="noreferrer" className="flex items-center gap-3 p-4 bg-white rounded-xl border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all text-slate-700 hover:text-blue-700 font-medium"><span className="text-2xl leading-none">🇸🇰</span> Innes Bags</a></li>
            <li><a href="https://www.arch-ind.com/contact" target="_blank" rel="noreferrer" className="flex items-center gap-3 p-4 bg-white rounded-xl border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all text-slate-700 hover:text-blue-700 font-medium"><span className="text-2xl leading-none">🇮🇹</span> Arch Indy</a></li>
            <li><a href="https://www.azo-equipment.co.uk/pages/customise" target="_blank" rel="noreferrer" className="flex items-center gap-3 p-4 bg-white rounded-xl border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all text-slate-700 hover:text-blue-700 font-medium"><span className="text-2xl leading-none">🇬🇧</span> Azo Equipment</a></li>
            <li><a href="https://www.instagram.com/stocy_project/" target="_blank" rel="noreferrer" className="flex items-center gap-3 p-4 bg-white rounded-xl border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all text-slate-700 hover:text-blue-700 font-medium"><span className="text-2xl leading-none">🇭🇺</span> Stocy Project</a></li>
            <li><a href="https://www.instagram.com/cplussewing/" target="_blank" rel="noreferrer" className="flex items-center gap-3 p-4 bg-white rounded-xl border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all text-slate-700 hover:text-blue-700 font-medium"><span className="text-2xl leading-none">🇭🇰</span> C+ Sewing</a></li>
            <li><a href="https://www.instagram.com/rucksack_village" target="_blank" rel="noreferrer" className="flex items-center gap-3 p-4 bg-white rounded-xl border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all text-slate-700 hover:text-blue-700 font-medium"><span className="text-2xl leading-none">🇯🇵</span> Rucksack Village</a></li>
          </ul>
        </section>

        <section>
          <h3 className="text-xl font-bold text-slate-800 mb-4 pb-2 border-b border-slate-200 flex items-end gap-3 text-left w-full">
            Semi-Custom Makers <span className="text-sm font-normal text-slate-500 mb-0.5">(Customisation of elements of their standard bags)</span>
          </h3>
          <ul className="grid sm:grid-cols-2 gap-4">
            <li><a href="https://www.trucedesigns.com/bags/" target="_blank" rel="noreferrer" className="flex items-center gap-3 p-4 bg-white rounded-xl border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all text-slate-700 hover:text-blue-700 font-medium"><span className="text-2xl leading-none">🇺🇸</span> Truce Designs</a></li>
            <li><a href="https://www.optimalthreadworks.com/" target="_blank" rel="noreferrer" className="flex items-center gap-3 p-4 bg-white rounded-xl border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all text-slate-700 hover:text-blue-700 font-medium"><span className="text-2xl leading-none">🇺🇸</span> Optimal Thread Works</a></li>
            <li><a href="https://rehose.eu" target="_blank" rel="noreferrer" className="flex items-center gap-3 p-4 bg-white rounded-xl border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all text-slate-700 hover:text-blue-700 font-medium"><span className="text-2xl leading-none">🇨🇿</span> Rehose</a></li>
            <li><a href="https://www.instagram.com/packolab.ua/?hl=en" target="_blank" rel="noreferrer" className="flex items-center gap-3 p-4 bg-white rounded-xl border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all text-slate-700 hover:text-blue-700 font-medium"><span className="text-2xl leading-none">🇺🇦</span> Packolab</a></li>
            <li><a href="https://www.greenroom136.com/online-store/W-ldcard-custom-bag-builder-c147268502" target="_blank" rel="noreferrer" className="flex items-center gap-3 p-4 bg-white rounded-xl border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all text-slate-700 hover:text-blue-700 font-medium"><span className="text-2xl leading-none">🇲🇾</span> Greenroom136</a></li>
          </ul>
        </section>

        <section>
          <h3 className="text-xl font-bold text-slate-800 mb-4 pb-2 border-b border-slate-200 text-left w-full">
            Mods to existing bags only
          </h3>
          <ul className="grid sm:grid-cols-2 gap-4">
            <li><a href="https://www.facebook.com/p/Skywalker-Designs-61552520897652/" target="_blank" rel="noreferrer" className="flex items-center gap-3 p-4 bg-white rounded-xl border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all text-slate-700 hover:text-blue-700 font-medium"><span className="text-2xl leading-none">🇺🇸</span> Skywalker Designs</a></li>
          </ul>
        </section>
      </div>
    </main>
  );

  return (
    <div>
      <div className="min-h-screen bg-slate-50 font-sans text-slate-900 transition-colors duration-200">
        
        {/* Top Menu Bar */}
        <nav className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm transition-colors duration-200">
          <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="flex items-center justify-between w-full md:w-auto">
              <h1 className="text-lg font-bold tracking-tight text-slate-900 flex items-center gap-2 cursor-pointer shrink-0" onClick={() => setCurrentView('database')}>
                <Package size={24} className="text-blue-600"/>
                BagDB
              </h1>
              <div className="md:hidden flex items-center gap-3">
                <button 
                  onClick={() => setIsInfoOpen(true)}
                  className="text-red-500 hover:text-red-600 transition-colors p-1.5 rounded-full hover:bg-red-50 bg-red-50/50"
                  title="Abbreviations Info"
                >
                  <Info size={20} />
                </button>
              </div>
            </div>

            <div className="flex gap-1 bg-slate-100 p-1 rounded-lg overflow-x-auto w-full md:w-auto no-scrollbar">
              <button 
                onClick={() => setCurrentView('database')}
                className={`shrink-0 px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${currentView === 'database' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
              >
                Database
              </button>
              <button 
                onClick={() => setCurrentView('material')}
                className={`shrink-0 px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${currentView === 'material' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
              >
                Material Aging
              </button>
              <button 
                onClick={() => setCurrentView('custom')}
                className={`shrink-0 px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${currentView === 'custom' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
              >
                Custom Makers
              </button>
            </div>

            <div className="hidden md:flex items-center gap-4">
              <button 
                onClick={() => setIsInfoOpen(true)}
                className="text-red-500 hover:text-red-600 transition-colors p-2 rounded-full hover:bg-red-50 bg-red-50/50"
                title="Abbreviations Info"
              >
                <Info size={20} />
              </button>
            </div>
          </div>

          {/* Search & Tabs Toolbar - Only visible on the Database view */}
          {currentView === 'database' && (
            <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col sm:flex-row gap-4 justify-between items-center border-t border-slate-100 animate-in slide-in-from-top-2">
              
              <div className="flex bg-slate-100 p-1 rounded-lg w-full sm:w-auto">
                <button 
                  onClick={() => setActiveTab('Backpack')}
                  className={`flex-1 sm:flex-none px-6 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'Backpack' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
                >
                  Backpacks
                </button>
                <button 
                  onClick={() => setActiveTab('Sling')}
                  className={`flex-1 sm:flex-none px-6 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'Sling' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
                >
                  Slings
                </button>
                <button 
                  onClick={() => setActiveTab('Pouch')}
                  className={`flex-1 sm:flex-none px-6 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'Pouch' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
                >
                  Pouches
                </button>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto flex-1 sm:max-w-md">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    type="text" 
                    placeholder="Search anything e.g. Waxed Canvas, Brand Name etc." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm bg-white text-slate-900 placeholder-slate-400"
                  />
                </div>
                <button 
                  onClick={handleCopyLink}
                  className="flex items-center gap-2 bg-slate-200 hover:bg-slate-300 text-slate-800 px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm whitespace-nowrap shrink-0"
                  title="Copy shareable link"
                >
                  {copied ? <Check size={18} className="text-green-600" /> : <LinkIcon size={18} />}
                  <span className="hidden sm:inline">{copied ? 'Copied' : 'Share'}</span>
                </button>
                <button 
                  onClick={() => setIsFilterOpen(true)}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm whitespace-nowrap shrink-0"
                >
                  <Filter size={18} />
                  <span className="hidden sm:inline">Filters ({activeFilterCount})</span>
                  <span className="sm:hidden">({activeFilterCount})</span>
                </button>
              </div>
            </div>
          )}
        </nav>

        {/* Main Content Router */}
        {currentView === 'database' && renderDatabase()}
        {currentView === 'material' && renderMaterialAging()}
        {currentView === 'custom' && renderCustomMakers()}

        {/* Filters Sidebar */}
        {isFilterOpen && (
          <div className="fixed inset-0 z-50 flex justify-end">
            <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm" onClick={() => setIsFilterOpen(false)} />
            <div className="relative w-full max-w-sm bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right border-l border-slate-200">
              <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50 text-slate-900">
                <h2 className="text-lg font-bold flex items-center gap-2 text-left w-full"><SlidersHorizontal size={20}/> Filters</h2>
                <button onClick={() => setIsFilterOpen(false)} className="p-2 text-slate-500 hover:bg-slate-200 rounded-full transition-colors shrink-0">
                  <X size={20} />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 space-y-6 text-slate-900">
                
                <div className="text-xs text-blue-600 bg-blue-50 p-2.5 rounded-md border border-blue-100 flex items-center gap-2 mb-4">
                  <Info size={14} className="shrink-0" />
                  Active filters will be highlighted in blue.
                </div>

                {/* Text Searches */}
              <div>
                <label className={`text-sm font-medium block mb-1 text-left w-full ${filters.brandName ? 'text-blue-700' : 'text-slate-700'}`}>Brand & Name</label>
                <input 
                  type="text" 
                  placeholder="e.g. AER, Evergoods, Goruck"
                  value={filters.brandName}
                  onChange={(e) => setFilters({...filters, brandName: e.target.value})}
                  className={`w-full px-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-blue-500 outline-none placeholder-slate-400 transition-colors ${
                    filters.brandName ? 'bg-blue-50 border-blue-300 text-blue-900' : 'bg-white border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              {activeTab === 'Backpack' && (
                <>
                  <div className="pt-4 border-t border-slate-100">
                    <RangeFilter label="Price in USD" min={0} max={1000} value={filters.price} onChange={(v) => setFilters({...filters, price: v})} unit="$" />
                    <RangeFilter label="Volume in litres" min={0} max={100} value={filters.volume} onChange={(v) => setFilters({...filters, volume: v})} unit="L" />
                    <RangeFilter label="Weight in lbs" min={0} max={15} value={filters.weight} onChange={(v) => setFilters({...filters, weight: v})} unit="lbs" />
                  </div>
                  
                  <div className="pt-4 border-t border-slate-100">
                    <RangeFilter label="Height in inches" min={0} max={30} value={filters.height} onChange={(v) => setFilters({...filters, height: v})} unit="in" />
                    <RangeFilter label="Width in inches" min={0} max={20} value={filters.width} onChange={(v) => setFilters({...filters, width: v})} unit="in" />
                    <RangeFilter label="Depth in inches" min={0} max={15} value={filters.depth} onChange={(v) => setFilters({...filters, depth: v})} unit="in" />
                  </div>
                  
                  <div className="pt-4 border-t border-slate-100">
                    <div>
                      <label className={`text-sm font-medium block mb-1 text-left w-full ${filters.material ? 'text-blue-700' : 'text-slate-700'}`}>Material</label>
                      <input 
                        type="text" 
                        placeholder="e.g. Cordura, Nylon"
                        value={filters.material}
                        onChange={(e) => setFilters({...filters, material: e.target.value})}
                        className={`w-full px-3 py-2 border rounded-md text-sm mb-4 focus:ring-2 focus:ring-blue-500 outline-none placeholder-slate-400 transition-colors ${
                          filters.material ? 'bg-blue-50 border-blue-300 text-blue-900' : 'bg-white border-slate-300 text-slate-900'
                        }`}
                      />
                    </div>
                  </div>
                  
                  <div className="pt-4 border-t border-slate-100">
                    <RangeFilter label="Max. Laptop Size" min={0} max={20} value={filters.laptopSize} onChange={(v) => setFilters({...filters, laptopSize: v})} unit="in" />
                    <MultiSelectDropdown label="Laptop Access" options={options.laptopAccess} selected={filters.laptopAccess} onChange={(v) => setFilters({...filters, laptopAccess: v})} />
                  </div>
                  
                  <div className="pt-4 border-t border-slate-100">
                    <MultiSelectDropdown label="Bag Style Opening" options={options.openingStyle} selected={filters.openingStyle} onChange={(v) => setFilters({...filters, openingStyle: v})} />
                    <RangeFilter label="Water Bottle Pockets" min={0} max={5} value={filters.wbp} onChange={(v) => setFilters({...filters, wbp: v})} unit="#" />
                    <RangeFilter label="Quick Access Pockets" min={0} max={10} value={filters.qap} onChange={(v) => setFilters({...filters, qap: v})} unit="#" />
                    <CheckboxGroup label="QAP Location" options={options.qapLocation} selected={filters.qapLocation} onChange={(v) => setFilters({...filters, qapLocation: v})} />
                    <RadioGroup label="Org Slots/Pockets" options={['All', 'Yes', 'No']} selected={filters.orgSlots} onChange={(v) => setFilters({...filters, orgSlots: v})} />
                  </div>
                  
                  <div className="pt-4 border-t border-slate-100">
                    <MultiSelectDropdown label="Luggage Pass Through" options={['Horizontal', 'Vertical', 'No']} selected={filters.luggagePass} onChange={(v) => setFilters({...filters, luggagePass: v})} />
                    <RadioGroup label="Compression Straps" options={['All', 'Yes', 'No']} selected={filters.compression} onChange={(v) => setFilters({...filters, compression: v})} />
                    <RadioGroup label="Load Lifters" options={['All', 'Yes', 'No']} selected={filters.loadLifters} onChange={(v) => setFilters({...filters, loadLifters: v})} />
                    <RadioGroup label="Sternum Strap" options={['All', 'Yes', 'No']} selected={filters.sternum} onChange={(v) => setFilters({...filters, sternum: v})} />
                    <RadioGroup label="Expandable" options={['All', 'Yes', 'No']} selected={filters.expandable} onChange={(v) => setFilters({...filters, expandable: v})} />
                    <RadioGroup label="Packable" options={['All', 'Yes', 'No']} selected={filters.packable} onChange={(v) => setFilters({...filters, packable: v})} />
                    <MultiSelectDropdown label="Warranty" options={options.warranty} selected={filters.warranty} onChange={(v) => setFilters({...filters, warranty: v})} />
                    <CheckboxGroup label="Origin of Company" options={options.origin} selected={filters.origin} onChange={(v) => setFilters({...filters, origin: v})} />
                  </div>
                </>
              )}

              {activeTab === 'Sling' && (
                <>
                  <div className="pt-4 border-t border-slate-100">
                    <RangeFilter label="Price in USD" min={0} max={1000} value={filters.price} onChange={(v) => setFilters({...filters, price: v})} unit="$" />
                    <RangeFilter label="Volume in litres" min={0} max={100} value={filters.volume} onChange={(v) => setFilters({...filters, volume: v})} unit="L" />
                    <RangeFilter label="Weight in lbs" min={0} max={15} value={filters.weight} onChange={(v) => setFilters({...filters, weight: v})} unit="lbs" />
                  </div>
                  
                  <div className="pt-4 border-t border-slate-100">
                    <RangeFilter label="Height in inches" min={0} max={30} value={filters.height} onChange={(v) => setFilters({...filters, height: v})} unit="in" />
                    <RangeFilter label="Width in inches" min={0} max={20} value={filters.width} onChange={(v) => setFilters({...filters, width: v})} unit="in" />
                    <RangeFilter label="Depth in inches" min={0} max={15} value={filters.depth} onChange={(v) => setFilters({...filters, depth: v})} unit="in" />
                  </div>
                  
                  <div className="pt-4 border-t border-slate-100">
                    <div>
                      <label className={`text-sm font-medium block mb-1 text-left w-full ${filters.material ? 'text-blue-700' : 'text-slate-700'}`}>Material</label>
                      <input 
                        type="text" 
                        placeholder="e.g. Cordura, Nylon"
                        value={filters.material}
                        onChange={(e) => setFilters({...filters, material: e.target.value})}
                        className={`w-full px-3 py-2 border rounded-md text-sm mb-4 focus:ring-2 focus:ring-blue-500 outline-none placeholder-slate-400 transition-colors ${
                          filters.material ? 'bg-blue-50 border-blue-300 text-blue-900' : 'bg-white border-slate-300 text-slate-900'
                        }`}
                      />
                    </div>
                  </div>
                  
                  <div className="pt-4 border-t border-slate-100">
                    <RangeFilter label="Max. Device Size" min={0} max={20} value={filters.laptopSize} onChange={(v) => setFilters({...filters, laptopSize: v})} unit="in" />
                    <MultiSelectDropdown label="Device Access" options={options.laptopAccess} selected={filters.laptopAccess} onChange={(v) => setFilters({...filters, laptopAccess: v})} />
                  </div>
                  
                  <div className="pt-4 border-t border-slate-100">
                    <RangeFilter label="Quick Access Pockets" min={0} max={10} value={filters.qap} onChange={(v) => setFilters({...filters, qap: v})} unit="#" />
                    <CheckboxGroup label="QAP Location" options={options.qapLocation} selected={filters.qapLocation} onChange={(v) => setFilters({...filters, qapLocation: v})} />
                    <RadioGroup label="Org Slots/Pockets" options={['All', 'Yes', 'No']} selected={filters.orgSlots} onChange={(v) => setFilters({...filters, orgSlots: v})} />
                    <RangeFilter label="Water Bottle Pockets" min={0} max={5} value={filters.wbp} onChange={(v) => setFilters({...filters, wbp: v})} unit="#" />
                  </div>
                  
                  <div className="pt-4 border-t border-slate-100">
                    <RadioGroup label="Compression Straps" options={['All', 'Yes', 'No']} selected={filters.compression} onChange={(v) => setFilters({...filters, compression: v})} />
                    <RadioGroup label="Expandable" options={['All', 'Yes', 'No']} selected={filters.expandable} onChange={(v) => setFilters({...filters, expandable: v})} />
                    <RadioGroup label="Packable" options={['All', 'Yes', 'No']} selected={filters.packable} onChange={(v) => setFilters({...filters, packable: v})} />
                    <MultiSelectDropdown label="Warranty" options={options.warranty} selected={filters.warranty} onChange={(v) => setFilters({...filters, warranty: v})} />
                    <CheckboxGroup label="Origin of Company" options={options.origin} selected={filters.origin} onChange={(v) => setFilters({...filters, origin: v})} />
                  </div>
                </>
              )}

              {activeTab === 'Pouch' && (
                <>
                  <div className="pt-4 border-t border-slate-100">
                    <RangeFilter label="Price in USD" min={0} max={1000} value={filters.price} onChange={(v) => setFilters({...filters, price: v})} unit="$" />
                    <RangeFilter label="Volume in litres" min={0} max={100} value={filters.volume} onChange={(v) => setFilters({...filters, volume: v})} unit="L" />
                    <RangeFilter label="Weight in lbs" min={0} max={15} value={filters.weight} onChange={(v) => setFilters({...filters, weight: v})} unit="lbs" />
                    <RangeFilter label="Organisation Pockets/Slots" min={0} max={10} value={filters.qap} onChange={(v) => setFilters({...filters, qap: v})} unit="#" />
                  </div>
                  
                  <div className="pt-4 border-t border-slate-100">
                    <RangeFilter label="Height in inches" min={0} max={30} value={filters.height} onChange={(v) => setFilters({...filters, height: v})} unit="in" />
                    <RangeFilter label="Width in inches" min={0} max={20} value={filters.width} onChange={(v) => setFilters({...filters, width: v})} unit="in" />
                    <RangeFilter label="Depth in inches" min={0} max={15} value={filters.depth} onChange={(v) => setFilters({...filters, depth: v})} unit="in" />
                    
                    <div className="mt-4">
                      <label className={`text-sm font-medium block mb-1 text-left w-full ${filters.material ? 'text-blue-700' : 'text-slate-700'}`}>Material</label>
                      <input 
                        type="text" 
                        placeholder="e.g. Cordura, Nylon"
                        value={filters.material}
                        onChange={(e) => setFilters({...filters, material: e.target.value})}
                        className={`w-full px-3 py-2 border rounded-md text-sm mb-4 focus:ring-2 focus:ring-blue-500 outline-none placeholder-slate-400 transition-colors ${
                          filters.material ? 'bg-blue-50 border-blue-300 text-blue-900' : 'bg-white border-slate-300 text-slate-900'
                        }`}
                      />
                    </div>
                    <MultiSelectDropdown label="Warranty" options={options.warranty} selected={filters.warranty} onChange={(v) => setFilters({...filters, warranty: v})} />
                    <CheckboxGroup label="Origin of Company" options={options.origin} selected={filters.origin} onChange={(v) => setFilters({...filters, origin: v})} />
                  </div>
                </>
              )}
              </div>
              
              <div className="p-4 border-t border-slate-200 bg-white grid grid-cols-2 gap-3">
                <button 
                  onClick={resetFilters}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
                >
                  Clear All
                </button>
                <button 
                  onClick={() => setIsFilterOpen(false)}
                  className="px-4 py-2 bg-blue-600 rounded-lg text-white text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  View Results
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Bag Details Modal */}
        {selectedBag && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setSelectedBag(null)} />
            <div className="relative w-full max-w-4xl max-h-[90vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col sm:flex-row animate-in zoom-in-95 duration-200">
              
              <div className="w-full sm:w-2/5 bg-white border-b sm:border-b-0 sm:border-r border-slate-200 relative h-64 sm:h-auto">
                 {selectedBag.Picture && selectedBag.Picture.trim() !== '' ? (
                   <img src={selectedBag.Picture} alt={selectedBag['BRAND & NAME']} className="w-full h-full object-contain p-2" />
                 ) : (
                   <div className="w-full h-full flex items-center justify-center text-slate-300">
                      <Package size={64} />
                   </div>
                 )}
                 <button onClick={() => setSelectedBag(null)} className="absolute top-4 left-4 sm:hidden bg-white/80 backdrop-blur p-2 rounded-full text-slate-700 hover:bg-white shadow-sm">
                   <X size={20} />
                 </button>
              </div>

              <div className="w-full sm:w-3/5 flex flex-col h-full overflow-y-auto bg-slate-100">
                <div className="flex justify-between items-start p-6 border-b border-slate-200">
                  <div className="w-full text-left">
                    <div className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-1 text-left w-full">{selectedBag['Type'] || 'Backpack'}</div>
                    <h2 className="text-2xl font-bold text-slate-900 leading-tight text-left">{selectedBag['BRAND & NAME']}</h2>
                  </div>
                  <button onClick={() => setSelectedBag(null)} className="hidden sm:block p-2 text-slate-400 hover:bg-slate-200 rounded-full transition-colors shrink-0">
                    <X size={24} />
                  </button>
                </div>

                <div className="p-6 space-y-6 flex-1">
                  <div className="flex flex-wrap gap-4">
                    <div className="bg-white px-4 py-3 rounded-xl border border-slate-200 flex-1 min-w-[120px]">
                      <div className="text-slate-500 text-xs font-medium mb-1 uppercase">Price</div>
                      <div className="text-xl font-bold text-slate-900">${selectedBag['Price (USD)']}</div>
                    </div>
                    <div className="bg-white px-4 py-3 rounded-xl border border-slate-200 flex-1 min-w-[120px]">
                      <div className="text-slate-500 text-xs font-medium mb-1 uppercase">Volume</div>
                      <div className="text-xl font-bold text-slate-900">{selectedBag['Volume (liters)']}L</div>
                    </div>
                    <div className="bg-white px-4 py-3 rounded-xl border border-slate-200 flex-1 min-w-[120px]">
                      <div className="text-slate-500 text-xs font-medium mb-1 uppercase">Weight</div>
                      <div className="text-xl font-bold text-slate-900">{selectedBag['Weight (lbs)']} lbs</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 text-sm text-left">
                    <div className="border-b border-slate-200 pb-2">
                      <span className="text-slate-500 block text-xs">Dimensions (H-W-D)</span>
                      <span className="font-medium text-slate-900">{selectedBag['Height (inches)']}″ x {selectedBag['Width (inches)']}″ x {selectedBag['Depth (inches)']}″</span>
                    </div>
                    
                    {((selectedBag.Type || '').toLowerCase() !== 'sling' && (selectedBag.Type || '').toLowerCase() !== 'pouch') && (
                      <div className="border-b border-slate-200 pb-2">
                        <span className="text-slate-500 block text-xs">Bag Style Opening</span>
                        <span className="font-medium text-slate-900">{selectedBag['Bag Style Opening']}</span>
                      </div>
                    )}

                    {((selectedBag.Type || '').toLowerCase() !== 'pouch') && (
                      <div className="border-b border-slate-200 pb-2">
                        <span className="text-slate-500 block text-xs">Max {(selectedBag.Type || '').toLowerCase() === 'sling' ? 'Device' : 'Laptop'} / Access</span>
                        <span className="font-medium text-slate-900">{selectedBag['Max. Laptop Size (in)']}″ {selectedBag['Laptop Access'] ? `/ ${selectedBag['Laptop Access']}` : ''}</span>
                      </div>
                    )}
                    
                    <div className="border-b border-slate-200 pb-2">
                      <span className="text-slate-500 block text-xs">{((selectedBag.Type || '').toLowerCase() === 'pouch') ? 'Organisation Pockets/Slots' : 'QAP Count'}</span>
                      <span className="font-medium text-slate-900">{selectedBag['Quick Access Pocket (#)']} {((selectedBag.Type || '').toLowerCase() !== 'pouch') && `(${selectedBag['QAP Location'] || 'None'})`}</span>
                    </div>

                    {((selectedBag.Type || '').toLowerCase() !== 'pouch') && (
                      <div className="border-b border-slate-200 pb-2">
                        <span className="text-slate-500 block text-xs">WBP Count</span>
                        <span className="font-medium text-slate-900">{selectedBag['Water Bottle Pockets (#)']}</span>
                      </div>
                    )}
                    
                    <div className="border-b border-slate-200 pb-2">
                      <span className="text-slate-500 block text-xs">Material</span>
                      <span className="font-medium text-slate-900">{selectedBag['Material'] || 'Not specified'}</span>
                    </div>
                    <div className="border-b border-slate-200 pb-2">
                      <span className="text-slate-500 block text-xs">Origin</span>
                      <span className="font-medium text-slate-900">{selectedBag['Origin of Company']}</span>
                    </div>
                  </div>

                  {selectedBag['Additional Notes'] && (
                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 text-sm text-left">
                      <span className="font-semibold text-blue-900 block mb-1">Notes</span>
                      <p className="text-slate-700 leading-relaxed">{selectedBag['Additional Notes']}</p>
                    </div>
                  )}
                </div>
                
                <div className="p-6 border-t border-slate-200 bg-white flex justify-end">
                  {selectedBag['LINKS'] && (
                     <a 
                       href={selectedBag['LINKS'].match(/^https?:\/\/[^/]+/)?.[0] || selectedBag['LINKS']} 
                       target="_blank" 
                       rel="noreferrer"
                       className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors"
                     >
                       View Retailer <ExternalLink size={16}/>
                     </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Info Modal */}
      {isInfoOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsInfoOpen(false)} />
            <div className="relative w-full max-w-md bg-white rounded-2xl shadow-xl p-6 animate-in zoom-in-95">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2 text-left w-full">
                  <Info size={20} className="text-blue-600"/> General Information
                </h3>
                <button onClick={() => setIsInfoOpen(false)} className="text-slate-400 hover:text-slate-600 shrink-0">
                  <X size={20}/>
                </button>
              </div>
              
              <p className="font-semibold text-slate-900 mb-2 text-left">
                Welcome to my random backpack, sling and pouch database! Hope it helps someone.
              </p>
              <br />
              
              <ul className="list-disc pl-5 space-y-2 text-sm text-slate-700 mb-6 text-left">
                <li>For consistency, currency is in USD, dimensions are in inches, weight in LBS.</li>
                <li>Mostly the lightest available colour was used for improved visibility of its features on this website.</li>
              </ul>

              <h4 className="text-md font-bold text-slate-900 mb-3 text-left border-t border-slate-100 pt-4">
                Database Abbreviations
              </h4>

              <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm text-slate-700 text-left pl-1">
              <strong className="text-slate-900 font-semibold">QAP</strong>
              <span>Quick Access Pocket</span>
              <strong className="text-slate-900 font-semibold">WBP</strong>
              <span>Water Bottle Pocket</span>
              <strong className="text-slate-900 font-semibold">Org</strong>
              <span>Organization (Slots or Pockets)</span>
              <strong className="text-slate-900 font-semibold">Lash points</strong>
              <span>External points to tie down gear</span>
            </div>

          </div>
        </div>
      )}

      {/* Uncomment the following line when deploying to Vercel */}
      <Analytics />
    </div>
  </div>
  );
}