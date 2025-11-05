// app/layout.tsx (server component)
import type { ReactNode } from 'react';
import SessionBootstrap from './_client/SessionBootstrap'; // <-- importa el cliente

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body>
        {/* arranca/garantiza una sesión al cargar */}
        <SessionBootstrap />
        {children}
      </body>
    </html>
  );
}
