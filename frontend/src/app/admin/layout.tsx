'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/dashboard/sidebar';
import { Topbar } from '@/components/dashboard/topbar';
import { getMe, getStoredUser } from '@/lib/auth';

export default function AdminLayout({
                                        children,
                                    }: Readonly<{
    children: React.ReactNode;
}>) {
    const router = useRouter();
    const [ready, setReady] = useState(false);

    useEffect(() => {
        async function checkAccess() {
            try {
                const localUser = getStoredUser();

                if (!localUser) {
                    router.push('/login');
                    return;
                }

                const user = await getMe();

                if (user.role !== 'ADMIN') {
                    router.push('/login');
                    return;
                }


                setReady(true);
            } catch {
                router.push('/login');
            }
        }

        void checkAccess();
    }, [router]);

    if (!ready) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-50">
                <div className="rounded-2xl bg-white px-6 py-4 shadow-sm">
                    Loading workspace...
                </div>
            </div>
        );
    }

    return (
        <main className="flex min-h-screen">
            <Sidebar />

            <section className="flex-1 p-6">
                <Topbar />
                <div className="mt-6">{children}</div>
            </section>
        </main>
    );
}