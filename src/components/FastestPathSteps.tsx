interface FastestPathStepsProps {
    steps: number | null;
}

export default function FastestPathSteps({ steps }: FastestPathStepsProps) {
    if (steps === null) return null;

    return (
        <div style={{ top: '280px' }} className="fixed left-4 z-50 bg-white p-4 rounded-lg shadow-lg border border-gray-200">
            <h4 className="font-bold text-sm mb-2">Fastest Path Steps</h4>
            <p className="text-sm">{steps === -1 ? "No path found" : steps}</p>
        </div>
    );
}
