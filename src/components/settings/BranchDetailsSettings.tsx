'use client';

import React, { useState } from 'react';
import { updateBranchSettingsAction } from '@/app/actions/branchActions';
import { MAX_BRANCH_CURRENCIES, sanitizeEnabledCurrencies, type CurrencyCode } from '@/lib/currency';
import CurrencyMultiSelect from './CurrencyMultiSelect';
import { btnPrimary, formInput } from '@/lib/ui';
import { useApp } from '@/context/AppContext';

export default function BranchDetailsSettings({ branch }: { branch: any }) {
  const { refetchData } = useApp();
  const [name, setName] = useState(branch.name);
  const [logoPreview, setLogoPreview] = useState<string | null>(branch.logo_url || null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  // Identity Details State
  const [address, setAddress] = useState(branch.address || '');
  const [city, setCity] = useState(branch.city || '');
  const [country, setCountry] = useState(branch.country || '');
  const [trn, setTrn] = useState(branch.trn || '');
  const [phone, setPhone] = useState(branch.phone || '');
  const [email, setEmail] = useState(branch.email || '');
  const [website, setWebsite] = useState(branch.website || '');
  const [enabledCurrencies, setEnabledCurrencies] = useState<CurrencyCode[]>(
    sanitizeEnabledCurrencies(branch.enabled_currencies ?? branch.enabledCurrencies),
  );

  const [isSaving, setIsSaving] = useState(false);

  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'finite-x-reality';
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'meal_payments';

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setSelectedFile(null);
      setLogoPreview(branch.logo_url || null);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    let finalLogoUrl = branch.logo_url;

    try {
      if (selectedFile) {
        // Upload to Cloudinary directly from the client using unsigned upload
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('upload_preset', uploadPreset);
        
        const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
          method: 'POST',
          body: formData,
        });

        if (!uploadRes.ok) {
          throw new Error('Failed to upload image to Cloudinary');
        }

        const data = await uploadRes.json();
        finalLogoUrl = data.secure_url;
      }

      // Call Server Action
      const res = await updateBranchSettingsAction(branch.id, name, finalLogoUrl, {
        address, city, country, trn, phone, email, website, enabledCurrencies,
      });
      
      if (res.success) {
        if (refetchData) await refetchData();
        alert('Branch details updated successfully!');
      } else {
        throw new Error(res.error);
      }
    } catch (err: any) {
      alert('Error updating branch: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6 mb-8">
      <h3 className="text-lg font-bold text-slate-900 mb-4">Branch Identity</h3>
      <form onSubmit={handleSave} className="space-y-6">
        
        <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center">
          {/* Logo Upload */}
          <div className="shrink-0 flex flex-col items-center gap-3">
            <div className="w-24 h-24 rounded-2xl bg-slate-50 border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden relative group">
              {logoPreview ? (
                <img src={logoPreview} alt="Branch Logo" className="w-full h-full object-contain" />
              ) : (
                <div className="text-slate-400 text-xs text-center p-2">No Logo</div>
              )}
              <label className="absolute inset-0 bg-slate-900/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white text-xs font-medium">
                Change
                <input 
                  type="file" 
                  accept="image/png, image/jpeg, image/webp" 
                  className="hidden" 
                  onChange={handleImageChange}
                />
              </label>
            </div>
            <div className="text-xs text-slate-500 font-medium text-center">Branch Logo<br/>(PNG/JPG)</div>
          </div>

          {/* Branch Name */}
          <div className="flex-1 w-full space-y-2">
            <label className="block text-sm font-bold text-slate-700">Branch Name</label>
            <input 
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className={`${formInput} w-full`}
            />
            <p className="text-xs text-slate-500">This name will appear on the sidebar and invoices.</p>
          </div>
        </div>

        <hr className="border-slate-100" />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Location</h4>
            
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Street Address</label>
              <input type="text" value={address} onChange={e => setAddress(e.target.value)} className={`${formInput} w-full`} placeholder="e.g., Gold & Diamond Park" />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">City</label>
                <input type="text" value={city} onChange={e => setCity(e.target.value)} className={`${formInput} w-full`} placeholder="e.g., Dubai" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Country</label>
                <input type="text" value={country} onChange={e => setCountry(e.target.value)} className={`${formInput} w-full`} placeholder="e.g., UAE" />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Contact & Compliance</h4>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Phone Number</label>
                <input type="text" value={phone} onChange={e => setPhone(e.target.value)} className={`${formInput} w-full`} placeholder="e.g., +971 4 123 4567" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} className={`${formInput} w-full`} placeholder="support@company.com" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Website</label>
                <input type="text" value={website} onChange={e => setWebsite(e.target.value)} className={`${formInput} w-full`} placeholder="www.company.com" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">TRN Number</label>
                <input type="text" value={trn} onChange={e => setTrn(e.target.value)} className={`${formInput} w-full`} placeholder="100000000000003" />
              </div>
            </div>
          </div>
        </div>

        <hr className="border-slate-100" />

        <div className="space-y-3">
          <div>
            <h4 className="text-sm font-bold uppercase tracking-wider text-slate-900">Display Currencies</h4>
            <p className="mt-1 text-xs text-slate-500">
              Choose up to {MAX_BRANCH_CURRENCIES} currencies for this branch. Amounts are stored in AED and converted using live rates.
            </p>
          </div>
          <CurrencyMultiSelect selected={enabledCurrencies} onChange={setEnabledCurrencies} />
        </div>

        <div className="flex justify-end pt-4 border-t border-slate-100">
          <button 
            type="submit" 
            disabled={isSaving}
            className={`${btnPrimary} ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>

      </form>
    </div>
  );
}
