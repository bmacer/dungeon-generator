'use client';

import { useEffect, useState } from 'react';
import DungeonDisplay from "@/components/DungeonDisplay";

export default function Home() {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Don't render anything until after mounting to avoid localStorage errors
    if (!mounted) {
        return null;
    }

    return (
        <main className="flex min-h-screen flex-col items-center justify-center p-24">
            <h1 className="text-4xl font-bold mb-8">Dungeon Generator</h1>
            <DungeonDisplay />
        </main>
    );
}
