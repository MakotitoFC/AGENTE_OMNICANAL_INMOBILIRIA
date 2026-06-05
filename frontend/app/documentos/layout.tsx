import PrivateLayout from '@/components/PrivateLayout';

export default function DocumentosLayout({ children }: { children: React.ReactNode }) {
    return <PrivateLayout>{children}</PrivateLayout>;
}
