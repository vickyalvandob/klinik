import { Link, router } from '@inertiajs/react';
import { LogOut } from 'lucide-react';
import {
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { UserInfo } from '@/components/user-info';
import { accountNavigation } from '@/lib/app-navigation';
import { logout } from '@/routes';
import type { User } from '@/types';

type Props = {
    user: User;
    onNavigate?: () => void;
};

export function UserMenuContent({ user, onNavigate }: Props) {
    return (
        <>
            <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                    <UserInfo user={user} showEmail />
                </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
                {accountNavigation.map((item) => (
                    <DropdownMenuItem key={item.title} asChild>
                        <Link
                            className="flex min-h-10 w-full cursor-pointer items-center gap-2"
                            href={item.href}
                            onSuccess={onNavigate}
                        >
                            {item.icon && <item.icon />}
                            {item.title}
                        </Link>
                    </DropdownMenuItem>
                ))}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
                <Link
                    className="flex min-h-10 w-full cursor-pointer items-center gap-2"
                    href={logout()}
                    as="button"
                    onBefore={() => router.flushAll()}
                    onSuccess={onNavigate}
                    data-test="logout-button"
                >
                    <LogOut />
                    Keluar
                </Link>
            </DropdownMenuItem>
        </>
    );
}
