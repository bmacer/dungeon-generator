interface FastestPathStepsProps {
    steps: number | null;
    totalRooms?: number;
}

export default function FastestPathSteps({ steps, totalRooms = 0 }: FastestPathStepsProps) {
    if (steps === null) return null;
    if (steps === -1) return (
        <div style={{ top: '280px' }} className="fixed left-4 z-50 bg-red-200 p-4 rounded-lg shadow-lg border border-gray-200">
            <h4 className="font-bold text-sm mb-2">Fastest Path</h4>
            <p className="text-sm">No path found</p>
        </div>
    );

    // Calculate shortcut percentage
    const shortcutPercentage = totalRooms > 0 ? steps / totalRooms : 0;

    // Determine background color based on percentage
    let bgColor = 'bg-green-200'; // default to light green
    if (shortcutPercentage < 0.25) {
        bgColor = 'bg-red-200';
    } else if (shortcutPercentage < 0.6) {
        bgColor = 'bg-yellow-200';
    }

    return (
        <div style={{ top: '280px' }} className={`fixed left-4 z-50 ${bgColor} p-4 rounded-lg shadow-lg border border-gray-200`}>
            <h4 className="font-bold text-sm mb-2">Fastest Path</h4>
            <p className="text-sm">Steps: {steps}</p>
            <p className="text-sm">Percentage: {(shortcutPercentage * 100).toFixed(1)}%</p>
        </div>
    );
}
