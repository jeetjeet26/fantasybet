"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getNotifications, markNotificationRead } from "@/lib/actions/notifications";

export function NotificationsDropdown() {
  const [notifications, setNotifications] = useState<{ id: string; type: string; title: string; link: string | null; read_at: string | null; created_at: string }[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);

  function load() {
    void getNotifications().then(({ notifications: list, unreadCount: count }) => {
      setNotifications(list);
      setUnreadCount(count);
    });
  }

  // Load unread count on mount (deferred so setState runs in callback, not in effect)
  useEffect(() => {
    const id = setTimeout(load, 0);
    return () => clearTimeout(id);
  }, []);

  // Reload list when dropdown opens
  useEffect(() => {
    if (!open) return;
    const id = setTimeout(load, 0);
    return () => clearTimeout(id);
  }, [open]);

  async function handleMarkRead(id: string) {
    await markNotificationRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n))
    );
    setUnreadCount((c) => Math.max(0, c - 1));
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        render={<Button variant="ghost" size="icon" className="relative" />}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <div className="px-2 py-1.5 text-sm font-medium">Notifications</div>
        {notifications.length === 0 ? (
          <div className="px-2 py-4 text-center text-sm text-muted-foreground">
            No notifications yet
          </div>
        ) : (
          <div className="max-h-80 overflow-auto">
            {notifications.map((n) => (
              <div key={n.id} className="border-b last:border-0">
                {n.link ? (
                  <Link
                    href={n.link}
                    className="block px-2 py-2 text-sm hover:bg-accent"
                    onClick={() => {
                      setOpen(false);
                      if (!n.read_at) handleMarkRead(n.id);
                    }}
                  >
                    <span className={n.read_at ? "text-muted-foreground" : "font-medium"}>
                      {n.title}
                    </span>
                    <span className="ml-1 text-xs text-muted-foreground">
                      {formatTime(n.created_at)}
                    </span>
                  </Link>
                ) : (
                  <div className="px-2 py-2 text-sm">
                    <span className={n.read_at ? "text-muted-foreground" : "font-medium"}>
                      {n.title}
                    </span>
                    <span className="ml-1 text-xs text-muted-foreground">
                      {formatTime(n.created_at)}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function formatTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 60000) return "Just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return d.toLocaleDateString();
}
