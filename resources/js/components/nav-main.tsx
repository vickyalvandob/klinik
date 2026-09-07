import { Link, usePage } from '@inertiajs/react';
import {
    SidebarGroup,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    useSidebar,
} from '@/components/ui/sidebar';
import { useCurrentUrl } from '@/hooks/use-current-url';
import type { NavItem } from '@/types';

export function NavMain({
    items,
    label = 'Operasional',
}: {
    items: NavItem[];
    label?: string;
}) {
    const { isCurrentOrParentUrl } = useCurrentUrl();
    const page = usePage();
    const { isMobile, setOpenMobile } = useSidebar();
    const activeTitle = page.component.startsWith('triages/')
        ? 'Pemeriksaan Awal'
        : page.component.startsWith('medical-records/')
          ? 'Rekam Medis'
          : null;
    const isActive = (item: NavItem) =>
        activeTitle
            ? item.title === activeTitle
            : isCurrentOrParentUrl(item.href);

    return (
        <SidebarGroup className="px-2 py-0">
            <SidebarGroupLabel className="px-3 text-[11px] font-medium tracking-wide">
                {label}
            </SidebarGroupLabel>
            <SidebarMenu>
                {items.map((item) => (
                    <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton
                            asChild
                            isActive={isActive(item)}
                            tooltip={{ children: item.title }}
                            className="data-[active=true]:bg-primary/8 data-[active=true]:text-primary text-sidebar-foreground/75 min-h-10 rounded-md px-3 text-[13px] data-[active=true]:font-medium [&>svg]:size-4 [&>svg]:stroke-[1.75]"
                        >
                            <Link
                                href={item.href}
                                prefetch
                                onClick={() => {
                                    if (isMobile) setOpenMobile(false);
                                }}
                                aria-current={
                                    isActive(item) ? 'page' : undefined
                                }
                            >
                                {item.icon && <item.icon />}
                                <span>{item.title}</span>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                ))}
            </SidebarMenu>
        </SidebarGroup>
    );
}
