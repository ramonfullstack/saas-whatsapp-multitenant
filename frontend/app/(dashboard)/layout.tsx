'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/stores/auth-store';
import { useSocket } from '@/hooks/use-socket';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MessageSquare, LayoutGrid, Settings, LogOut } from 'lucide-react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  useSocket();

  useEffect(() => {
    if (user === undefined) return;
    if (user === null) {
      router.push('/login');
    }
  }, [user, router]);

  if (user === null) {
    return null;
  }

  function handleLogout() {
    logout();
    router.push('/login');
  }

  return (
    <div className="flex h-screen bg-background">
      <aside className="w-64 border-r bg-card flex flex-col">
        <div className="p-4 border-b">
          <p className="font-semibold truncate">{user?.companyName ?? 'Empresa'}</p>
          <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
        </div>
        <nav className="flex-1 p-2 space-y-1">
          <Link href="/dashboard">
            <Button
              variant={pathname === '/dashboard' ? 'secondary' : 'ghost'}
              className="w-full justify-start"
            >
              <MessageSquare className="mr-2 h-4 w-4" />
              Conversas
            </Button>
          </Link>
          <Link href="/dashboard/kanban">
            <Button
              variant={pathname === '/dashboard/kanban' ? 'secondary' : 'ghost'}
              className="w-full justify-start"
            >
              <LayoutGrid className="mr-2 h-4 w-4" />
              Kanban
            </Button>
          </Link>
          <Link href="/dashboard/settings">
            <Button
              variant={pathname === '/dashboard/settings' ? 'secondary' : 'ghost'}
              className="w-full justify-start"
            >
              <Settings className="mr-2 h-4 w-4" />
              Configurações
            </Button>
          </Link>
        </nav>
        <div className="p-2 border-t">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="w-full justify-start gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user?.avatarUrl} />
                  <AvatarFallback>
                    {user?.name?.slice(0, 2).toUpperCase() ?? 'U'}
                  </AvatarFallback>
                </Avatar>
                <span className="truncate">{user?.name}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>
      <main className="flex-1 flex flex-col overflow-hidden">
        {children}
      </main>
    </div>
  );
}
