import * as React from 'react';
import { SettingsPage } from '../components/SettingsPage';
import { useCRM } from '../contexts/CRMContext';

export const SettingsPageRoute: React.FC = () => {
    const { settings, products } = useCRM();

    if (!settings) return (
        <div className="h-full flex items-center justify-center bg-slate-950 text-slate-400">
            <p>Loading settings...</p>
        </div>
    );

    return (
        <div className="h-[calc(100vh-64px)] overflow-hidden flex flex-col">
            <SettingsPage
                settings={settings}
                products={products}
            />
        </div>
    );
};
