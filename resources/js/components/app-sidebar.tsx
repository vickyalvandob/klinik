import { Link, usePage } from '@inertiajs/react';
import AppLogo from '@/components/app-logo';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import { dashboard } from '@/routes';
import { appNavigation } from '@/lib/app-navigation';
import { index as platformIndex } from '@/routes/platform';
import { edit as profileEdit } from '@/routes/profile';

export function AppSidebar() {
    const { auth, currentClinic, currentMembership } = usePage().props;
    const groups = appNavigation(
        currentClinic,
        currentMembership?.permissions ?? [],
        auth.user?.is_platform_admin,
    );
    const home = currentClinic
        ? dashboard()
        : auth.user?.is_platform_admin
          ? platformIndex()
          : profileEdit();

    return (
        <Sidebar collapsible="icon" variant="sidebar">
            <SidebarHeader className="border-sidebar-border border-b px-3 py-3">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href={home}>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent className="gap-4 px-1 py-3">
                <nav aria-label="Menu utama" className="flex flex-col gap-4">
                    {groups.map((group) => (
                        <NavMain
                            key={group.label}
                            items={group.items}
                            label={group.label}
                        />
                    ))}
                </nav>
            </SidebarContent>

            <SidebarFooter className="border-sidebar-border border-t p-3">
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
