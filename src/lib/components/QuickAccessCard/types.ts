export interface QuickAccessCardProps {
    /** Card title */
    title: string;
    /** Description text */
    description: string;
    /** Lucide icon name */
    icon: string;
    /** Semantic color */
    color?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info';
    /** Link href */
    href: string;
    /** Additional CSS classes */
    class?: string;
}
