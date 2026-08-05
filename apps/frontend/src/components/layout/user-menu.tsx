import { useRef } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { ChevronDown, LogOut, Settings } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { endSession } from '@/features/auth/session';
import { notify } from '@/lib/toast';
import { authService } from '@/services/auth-service';
import { selectUser, useAuthStore } from '@/stores/auth-store';

export function UserMenu() {
  const navigate = useNavigate();
  const user = useAuthStore(selectUser);
  // Radix returns focus to the trigger on close, which keyboard users need but leaves a focus ring
  // sitting on the trigger after a click outside. Track how the menu was dismissed.
  const dismissedByPointer = useRef(false);

  if (!user) {
    return null;
  }

  const handleLogout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      // The server call only revokes the session server-side. If it fails there is nothing the
      // user can do about it here, and leaving them apparently signed in would be worse.
      console.warn('Logout request failed; clearing the local session anyway', error);
    } finally {
      endSession();
      notify.success('Signed out.');
      await navigate({ to: '/' });
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="inline-flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors outline-none hover:bg-accent hover:text-accent-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50">
        <Avatar user={user} />
        <span className="max-w-40 truncate">{user.email}</span>
        <ChevronDown className="size-4" />
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        onCloseAutoFocus={(event) => {
          if (dismissedByPointer.current) {
            event.preventDefault();
            dismissedByPointer.current = false;
          }
        }}
        onPointerDownOutside={() => {
          dismissedByPointer.current = true;
        }}
      >
        <DropdownMenuLabel className="flex items-center gap-2 font-normal">
          <Avatar user={user} />
          <span className="truncate text-sm font-medium text-foreground">{user.email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => navigate({ to: '/dashboard/settings' })}>
          <Settings />
          Settings
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={handleLogout}>
          <LogOut />
          Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function Avatar({ user }: { user: { email: string; avatar?: string | null } }) {
  if (user.avatar) {
    return <img alt={user.email} className="size-7 rounded-full object-cover" src={user.avatar} />;
  }

  return (
    <span className="flex size-7 items-center justify-center rounded-full bg-muted text-xs font-extrabold text-muted-foreground">
      {user.email.charAt(0).toUpperCase()}
    </span>
  );
}
