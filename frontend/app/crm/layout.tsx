import PrivateLayout from '@/components/PrivateLayout';

export default function CRMLayout({ children }: { children: React.ReactNode }) {
    return <PrivateLayout>{children}</PrivateLayout>;
}
