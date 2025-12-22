import { useEffect, useState, type FC } from "react";
import { useCanvasStore } from "../../store/canvasStore";
import { CanvasCard } from "./CanvasCard";
import { CreateCanvasModal } from "./CreateCanvasModal";
import { JoinCanvasModal } from "./JoinCanvasModal";
import { RetroButton } from "../common/RetroButton";

interface DashboardProps {
  onOpenCanvas: (id: string) => void;
}

export const Dashboard: FC<DashboardProps> = ({ onOpenCanvas }) => {
  const { ownedCanvases, collaboratingCanvases, fetchCanvases, loading } =
    useCanvasStore();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);

  useEffect(() => {
    fetchCanvases();
  }, [fetchCanvases]);

  return (
    <div style={{ width: "100%", maxWidth: "1200px", margin: "0 auto" }}>
      <div
        className="flex justify-between items-center"
        style={{ marginBottom: "2rem" }}
      >
        <div /> {/* Spacer */}
        <div className="flex gap-md dashboard-actions">
          <RetroButton
            onClick={() => setIsJoinModalOpen(true)}
            variant="secondary"
          >
            JOIN ARCHIVE
          </RetroButton>
          <RetroButton
            onClick={() => setIsCreateModalOpen(true)}
            variant="primary"
          >
            + NEW ARCHIVE
          </RetroButton>
        </div>
      </div>

      <section style={{ marginBottom: "3rem" }}>
        <h2
          style={{
            borderBottom: "1px solid var(--color-primary)",
            paddingBottom: "0.5rem",
            marginBottom: "1.5rem",
            fontSize: "1.5rem",
          }}
        >
          YOUR ARCHIVES
        </h2>

        {loading && ownedCanvases.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "2rem",
              color: "var(--color-neutral)",
            }}
          >
            SCANNING SECTOR...
          </div>
        ) : ownedCanvases.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "3rem",
              border: "1px dashed var(--color-neutral)",
              color: "var(--color-neutral)",
              borderRadius: "10px",
            }}
          >
            NO ARCHIVES FOUND. INITIALIZE A NEW ONE TO BEGIN.
          </div>
        ) : (
          <div
            className="canvas-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: "1.5rem",
            }}
          >
            {ownedCanvases.map((canvas) => (
              <CanvasCard
                key={canvas.id}
                canvas={canvas}
                onOpen={onOpenCanvas}
              />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2
          style={{
            borderBottom: "1px solid var(--color-primary)",
            paddingBottom: "0.5rem",
            marginBottom: "1.5rem",
            fontSize: "1.5rem",
            opacity: 0.8,
          }}
        >
          SHARED NETWORKS
        </h2>

        {collaboratingCanvases.length > 0 ? (
          <div
            className="canvas-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: "1.5rem",
            }}
          >
            {collaboratingCanvases.map((canvas) => (
              <CanvasCard
                key={canvas.id}
                canvas={canvas}
                onOpen={onOpenCanvas}
              />
            ))}
          </div>
        ) : (
          <div style={{ color: "var(--color-neutral)", fontStyle: "italic" }}>
            NO SHARED NETWORKS DETECTED.
          </div>
        )}
      </section>

      {isCreateModalOpen && (
        <CreateCanvasModal onClose={() => setIsCreateModalOpen(false)} />
      )}

      {isJoinModalOpen && (
        <JoinCanvasModal onClose={() => setIsJoinModalOpen(false)} />
      )}
    </div>
  );
};
