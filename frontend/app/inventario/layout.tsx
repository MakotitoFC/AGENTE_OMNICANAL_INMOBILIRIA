import PrivateLayout from '@/components/PrivateLayout';

export default function InventarioLayout({ children }: { children: React.ReactNode }) {
    return <PrivateLayout>{children}</PrivateLayout>;
}
