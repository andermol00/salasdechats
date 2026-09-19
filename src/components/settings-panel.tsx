"use client";

import { FONT_SIZES } from "@/lib/constants";
import type { Identity, Settings } from "@/lib/types";

type Props = {
  open: boolean;
  settings: Settings;
  identity: Identity;
  onClose: () => void;
  onSettings: (settings: Settings) => void;
  onIdentity: (patch: Partial<Identity>) => void;
  onRequestNotifications: () => void;
};

export function SettingsPanel({
  open,
  settings,
  identity,
  onClose,
  onSettings,
  onIdentity,
  onRequestNotifications,
}: Props) {
  if (!open) return null;

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <aside className="drawer" onClick={(event) => event.stopPropagation()}>
        <header className="drawer-head">
          <h2>Ajustes</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Cerrar">
            ✕
          </button>
        </header>

        <section className="drawer-section">
          <h3>Tu apodo</h3>
          <label className="field">
            <span>Nombre en la sala</span>
            <input
              value={identity.username}
              maxLength={20}
              onChange={(event) => onIdentity({ username: event.target.value })}
            />
          </label>
        </section>

        <section className="drawer-section">
          <h3>Notificaciones</h3>
          <label className="toggle">
            <input
              type="checkbox"
              checked={settings.sound}
              onChange={(event) =>
                onSettings({ ...settings, sound: event.target.checked })
              }
            />
            <span>Sonido al llegar un mensaje</span>
          </label>
          <label className="toggle">
            <input
              type="checkbox"
              checked={settings.desktop}
              onChange={(event) => {
                onSettings({ ...settings, desktop: event.target.checked });
                if (event.target.checked) onRequestNotifications();
              }}
            />
            <span>Avisos del sistema en otra pestaña</span>
          </label>
          <button type="button" className="ghost-btn full" onClick={onRequestNotifications}>
            Permitir avisos del navegador
          </button>
        </section>

        <section className="drawer-section">
          <h3>Lectura</h3>
          <div className="chip-row">
            {FONT_SIZES.map((size) => (
              <button
                key={size.id}
                type="button"
                className={settings.fontSize === size.id ? "mini-chip active" : "mini-chip"}
                onClick={() => onSettings({ ...settings, fontSize: size.id })}
              >
                {size.label}
              </button>
            ))}
          </div>
          <label className="toggle">
            <input
              type="checkbox"
              checked={settings.timestamps}
              onChange={(event) =>
                onSettings({ ...settings, timestamps: event.target.checked })
              }
            />
            <span>Mostrar hora en los mensajes</span>
          </label>
          <label className="toggle">
            <input
              type="checkbox"
              checked={settings.enterToSend}
              onChange={(event) =>
                onSettings({ ...settings, enterToSend: event.target.checked })
              }
            />
            <span>Enter envía · Shift+Enter salto de línea</span>
          </label>
        </section>

        <p className="drawer-note">
          Todo es temporal. La sala, los mensajes y los archivos se borran al terminar la duración elegida.
        </p>
      </aside>
    </div>
  );
}
