'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { pageTitle, pageSubtitle, btnPrimary, kpiGrid, tableWrap, dataTable, formInput } from '@/lib/ui';
import { getProductsBySlug, deleteProduct, getCategoriesBySlug, getSubcategoriesBySlug } from '@/app/actions/productActions';
import KPICard from '@/components/ui/KPICard';

import ProductModal from './ProductModal';
import CategoryModal from './CategoryModal';
import { useWriteAccess } from '@/context/RbacWriteContext';

type SortField = 'sku' | 'name' | 'category_name' | 'metal_type' | 'purity' | 'weight' | 'status';
type SortDirection = 'asc' | 'desc';

export default function ProductsPage() {
  const params = useParams();
  const slug = params.slug as string;
  const router = useRouter();
  const { canWrite, writeBlockedReason, buttonProps: wp } = useWriteAccess();

  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [subcategories, setSubcategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);

  // Filters & Sorting
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const fetchData = async () => {
    setLoading(true);
    const [prodRes, catRes, subRes] = await Promise.all([
      getProductsBySlug(slug),
      getCategoriesBySlug(slug),
      getSubcategoriesBySlug(slug)
    ]);
    
    if (prodRes.success && prodRes.products) setProducts(prodRes.products);
    if (catRes.success && catRes.categories) setCategories(catRes.categories);
    if (subRes.success && subRes.subcategories) setSubcategories(subRes.subcategories);
    
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [slug]);

  const handleEditProduct = (product: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!canWrite) return;
    setEditingProduct(product);
    setIsProductModalOpen(true);
  };

  const handleDeleteProduct = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!canWrite) return;
    if (confirm('Are you sure you want to delete this product?')) {
      const res = await deleteProduct(id);
      if (res.success) {
        fetchData();
      } else {
        alert('Failed to delete product: ' + res.error);
      }
    }
  };

  const handleProductModalClose = () => {
    setIsProductModalOpen(false);
    setEditingProduct(null);
  };

  const handleProductSave = () => {
    fetchData();
    handleProductModalClose();
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // KPIs
  const totalProducts = products.length;
  const activeProducts = products.filter(p => p.status.toLowerCase() === 'active').length;
  const totalCategories = categories.length;
  const totalSubcategories = subcategories.length;

  // Process data for display
  const filteredAndSortedProducts = useMemo(() => {
    let result = [...products];

    // Global Search (all params)
    if (searchTerm.trim()) {
      const lowerQuery = searchTerm.toLowerCase();
      result = result.filter(p => 
        (p.name && p.name.toLowerCase().includes(lowerQuery)) ||
        (p.sku && p.sku.toLowerCase().includes(lowerQuery)) ||
        (p.category_name && p.category_name.toLowerCase().includes(lowerQuery)) ||
        (p.subcategory_name && p.subcategory_name.toLowerCase().includes(lowerQuery)) ||
        (p.metal_type && p.metal_type.toLowerCase().includes(lowerQuery)) ||
        (p.unit && p.unit.toLowerCase().includes(lowerQuery)) ||
        (p.status && p.status.toLowerCase().includes(lowerQuery)) ||
        (p.brand && p.brand.toLowerCase().includes(lowerQuery))
      );
    }

    // Filters
    if (filterCategory) {
      result = result.filter(p => p.category_id === filterCategory);
    }
    if (filterStatus) {
      result = result.filter(p => p.status.toLowerCase() === filterStatus.toLowerCase());
    }

    // Sort
    result.sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];

      // Convert numbers to actual numbers for proper sorting
      if (sortField === 'weight' || sortField === 'purity') {
        valA = Number(valA);
        valB = Number(valB);
      } else if (typeof valA === 'string' && typeof valB === 'string') {
        valA = valA.toLowerCase();
        valB = valB.toLowerCase();
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [products, searchTerm, filterCategory, filterStatus, sortField, sortDirection]);

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-300 opacity-0 transition-opacity group-hover:opacity-100">
          <path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      );
    }
    return sortDirection === 'asc' ? (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-accent">
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
      </svg>
    ) : (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-accent">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
      </svg>
    );
  };

  const getThClass = (align: 'left' | 'center' | 'right') => 
    `group cursor-pointer select-none px-3 pb-3 text-${align} text-[11px] font-bold uppercase tracking-wider text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-700 sm:px-5`;

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'inactive':
        return 'bg-slate-100 text-slate-500 border-slate-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <>
      <div className="animate-[fade-in-up_0.55s_cubic-bezier(0.16,1,0.3,1)_both]">
        <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between border-b border-slate-200/80 pb-5">
          <div>
            <h2 className={pageTitle}>Products & Catalogue</h2>
            <p className={pageSubtitle}>Manage your products, categories, and master inventory lists</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => canWrite && setIsCategoryModalOpen(true)}
              {...wp()}
              className={`flex size-10 items-center justify-center rounded-xl bg-slate-100 text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-900 sm:w-auto sm:h-auto sm:px-4 sm:py-2 sm:rounded-lg gap-2 font-semibold text-sm${!canWrite ? ' cursor-not-allowed opacity-50' : ''}`}
              title={!canWrite ? writeBlockedReason : 'Manage Categories'}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="sm:w-[18px] sm:h-[18px] sm:stroke-2">
                <path d="M4 6h16M4 12h16M4 18h7" />
              </svg>
              <span className="hidden sm:inline">Manage Categories</span>
            </button>
            <button
              onClick={() => canWrite && setIsProductModalOpen(true)}
              {...wp()}
              className={`flex size-10 items-center justify-center rounded-xl bg-accent/10 text-accent transition-colors hover:bg-accent hover:text-white sm:w-auto sm:h-auto sm:px-4 sm:py-2 sm:rounded-lg sm:bg-accent sm:text-white sm:hover:bg-accent/90 gap-2 font-semibold text-sm${!canWrite ? ' cursor-not-allowed opacity-50' : ''}`}
              title={!canWrite ? writeBlockedReason : 'New Product'}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="sm:w-[18px] sm:h-[18px] sm:stroke-2">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              <span className="hidden sm:inline">New Product</span>
            </button>
          </div>
        </div>

        {/* KPI Grid */}
        <div className={`${kpiGrid} mb-8`}>
          <KPICard
            label="Total Products"
            value={totalProducts}
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            }
            color="var(--accent)"
            bgColor="var(--accent-light)"
          />
          <KPICard
            label="Active Products"
            value={activeProducts}
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            }
            color="var(--profit)"
            bgColor="var(--profit-light)"
          />
          <KPICard
            label="Total Categories"
            value={totalCategories}
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M4 6h16M4 12h16M4 18h7" />
              </svg>
            }
            color="var(--purple)"
            bgColor="var(--purple-light)"
          />
          <KPICard
            label="Total Subcategories"
            value={totalSubcategories}
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <line x1="8" y1="6" x2="21" y2="6"></line>
                <line x1="8" y1="12" x2="21" y2="12"></line>
                <line x1="8" y1="18" x2="21" y2="18"></line>
                <line x1="3" y1="6" x2="3.01" y2="6"></line>
                <line x1="3" y1="12" x2="3.01" y2="12"></line>
                <line x1="3" y1="18" x2="3.01" y2="18"></line>
              </svg>
            }
            color="#f59e0b"
            bgColor="#fef3c7"
          />
        </div>

        {/* Data Container */}
        <div className="animate-[fade-in-up_0.55s_cubic-bezier(0.16,1,0.3,1)_both] md:overflow-hidden md:rounded-3xl md:border md:border-slate-100 md:bg-white md:shadow-surface md:transition-[box-shadow] md:duration-300 md:ease-[cubic-bezier(0.22,1,0.36,1)] md:motion-safe:hover:shadow-surface-hover">
          {/* Toolbar */}
          <div className="flex flex-col gap-4 pb-4 px-4 md:border-b md:border-slate-100 md:px-6 md:py-5 lg:flex-row lg:items-center lg:justify-between">
            <h3 className="text-lg font-bold text-slate-900 whitespace-nowrap hidden lg:block">Catalogue</h3>
            
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center flex-1 lg:justify-end">
              <div className="relative w-full sm:max-w-xs">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <circle cx="11" cy="11" r="8" />
                  <path d="M21 21l-4.3-4.3" />
                </svg>
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className={`${formInput} !py-2 !pl-10 !pr-4 !text-sm w-full`}
                />
              </div>

              <select 
                value={filterCategory} 
                onChange={e => setFilterCategory(e.target.value)}
                className={`${formInput} !py-2 !text-sm w-full sm:w-auto appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2394a3b8%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-[length:16px] bg-[right_12px_center] bg-no-repeat pr-10`}
              >
                <option value="">All Categories</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>

              <select 
                value={filterStatus} 
                onChange={e => setFilterStatus(e.target.value)}
                className={`${formInput} !py-2 !text-sm w-full sm:w-auto appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2394a3b8%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-[length:16px] bg-[right_12px_center] bg-no-repeat pr-10`}
              >
                <option value="">All Statuses</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>

              {/* Mobile Sort */}
              <div className="flex md:hidden items-center gap-2 w-full">
                <select
                  value={sortField}
                  onChange={(e) => handleSort(e.target.value as SortField)}
                  className={`${formInput} !py-2 !text-sm flex-1 appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2394a3b8%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-[length:16px] bg-[right_12px_center] bg-no-repeat pr-10`}
                >
                  <option value="name">Sort by: Name</option>
                  <option value="sku">Sort by: SKU</option>
                  <option value="category_name">Sort by: Category</option>
                  <option value="weight">Sort by: Weight</option>
                  <option value="purity">Sort by: Purity</option>
                  <option value="status">Sort by: Status</option>
                </select>
                <button
                  type="button"
                  onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
                  className="flex size-10 flex-shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100 transition-colors"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform duration-300 ${sortDirection === 'desc' ? 'rotate-180' : ''}`}>
                    <path d="M12 5v14M5 12l7-7 7 7" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex h-48 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-[var(--primary)]"></div>
            </div>
          ) : (
            <div className="p-0">
              <div className={tableWrap}>
                <table className={`${dataTable} min-w-[900px] hidden md:table`}>
                  <thead>
                    <tr>
                      <th className={getThClass('left')} onClick={() => handleSort('sku')}>
                        <div className="flex items-center gap-2">SKU <SortIcon field="sku" /></div>
                      </th>
                      <th className={getThClass('left')} onClick={() => handleSort('name')}>
                        <div className="flex items-center gap-2">Product Name <SortIcon field="name" /></div>
                      </th>
                      <th className={getThClass('left')} onClick={() => handleSort('category_name')}>
                        <div className="flex items-center gap-2">Category <SortIcon field="category_name" /></div>
                      </th>
                      <th className={getThClass('center')} onClick={() => handleSort('metal_type')}>
                        <div className="flex items-center justify-center gap-2">Metal <SortIcon field="metal_type" /></div>
                      </th>
                      <th className={getThClass('center')} onClick={() => handleSort('purity')}>
                        <div className="flex items-center justify-center gap-2">Purity <SortIcon field="purity" /></div>
                      </th>
                      <th className={getThClass('right')} onClick={() => handleSort('weight')}>
                        <div className="flex items-center justify-end gap-2">Weight <SortIcon field="weight" /></div>
                      </th>
                      <th className={getThClass('center')} onClick={() => handleSort('status')}>
                        <div className="flex items-center justify-center gap-2">Status <SortIcon field="status" /></div>
                      </th>
                      <th className="px-3 pb-3 text-right text-[11px] font-bold uppercase tracking-wider text-slate-400 sm:px-5">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAndSortedProducts.map((product) => (
                      <tr
                        key={product.id}
                        data-interactive-row
                        onClick={() => handleEditProduct(product)}
                        className="cursor-pointer"
                      >
                        <td className="whitespace-nowrap border-y border-l border-black/5 bg-white px-3 py-3.5 text-xs font-semibold text-slate-500 first:rounded-l-2xl sm:px-5 sm:py-4">
                          {product.sku}
                        </td>
                        <td className="border-y border-black/5 bg-white px-3 py-3.5 font-bold text-sm text-slate-900 sm:px-5 sm:py-4">
                          {product.name}
                        </td>
                        <td className="border-y border-black/5 bg-white px-3 py-3.5 text-sm text-slate-600 sm:px-5 sm:py-4">
                          <div className="flex flex-col">
                            <span>{product.category_name || '-'}</span>
                            <span className="text-xs text-slate-400">{product.subcategory_name || ''}</span>
                          </div>
                        </td>
                        <td className="border-y border-black/5 bg-white px-3 py-3.5 text-center sm:px-5 sm:py-4">
                          <span className={`inline-flex rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${product.metal_type?.toLowerCase() === 'gold' ? 'bg-amber-100 text-amber-700' : product.metal_type?.toLowerCase() === 'silver' ? 'bg-slate-100 text-slate-700' : 'bg-indigo-100 text-indigo-700'}`}>
                            {product.metal_type}
                          </span>
                        </td>
                        <td className="border-y border-black/5 bg-white px-3 py-3.5 text-center font-mono text-sm font-bold sm:px-5 sm:py-4">
                          {parseFloat(product.purity).toFixed(2)}
                        </td>
                        <td className="border-y border-black/5 bg-white px-3 py-3.5 text-right font-mono text-sm font-bold sm:px-5 sm:py-4">
                          {parseFloat(product.weight) === 0 ? '-' : `${parseFloat(product.weight).toFixed(3)} ${product.unit}`}
                        </td>
                        <td className="border-y border-black/5 bg-white px-3 py-3.5 text-center sm:px-5 sm:py-4">
                          <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${getStatusColor(product.status)}`}>
                            {product.status}
                          </span>
                        </td>
                        <td className="border-y border-r border-black/5 bg-white px-3 py-3.5 text-right last:rounded-r-2xl sm:px-5 sm:py-4">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={(e) => handleEditProduct(product, e)}
                              disabled={!canWrite}
                              className={`inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-[var(--primary)] transition-colors${!canWrite ? ' cursor-not-allowed opacity-50' : ''}`}
                              title={!canWrite ? writeBlockedReason : 'Edit'}
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                              </svg>
                            </button>
                            <button
                              onClick={(e) => handleDeleteProduct(product.id, e)}
                              disabled={!canWrite}
                              className={`inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors${!canWrite ? ' cursor-not-allowed opacity-50' : ''}`}
                              title={!canWrite ? writeBlockedReason : 'Delete'}
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredAndSortedProducts.length === 0 && (
                      <tr>
                        <td colSpan={8} className="border-y border-black/5 bg-white px-5 py-8 text-center text-sm text-slate-500">
                          No products found matching your filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>

                {/* Mobile Cards View */}
                <div className="flex md:hidden flex-col gap-4 py-4 px-4">
                  {filteredAndSortedProducts.map((product) => (
                    <div 
                      key={product.id}
                      onClick={() => handleEditProduct(product)}
                      className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-[0_2px_8px_-4px_rgba(0,0,0,0.05)] transition-all hover:shadow-md cursor-pointer active:scale-[0.98]"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex flex-col flex-1">
                          <span className="text-sm font-bold text-slate-900 leading-tight">{product.name}</span>
                          <span className="text-xs text-slate-400 font-mono mt-0.5">{product.sku}</span>
                        </div>
                        <span className={`inline-flex shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${getStatusColor(product.status)}`}>
                          {product.status}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-y-3 gap-x-4 border-y border-slate-50 py-3">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Category</span>
                          <span className="text-sm font-medium text-slate-700 truncate">{product.category_name || '-'}</span>
                        </div>

                        <div className="flex flex-col gap-0.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Metal & Purity</span>
                          <span className="text-sm font-bold text-slate-900">{product.metal_type} • {parseFloat(product.purity).toFixed(2)}</span>
                        </div>
                        
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Weight</span>
                          <span className="font-mono text-sm font-bold text-slate-900">{parseFloat(product.weight) === 0 ? '-' : `${parseFloat(product.weight).toFixed(3)} ${product.unit}`}</span>
                        </div>

                        <div className="flex flex-col gap-0.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Inventory</span>
                          <span className="text-sm font-medium text-slate-700 capitalize">{product.inventory_type}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs pt-1">
                        <div className="flex items-center gap-1.5">
                          {product.hedging_enabled && (
                            <span className="flex items-center justify-center rounded bg-[var(--primary-light)] px-1.5 py-0.5 text-[9px] font-bold uppercase text-[var(--primary-dark)]" title="Hedging Enabled">
                              Hedge
                            </span>
                          )}
                          {product.redeemable && (
                            <span className="flex items-center justify-center rounded bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold uppercase text-emerald-700" title="Redeemable">
                              Redeem
                            </span>
                          )}
                        </div>
                        <span className="text-accent font-bold">Edit Details &rarr;</span>
                      </div>
                    </div>
                  ))}
                  {filteredAndSortedProducts.length === 0 && (
                    <div className="p-8 text-center text-sm text-slate-500 border border-dashed border-slate-200 rounded-2xl">
                      No products found matching your filters.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {isProductModalOpen && (
        <ProductModal
          slug={slug}
          open={isProductModalOpen}
          product={editingProduct}
          categories={categories}
          subcategories={subcategories}
          onClose={handleProductModalClose}
          onSave={handleProductSave}
        />
      )}

      {isCategoryModalOpen && (
        <CategoryModal
          slug={slug}
          open={isCategoryModalOpen}
          categories={categories}
          subcategories={subcategories}
          onClose={() => setIsCategoryModalOpen(false)}
          onRefresh={fetchData}
        />
      )}
    </>
  );
}
