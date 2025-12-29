import { useEffect, useState, type FC } from "react";

interface Paper {
    id: number;
    x: number;
    y: number;
    rotation: number;
    rotationSpeed: number;
    fallSpeed: number;
    swayAmount: number;
    swaySpeed: number;
    size: number;
    opacity: number;
}

interface FloatingPapersProps {
    count?: number;
}

export const FloatingPapers: FC<FloatingPapersProps> = ({ count = 8 }) => {
    const [papers, setPapers] = useState<Paper[]>([]);

    useEffect(() => {
        const initialPapers: Paper[] = Array.from({ length: count }, (_, i) => ({
            id: i,
            x: Math.random() * 90 + 5,
            y: -20 - (i * 15),
            rotation: Math.random() * 45 - 22.5,
            rotationSpeed: (Math.random() - 0.5) * 1.5,
            fallSpeed: 0.15 + Math.random() * 0.1,
            swayAmount: 15 + Math.random() * 20,
            swaySpeed: 0.3 + Math.random() * 0.4,
            size: 25 + Math.random() * 15,
            opacity: 0.4 + Math.random() * 0.25,
        }));
        setPapers(initialPapers);

        let animationId: number;
        let lastTime = Date.now();

        const animate = () => {
            const now = Date.now();
            const delta = (now - lastTime) / 16;
            lastTime = now;

            setPapers((prev) =>
                prev.map((paper) => {
                    let newY = paper.y + paper.fallSpeed * delta;
                    const elapsedSway = now * 0.001 * paper.swaySpeed;
                    const sway = Math.sin(elapsedSway) * paper.swayAmount * 0.02;
                    let newX = paper.x + sway;
                    const newRotation = paper.rotation + paper.rotationSpeed * 0.3 * delta;

                    // Reset paper to top when it falls off bottom
                    if (newY > 105) {
                        newY = -15 - Math.random() * 10;
                        newX = Math.random() * 90 + 5;
                    }

                    newX = Math.max(0, Math.min(100, newX));

                    return {
                        ...paper,
                        y: newY,
                        x: newX,
                        rotation: newRotation,
                    };
                })
            );

            animationId = requestAnimationFrame(animate);
        };

        animate();

        return () => {
            cancelAnimationFrame(animationId);
        };
    }, [count]);

    return (
        <div
            style={{
                position: "fixed",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                pointerEvents: "none",
                zIndex: 0,
                overflow: "hidden",
            }}
        >
            {papers.map((paper) => (
                <div
                    key={paper.id}
                    style={{
                        position: "absolute",
                        left: `${paper.x}%`,
                        top: `${paper.y}%`,
                        width: `${paper.size}px`,
                        height: `${paper.size * 1.3}px`,
                        background: "var(--color-secondary)",
                        border: "1px solid var(--color-primary)",
                        opacity: paper.opacity,
                        transform: `rotate(${paper.rotation}deg)`,
                        boxShadow: "1px 1px 3px rgba(0,0,0,0.2)",
                        transition: "none",
                    }}
                >
                    {/* Paper lines to make it look like a document */}
                    <div
                        style={{
                            position: "absolute",
                            top: "20%",
                            left: "15%",
                            width: "70%",
                            height: "2px",
                            background: "var(--color-primary)",
                            opacity: 0.3,
                        }}
                    />
                    <div
                        style={{
                            position: "absolute",
                            top: "40%",
                            left: "15%",
                            width: "50%",
                            height: "2px",
                            background: "var(--color-primary)",
                            opacity: 0.3,
                        }}
                    />
                    <div
                        style={{
                            position: "absolute",
                            top: "60%",
                            left: "15%",
                            width: "60%",
                            height: "2px",
                            background: "var(--color-primary)",
                            opacity: 0.3,
                        }}
                    />
                </div>
            ))}
        </div>
    );
};
