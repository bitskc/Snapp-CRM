import React from 'react';
import { SettingsPage } from '../components/SettingsPage';
import { AppSettings, Product } from '../types';

interface SettingsProps {
    settings: AppSettings | null;
    products: Product[];
    onSettingsUpdate: React.Dispatch<React.SetStateAction<AppSettings | null>>;
    onProductsUpdate: React.Dispatch<React.SetStateAction<Product[]>>;
}

export const SettingsPageRoute: React.FC<SettingsProps> = ({
    settings,
    products,
    onSettingsUpdate,
    onProductsUpdate
}) => {
    if (!settings) return null;

    return (
        <div className="h-[calc(100vh-64px)] overflow-hidden flex flex-col">
            <SettingsPage
                settings={settings}
                products={products}
                onSettingsUpdate={onSettingsUpdate}
                onProductsUpdate={onProductsUpdate}
            />
        </div>
    );
};
